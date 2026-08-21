import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const { id } = params;

    const existing = await prisma.unavailability.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Indisponibilité introuvable.' }, { status: 404 });
    }

    const isLeader =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'DEPARTMENT_LEADER' ||
      currentUser.role === 'POLE_LEADER' ||
      currentUser.role === 'CALENDAR_MANAGER';

    if (existing.userId !== currentUser.id && !isLeader) {
      return NextResponse.json(
        { error: 'Action non autorisée sur cette indisponibilité.' },
        { status: 403 }
      );
    }

    await prisma.unavailability.delete({
      where: { id }
    });

    broadcastUpdate('UNAVAILABILITY_DELETED', {
      id,
      userId: existing.userId
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting unavailability:', error);
    return NextResponse.json({ error: 'Failed to delete unavailability' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const { id } = params;
    const body = await req.json();
    const { startsAt, endsAt, reason, recurrence } = body;

    const existing = await prisma.unavailability.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Indisponibilité introuvable.' }, { status: 404 });
    }

    const isLeader =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'DEPARTMENT_LEADER' ||
      currentUser.role === 'POLE_LEADER' ||
      currentUser.role === 'CALENDAR_MANAGER';

    if (existing.userId !== currentUser.id && !isLeader) {
      return NextResponse.json(
        { error: 'Action non autorisée sur cette indisponibilité.' },
        { status: 403 }
      );
    }

    const data: any = {};
    if (startsAt) data.startsAt = new Date(startsAt);
    if (endsAt) data.endsAt = new Date(endsAt);
    if (reason !== undefined) data.reason = reason?.trim() || null;
    if (recurrence !== undefined) data.recurrence = recurrence;

    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
      return NextResponse.json(
        { error: 'La date de fin ne peut pas être antérieure à la date de début.' },
        { status: 400 }
      );
    }

    const updated = await prisma.unavailability.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            role: true,
            poleMemberships: {
              include: {
                pole: true
              }
            }
          }
        }
      }
    });

    broadcastUpdate('UNAVAILABILITY_UPDATED', {
      id: updated.id,
      userId: updated.userId
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating unavailability:', error);
    return NextResponse.json({ error: 'Failed to update unavailability' }, { status: 500 });
  }
}
