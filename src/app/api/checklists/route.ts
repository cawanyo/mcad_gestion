import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireLeaderOrAdmin } from '@/lib/auth-server';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const poleId = searchParams.get('poleId');
    const eventId = searchParams.get('eventId');

    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (poleId) where.poleId = poleId;
    if (eventId) {
      where.eventChecklists = {
        some: { eventId }
      };
    }

    const checklists = await prisma.checklist.findMany({
      where,
      include: {
        pole: true,
        steps: { orderBy: { orderIndex: 'asc' } },
        eventChecklists: { include: { event: true } },
        _count: { select: { steps: true, executions: true } }
      },
      orderBy: { orderIndex: 'asc' }
    });

    return NextResponse.json(checklists);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { poleId, title, description, steps } = body;

    if (!poleId || !title) {
      return NextResponse.json({ error: 'Pôle et titre requis' }, { status: 400 });
    }

    const checklist = await prisma.checklist.create({
      data: {
        poleId,
        title: title.trim(),
        description: description?.trim() || null,
        status: 'ACTIVE',
        steps: steps?.length ? {
          create: steps.map((s: { title: string; description?: string; details?: string; mediaType?: string; mediaUrl?: string; mediaThumbnail?: string }, idx: number) => ({
            orderIndex: idx + 1,
            title: s.title.trim(),
            description: s.description?.trim() || null,
            details: s.details?.trim() || null,
            mediaType: s.mediaType || 'NONE',
            mediaUrl: s.mediaUrl || null,
            mediaThumbnail: s.mediaThumbnail || null,
            isRequired: true
          }))
        } : undefined
      },
      include: {
        pole: true,
        steps: { orderBy: { orderIndex: 'asc' } }
      }
    });

    broadcastUpdate('CHECKLIST_CREATED', { checklistId: checklist.id, poleId: checklist.poleId });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 });
  }
}
