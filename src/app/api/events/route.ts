import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requireLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const poleId = searchParams.get('poleId');
    const month = searchParams.get('month'); // e.g. 2024-05
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (poleId) {
      where.OR = [
        { organizerPoleId: poleId },
        { requirements: { some: { poleId } } },
        { assignments: { some: { poleId } } },
        { eventChecklists: { some: { checklist: { poleId } } } }
      ];
    }
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const startOfMonth = new Date(year, m - 1, 1);
      const endOfMonth = new Date(year, m, 0, 23, 59, 59);
      where.startsAt = { gte: startOfMonth, lte: endOfMonth };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizerPole: true,
        requirements: {
          include: { pole: true }
        },
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
      },
      orderBy: { startsAt: 'asc' }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
      organizerPoleId,
      coverImage,
      requirements, // array of { poleId, requiredCount, notes }
      checklistIds, // array of checklist IDs to link
      recurrenceRule = 'NONE', // NONE, WEEKLY, BIWEEKLY, MONTHLY
      recurrenceCount = 1 // number of occurrences
    } = body;

    if (!title || !startsAt || !endsAt || !location) {
      return NextResponse.json({ error: 'Titre, date début, date fin et lieu requis' }, { status: 400 });
    }

    const dept = await prisma.department.findFirst();
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const count = Math.max(1, Math.min(52, Number(recurrenceCount) || 1));
    const baseStart = new Date(startsAt);
    const baseEnd = new Date(endsAt);

    if (isNaN(baseStart.getTime()) || isNaN(baseEnd.getTime())) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }

    const durationMs = baseEnd.getTime() - baseStart.getTime();
    const recurrenceGroupId = count > 1 ? `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : null;

    const createdEvents = [];

    for (let i = 0; i < count; i++) {
      let occStart = new Date(baseStart);

      if (recurrenceRule === 'WEEKLY') {
        occStart.setDate(baseStart.getDate() + i * 7);
      } else if (recurrenceRule === 'BIWEEKLY') {
        occStart.setDate(baseStart.getDate() + i * 14);
      } else if (recurrenceRule === 'MONTHLY') {
        occStart = new Date(baseStart.getFullYear(), baseStart.getMonth() + i, baseStart.getDate(), baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds());
      }

      const occEnd = new Date(occStart.getTime() + durationMs);

      const event = await prisma.event.create({
        data: {
          departmentId: dept.id,
          title: title.trim(),
          description: description?.trim() || null,
          startsAt: occStart,
          endsAt: occEnd,
          location: location.trim(),
          organizerPoleId: organizerPoleId || null,
          coverImage,
          status: 'PUBLISHED',
          recurrenceRule: recurrenceRule !== 'NONE' ? recurrenceRule : null,
          recurrenceGroupId,
          requirements: requirements?.length ? {
            create: requirements.map((r: { poleId: string; requiredCount: number; notes?: string }) => ({
              poleId: r.poleId,
              requiredCount: Number(r.requiredCount) || 1,
              notes: r.notes || null
            }))
          } : undefined,
          eventChecklists: checklistIds?.length ? {
            create: checklistIds.map((cid: string) => ({
              checklistId: cid
            }))
          } : undefined
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
                include: { pole: true, steps: true }
              }
            }
          }
        }
      });

      createdEvents.push(event);
    }

    broadcastUpdate('EVENT_CREATED', {
      count: createdEvents.length,
      recurrenceGroupId
    });

    return NextResponse.json(createdEvents.length === 1 ? createdEvents[0] : createdEvents);
  } catch (error) {
    console.error('Create Event Error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
