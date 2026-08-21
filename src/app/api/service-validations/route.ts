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
    const status = searchParams.get('status'); // ALL, VALIDATED, PENDING
    const search = searchParams.get('search');

    const where: any = {};
    if (eventId && eventId !== 'all') where.eventId = eventId;
    if (poleId && poleId !== 'all') where.poleId = poleId;
    if (userId && userId !== 'all') where.userId = userId;
    if (status && status !== 'all' && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { comment: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { event: { title: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const validations = await prisma.serviceValidation.findMany({
      where,
      include: {
        user: {
          include: {
            poleMemberships: {
              include: { pole: true }
            }
          }
        },
        pole: true,
        event: true,
        checklistExecution: {
          include: {
            stepsCompleted: true,
            checklist: { include: { steps: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const baseWhere: any = {};
    if (userId && userId !== 'all') baseWhere.userId = userId;
    if (eventId && eventId !== 'all') baseWhere.eventId = eventId;
    if (poleId && poleId !== 'all') baseWhere.poleId = poleId;

    const allCount = await prisma.serviceValidation.count({ where: baseWhere });
    const validatedCount = await prisma.serviceValidation.count({
      where: { ...baseWhere, status: 'VALIDATED' }
    });
    const pendingCount = await prisma.serviceValidation.count({
      where: { ...baseWhere, status: 'PENDING' }
    });

    return NextResponse.json({
      validations,
      counts: {
        all: allCount,
        validated: validatedCount,
        pending: pendingCount,
        unassigned: 0
      }
    });
  } catch (error) {
    console.error('Error fetching service validations:', error);
    return NextResponse.json({ error: 'Failed to fetch validations' }, { status: 500 });
  }
}

// Member submits service validation with mandatory comment and rating
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, poleId, userId, comment, rating, checklistExecutionId } = body;

    if (!eventId || !poleId || !userId) {
      return NextResponse.json(
        { error: 'Culte, pôle et membre sont obligatoires pour la validation.' },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le commentaire / retour d\'expérience est obligatoire pour valider votre service.' },
        { status: 400 }
      );
    }

    const validation = await prisma.serviceValidation.upsert({
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
        checklistExecutionId: checklistExecutionId || null,
        comment: comment.trim(),
        rating: Number(rating) || 5,
        status: 'VALIDATED',
        validatedAt: new Date()
      },
      update: {
        comment: comment.trim(),
        rating: Number(rating) || 5,
        status: 'VALIDATED',
        validatedAt: new Date(),
        checklistExecutionId: checklistExecutionId || undefined
      },
      include: {
        user: true,
        pole: true,
        event: true
      }
    });

    // Mark execution completed if linked
    if (checklistExecutionId) {
      await prisma.checklistExecution.update({
        where: { id: checklistExecutionId },
        data: { status: 'VALIDATED', completedAt: new Date() }
      }).catch((e) => console.error('Execution update non-critical:', e));
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SERVICE_VALIDATED',
        targetType: 'EVENT',
        targetId: eventId,
        details: JSON.stringify({ comment, rating: rating || 5, validatedAt: new Date() })
      }
    });

    // Notify Pole Leaders
    const poleLeaders = await prisma.poleLeader.findMany({
      where: { poleId },
      include: { user: true }
    });

    for (const pl of poleLeaders) {
      if (pl.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: pl.userId,
            title: `Service validé : ${validation.user.firstName} ${validation.user.lastName}`,
            message: `${validation.user.firstName} a validé son service pour "${validation.event.title}" (${validation.pole.name}) avec une note de ${rating || 5}/5.`,
            type: 'SERVICE_VALIDATION',
            linkUrl: '/validations'
          }
        }).catch((e) => console.error(e));
      }
    }

    broadcastUpdate('SERVICE_VALIDATED', { userId, eventId, poleId });

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Service validation error:', error);
    return NextResponse.json({ error: 'Failed to validate service' }, { status: 500 });
  }
}

// Responsible sends reminder / relance or validates on behalf
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { validationId, userId, action, comment, rating } = body;

    if (!validationId) {
      return NextResponse.json({ error: 'Validation ID is required' }, { status: 400 });
    }

    const val = await prisma.serviceValidation.findUnique({
      where: { id: validationId },
      include: { user: true, event: true, pole: true }
    });

    if (!val) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
    }

    if (action === 'VALIDATE') {
      // Validate on behalf of member
      const updated = await prisma.serviceValidation.update({
        where: { id: validationId },
        data: {
          status: 'VALIDATED',
          validatedAt: new Date(),
          comment: comment || 'Validé par le responsable',
          rating: Number(rating) || 5
        },
        include: { user: true, event: true, pole: true }
      });

      broadcastUpdate('SERVICE_VALIDATED', {
        userId: updated.userId,
        eventId: updated.eventId,
        poleId: updated.poleId
      });

      return NextResponse.json({ success: true, validation: updated });
    }

    // Default: SEND REMINDER
    await prisma.serviceValidation.update({
      where: { id: validationId },
      data: {
        reminderSentAt: new Date(),
        reminderCount: { increment: 1 }
      }
    });

    await prisma.notification.create({
      data: {
        userId: val.userId,
        title: '🔔 Rappel : Validation de votre service',
        message: `N'oubliez pas de valider votre service pour le culte "${val.event.title}" (${val.pole.name}). Remplissez votre retour d'expérience !`,
        type: 'SERVICE_REMINDER',
        linkUrl: '/validations'
      }
    });

    broadcastUpdate('SERVICE_REMINDER_SENT', { targetUserId: val.userId });

    return NextResponse.json({ success: true, message: 'Rappel envoyé avec succès' });
  } catch (error) {
    console.error('Error in service validation PATCH:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
