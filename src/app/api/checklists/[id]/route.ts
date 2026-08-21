import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requireLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const checklist = await prisma.checklist.findUnique({
      where: { id: params.id },
      include: {
        pole: true,
        steps: { orderBy: { orderIndex: 'asc' } },
        eventChecklists: { include: { event: true } }
      }
    });

    if (!checklist) return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    return NextResponse.json(checklist);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { title, description, status, steps, associateEventId, dissociateEventId } = body;

    if (associateEventId) {
      await prisma.eventChecklist.upsert({
        where: {
          eventId_checklistId: {
            eventId: associateEventId,
            checklistId: params.id
          }
        },
        create: {
          eventId: associateEventId,
          checklistId: params.id
        },
        update: {}
      });
    }

    if (dissociateEventId) {
      await prisma.eventChecklist.deleteMany({
        where: {
          eventId: dissociateEventId,
          checklistId: params.id
        }
      });
    }

    // If steps are provided to replace
    if (steps && Array.isArray(steps)) {
      await prisma.checklistStep.deleteMany({
        where: { checklistId: params.id }
      });

      await prisma.checklistStep.createMany({
        data: steps.map((s: any, idx: number) => ({
          checklistId: params.id,
          orderIndex: idx + 1,
          title: s.title.trim(),
          description: s.description?.trim() || null,
          details: s.details?.trim() || null,
          mediaType: s.mediaType || 'NONE',
          mediaUrl: s.mediaUrl || null,
          mediaThumbnail: s.mediaThumbnail || null,
          isRequired: true
        }))
      });
    }

    const updated = await prisma.checklist.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status })
      },
      include: {
        pole: true,
        steps: { orderBy: { orderIndex: 'asc' } },
        eventChecklists: { include: { event: true } }
      }
    });

    broadcastUpdate('CHECKLIST_UPDATED', { checklistId: params.id, poleId: updated.poleId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const checklist = await prisma.checklist.findUnique({ where: { id: params.id } });
    if (!checklist) {
      return NextResponse.json({ error: 'Checklist introuvable' }, { status: 404 });
    }

    await prisma.eventChecklist.deleteMany({ where: { checklistId: params.id } });
    await prisma.checklistStep.deleteMany({ where: { checklistId: params.id } });
    await prisma.checklistExecution.deleteMany({ where: { checklistId: params.id } });
    await prisma.checklist.delete({ where: { id: params.id } });

    broadcastUpdate('CHECKLIST_DELETED', { checklistId: params.id, poleId: checklist.poleId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 });
  }
}
