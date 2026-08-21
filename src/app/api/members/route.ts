import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requireDepartmentLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const poleId = searchParams.get('poleId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (poleId && poleId !== 'all') {
      where.poleMemberships = {
        some: { poleId, status: 'ACTIVE' }
      };
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        avatar: true,
        birthDate: true,
        createdAt: true,
        poleMemberships: { include: { pole: true } },
        poleLeaderships: { include: { pole: true } },
        unavailabilities: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            reason: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// PATCH /api/members - Update member role or status (Department Leader / Admin only)
export async function PATCH(req: Request) {
  try {
    const auth = await requireDepartmentLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentAdmin = auth.user;

    const body = await req.json();
    const { userId, role, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const validRoles = [
      'MEMBER',
      'POLE_LEADER',
      'CALENDAR_MANAGER',
      'DEPARTMENT_LEADER',
      'SUPER_ADMIN'
    ];

    const updateData: any = {};
    if (role) {
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (status) {
      updateData.status = status;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        avatar: true,
        poleMemberships: { include: { pole: true } },
        poleLeaderships: { include: { pole: true } }
      }
    });

    const getRoleFrench = (r: string) => {
      switch (r) {
        case 'SUPER_ADMIN': return 'Administrateur';
        case 'DEPARTMENT_LEADER': return 'Responsable de Département';
        case 'POLE_LEADER': return 'Responsable de Pôle';
        case 'CALENDAR_MANAGER': return 'Gestionnaire Calendrier';
        default: return 'Membre de service';
      }
    };

    // Notification for user
    if (role) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Mise à jour de vos autorisations',
          message: `Votre rôle sur la plateforme a été mis à jour en : "${getRoleFrench(role)}".`,
          type: 'ROLE_UPDATE',
          linkUrl: '/dashboard'
        }
      }).catch((e) => console.error(e));
    }

    // Audit log with authenticated admin ID
    await prisma.auditLog.create({
      data: {
        actorId: currentAdmin.id,
        action: 'MEMBER_ROLE_UPDATED',
        targetType: 'USER',
        targetId: userId,
        details: JSON.stringify({ previousRole: updatedUser.role, newRole: role, status })
      }
    }).catch((e) => console.error(e));

    broadcastUpdate('USER_UPDATED', { userId, role, status });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Rôle mis à jour avec succès en ${getRoleFrench(role || updatedUser.role)}.`
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

// DELETE /api/members - Complete removal of member (Department Leader / Admin only)
export async function DELETE(req: Request) {
  try {
    const auth = await requireDepartmentLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentAdmin = auth.user;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID du membre requis' }, { status: 400 });
    }

    if (currentAdmin.id === userId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte depuis cette vue.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // Delete user from DB (Cascades automatically)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Create Audit Log with authenticated admin ID
    await prisma.auditLog.create({
      data: {
        actorId: currentAdmin.id,
        action: 'MEMBER_DELETED',
        targetType: 'USER',
        targetId: userId,
        details: JSON.stringify({
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          deletedAt: new Date()
        })
      }
    }).catch((e) => console.error(e));

    broadcastUpdate('USER_DELETED', { userId });

    return NextResponse.json({
      success: true,
      message: `Le membre ${user.firstName} ${user.lastName} a été définitivement supprimé de la plateforme.`
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ error: 'Échec de la suppression définitive du membre' }, { status: 500 });
  }
}
