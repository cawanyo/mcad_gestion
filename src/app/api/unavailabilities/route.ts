import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const poleId = searchParams.get('poleId');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope'); // 'active', 'upcoming', 'past', 'all'

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (poleId && poleId !== 'all') {
      where.user = {
        ...where.user,
        poleMemberships: {
          some: { poleId }
        }
      };
    }

    const now = new Date();

    if (scope === 'active') {
      where.startsAt = { lte: now };
      where.endsAt = { gte: now };
    } else if (scope === 'upcoming') {
      where.startsAt = { gte: now };
    } else if (scope === 'past') {
      where.endsAt = { lt: now };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { reason: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const unavailabilities = await prisma.unavailability.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            avatar: true,
            role: true,
            poleMemberships: {
              include: {
                pole: true
              }
            }
          }
        }
      },
      orderBy: { startsAt: 'asc' }
    });

    return NextResponse.json(unavailabilities);
  } catch (error) {
    console.error('Error fetching unavailabilities:', error);
    return NextResponse.json({ error: 'Failed to fetch unavailabilities' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const body = await req.json();
    const { userId, startsAt, endsAt, reason, recurrence } = body;

    const targetUserId = userId || currentUser.id;

    // A user can only declare unavailabilities for themselves unless they are a leader/admin
    const isLeader =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'DEPARTMENT_LEADER' ||
      currentUser.role === 'POLE_LEADER' ||
      currentUser.role === 'CALENDAR_MANAGER';

    if (targetUserId !== currentUser.id && !isLeader) {
      return NextResponse.json(
        { error: 'Action non autorisée pour un autre membre.' },
        { status: 403 }
      );
    }

    if (!startsAt || !endsAt) {
      return NextResponse.json(
        { error: 'Veuillez renseigner la date de début et la date de fin.' },
        { status: 400 }
      );
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Format de dates invalide.' }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'La date de fin ne peut pas être antérieure à la date de début.' },
        { status: 400 }
      );
    }

    const unavailability = await prisma.unavailability.create({
      data: {
        userId: targetUserId,
        startsAt: startDate,
        endsAt: endDate,
        reason: reason?.trim() || 'Indisponible',
        recurrence: recurrence || 'NONE'
      },
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

    // Check for conflicting assignments on upcoming events
    const conflictingAssignments = await prisma.assignment.findMany({
      where: {
        userId: targetUserId,
        event: {
          startsAt: { lte: endDate },
          endsAt: { gte: startDate }
        }
      },
      include: {
        event: true,
        pole: true
      }
    });

    broadcastUpdate('UNAVAILABILITY_CREATED', {
      userId: targetUserId,
      unavailabilityId: unavailability.id
    });

    return NextResponse.json({
      ...unavailability,
      hasConflicts: conflictingAssignments.length > 0,
      conflicts: conflictingAssignments
    });
  } catch (error) {
    console.error('Error creating unavailability:', error);
    return NextResponse.json({ error: 'Failed to create unavailability' }, { status: 500 });
  }
}
