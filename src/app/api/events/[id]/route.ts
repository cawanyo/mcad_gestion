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

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        organizerPole: true,
        requirements: { include: { pole: true } },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            },
            pole: true
          }
        },
        interests: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true }
            },
            pole: true
          }
        },
        eventChecklists: {
          include: {
            checklist: {
              include: {
                pole: true,
                steps: { orderBy: { orderIndex: 'asc' } }
              }
            }
          }
        },
        serviceValidations: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true }
            },
            pole: true
          }
        }
      }
    });

    if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const {
      title,
      description,
      startsAt,
      endsAt,
      location,
      status,
      coverImage,
      organizerPoleId,
      requirements,
      checklistIds,
      associateChecklistId,
      dissociateChecklistId
    } = body;

    // Direct single association / dissociation
    if (associateChecklistId) {
      await prisma.eventChecklist.upsert({
        where: {
          eventId_checklistId: {
            eventId: params.id,
            checklistId: associateChecklistId
          }
        },
        create: {
          eventId: params.id,
          checklistId: associateChecklistId
        },
        update: {}
      });
    }

    if (dissociateChecklistId) {
      await prisma.eventChecklist.deleteMany({
        where: {
          eventId: params.id,
          checklistId: dissociateChecklistId
        }
      });
    }

    // If whole checklistIds array is passed, replace all
    if (checklistIds && Array.isArray(checklistIds)) {
      await prisma.eventChecklist.deleteMany({ where: { eventId: params.id } });
      await prisma.eventChecklist.createMany({
        data: checklistIds.map((cid: string) => ({
          eventId: params.id,
          checklistId: cid
        }))
      });
    }

    // If requirements are passed, replace them
    if (requirements && Array.isArray(requirements)) {
      await prisma.eventRequirement.deleteMany({ where: { eventId: params.id } });
      await prisma.eventRequirement.createMany({
        data: requirements.map((r: any) => ({
          eventId: params.id,
          poleId: r.poleId,
          requiredCount: Number(r.requiredCount) || 1,
          notes: r.notes || null
        }))
      });
    }

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(startsAt && { startsAt: new Date(startsAt) }),
        ...(endsAt && { endsAt: new Date(endsAt) }),
        ...(location && { location: location.trim() }),
        ...(status && { status }),
        ...(coverImage !== undefined && { coverImage }),
        ...(organizerPoleId !== undefined && { organizerPoleId: organizerPoleId || null })
      },
      include: {
        organizerPole: true,
        requirements: { include: { pole: true } },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            },
            pole: true
          }
        },
        eventChecklists: {
          include: {
            checklist: {
              include: {
                pole: true,
                steps: { orderBy: { orderIndex: 'asc' } }
              }
            }
          }
        }
      }
    });

    broadcastUpdate('EVENT_UPDATED', { eventId: params.id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    await prisma.assignment.deleteMany({ where: { eventId: params.id } });
    await prisma.eventRequirement.deleteMany({ where: { eventId: params.id } });
    await prisma.eventChecklist.deleteMany({ where: { eventId: params.id } });
    await prisma.checklistExecution.deleteMany({ where: { eventId: params.id } });
    await prisma.serviceValidation.deleteMany({ where: { eventId: params.id } });
    await prisma.event.delete({ where: { id: params.id } });

    broadcastUpdate('EVENT_DELETED', { eventId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
