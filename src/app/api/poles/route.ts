import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requireDepartmentLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawPoles = await prisma.pole.findMany({
      include: {
        leaders: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            }
          }
        },
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            }
          }
        },
        _count: {
          select: { memberships: true, checklists: true, eventRequirements: true }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    const poles = rawPoles.map((p) => ({
      ...p,
      membersCount: p.memberships?.length ?? p._count?.memberships ?? 0,
      leadersCount: p.leaders?.length ?? 0,
      checklistsCount: p._count?.checklists ?? 0
    }));

    return NextResponse.json(poles, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error fetching poles:', error);
    return NextResponse.json({ error: 'Failed to fetch poles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireDepartmentLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { name, description, color, icon, departmentId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nom du pôle obligatoire' }, { status: 400 });
    }

    const dept = departmentId
      ? { connect: { id: departmentId } }
      : { connect: { id: (await prisma.department.findFirst())?.id } };

    const pole = await prisma.pole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b68f0',
        icon: icon || 'Users',
        department: dept
      }
    });

    broadcastUpdate('POLE_CREATED', { poleId: pole.id });

    return NextResponse.json(pole);
  } catch (error) {
    console.error('Error creating pole:', error);
    return NextResponse.json({ error: 'Failed to create pole' }, { status: 500 });
  }
}
