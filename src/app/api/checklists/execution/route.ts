import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checklistId = searchParams.get('checklistId');
    const poleId = searchParams.get('poleId');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (checklistId) where.checklistId = checklistId;
    if (poleId) where.poleId = poleId;
    if (userId) where.userId = userId;

    const executions = await prisma.checklistExecution.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
        },
        checklist: {
          select: { id: true, title: true, poleId: true }
        },
        stepsCompleted: {
          include: { step: true }
        },
        event: {
          select: { id: true, title: true, startsAt: true }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    return NextResponse.json(executions);
  } catch (error) {
    console.error('Error fetching checklist executions:', error);
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      checklistId,
      userId,
      poleId,
      eventId,
      completedStepIds,
      comment,
      status = 'COMPLETED'
    } = body;

    if (!checklistId || !userId) {
      return NextResponse.json({ error: 'checklistId et userId requis' }, { status: 400 });
    }

    // Determine poleId if not provided
    let finalPoleId = poleId;
    if (!finalPoleId) {
      const chk = await prisma.checklist.findUnique({ where: { id: checklistId } });
      finalPoleId = chk?.poleId || null;
    }

    // Create execution record
    const execution = await prisma.checklistExecution.create({
      data: {
        checklistId,
        userId,
        poleId: finalPoleId,
        eventId: eventId || null,
        status,
        comment: comment?.trim() || null,
        completedAt: new Date(),
        stepsCompleted: completedStepIds?.length ? {
          create: completedStepIds.map((stepId: string) => ({
            stepId,
            completed: true,
            completedAt: new Date()
          }))
        } : undefined
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
        },
        checklist: {
          include: { steps: { orderBy: { orderIndex: 'asc' } } }
        },
        stepsCompleted: {
          include: { step: true }
        }
      }
    });

    broadcastUpdate('CHECKLIST_EXECUTED', {
      executionId: execution.id,
      checklistId,
      userId,
      poleId: finalPoleId
    });

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error saving checklist execution:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de la checklist' }, { status: 500 });
  }
}
