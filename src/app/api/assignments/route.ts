import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const poleId = searchParams.get('poleId');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (eventId) where.eventId = eventId;
    if (poleId) where.poleId = poleId;
    if (userId) where.userId = userId;

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        user: true,
        pole: true,
        event: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, poleId, userId, roleTag, assignedById, force } = body;

    // 1. Get Event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        requirements: true,
        assignments: { include: { user: true, pole: true } }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    // 1b. Check Rule: Member must belong to the pole (unless super admin / department leader)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { poleMemberships: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const isPrivileged =
      targetUser.role === 'SUPER_ADMIN' ||
      targetUser.role === 'DEPARTMENT_LEADER';

    const belongsToPole = targetUser.poleMemberships.some((pm) => pm.poleId === poleId);

    if (!isPrivileged && !belongsToPole) {
      return NextResponse.json({
        error: "Vous ne pouvez vous positionner que dans un pôle auquel vous appartenez."
      }, { status: 403 });
    }

    // 2. Check Rule: Double assignment on same event
    const existingOnEvent = await prisma.assignment.findFirst({
      where: { eventId, userId },
      include: { pole: true }
    });

    if (existingOnEvent) {
      return NextResponse.json({
        error: `Ce membre est déjà affecté à cet événement sur le pôle "${existingOnEvent.pole.name}". Une double affectation est interdite.`,
        conflictType: 'DOUBLE_ASSIGNMENT_SAME_EVENT'
      }, { status: 409 });
    }

    // 3. Check Rule: Unavailability overlap
    const unavailabilities = await prisma.unavailability.findMany({
      where: {
        userId,
        startsAt: { lte: event.endsAt },
        endsAt: { gte: event.startsAt }
      }
    });

    if (unavailabilities.length > 0 && !force) {
      const u = unavailabilities[0];
      return NextResponse.json({
        error: `Le membre a déclaré une indisponibilité sur ce créneau (${u.reason || 'Non spécifié'}).`,
        conflictType: 'UNAVAILABILITY',
        unavailability: u
      }, { status: 409 });
    }

    // 4. Check Rule: Overlapping another event assignment
    const overlappingAssignments = await prisma.assignment.findMany({
      where: {
        userId,
        event: {
          id: { not: eventId },
          startsAt: { lte: event.endsAt },
          endsAt: { gte: event.startsAt },
          status: { not: 'CANCELLED' }
        }
      },
      include: { event: true, pole: true }
    });

    if (overlappingAssignments.length > 0 && !force) {
      const overlap = overlappingAssignments[0];
      return NextResponse.json({
        error: `Le membre est déjà affecté à "${overlap.event.title}" sur le même créneau horaire.`,
        conflictType: 'EVENT_OVERLAP',
        overlappingEvent: overlap.event
      }, { status: 409 });
    }

    // 5. Create Assignment
    const assignment = await prisma.assignment.create({
      data: {
        eventId,
        poleId,
        userId,
        roleTag: roleTag || 'Membre affecté',
        assignedById,
        status: 'CONFIRMED'
      },
      include: {
        user: true,
        pole: true,
        event: true
      }
    });

    // Create ServiceValidation placeholder
    await prisma.serviceValidation.upsert({
      where: {
        eventId_userId_poleId: {
          eventId,
          userId,
          poleId
        }
      },
      create: {
        eventId,
        userId,
        poleId,
        status: 'PENDING'
      },
      update: {}
    });

    // Send in-app notification to member
    await prisma.notification.create({
      data: {
        userId,
        title: "Nouvelle affectation de service",
        message: `Vous avez été affecté(e) au service "${event.title}" pour le pôle ${assignment.pole.name}.`,
        type: "ASSIGNMENT",
        linkUrl: `/events/${eventId}`
      }
    });

    // 🚀 Broadcast real-time update
    broadcastUpdate('ASSIGNMENT_CREATED', {
      assignmentId: assignment.id,
      userId,
      eventId,
      poleId
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Assignment POST error:', error);
    return NextResponse.json({ error: "Erreur lors de l'affectation" }, { status: 500 });
  }
}
