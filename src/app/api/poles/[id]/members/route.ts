import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requirePoleLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePoleLeaderOrAdmin(params.id);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Remove membership
    await prisma.poleMembership.deleteMany({
      where: { poleId: params.id, userId }
    });

    // Remove leadership if was leader
    await prisma.poleLeader.deleteMany({
      where: { poleId: params.id, userId }
    });

    broadcastUpdate('POLE_MEMBER_REMOVED', { poleId: params.id, userId });

    return NextResponse.json({ success: true, message: 'Membre retiré du pôle' });
  } catch (error) {
    console.error('Error removing member from pole:', error);
    return NextResponse.json({ error: 'Erreur lors du retrait du membre' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePoleLeaderOrAdmin(params.id);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { userId, action, roleTitle } = body; // action: 'TOGGLE_LEADER' | 'ADD_MEMBER'

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    if (action === 'TOGGLE_LEADER') {
      const existingLeader = await prisma.poleLeader.findFirst({
        where: { poleId: params.id, userId }
      });

      if (existingLeader) {
        await prisma.poleLeader.delete({
          where: { id: existingLeader.id }
        });
      } else {
        await prisma.poleLeader.create({
          data: {
            poleId: params.id,
            userId,
            roleTitle: roleTitle || 'Responsable de pôle'
          }
        });
      }

      broadcastUpdate('POLE_LEADERS_UPDATED', { poleId: params.id });
      return NextResponse.json({ success: true });
    }

    if (action === 'ADD_MEMBER') {
      await prisma.poleMembership.upsert({
        where: {
          userId_poleId: {
            userId,
            poleId: params.id
          }
        },
        create: {
          userId,
          poleId: params.id,
          status: 'ACTIVE'
        },
        update: {
          status: 'ACTIVE'
        }
      });

      broadcastUpdate('POLE_MEMBER_ADDED', { poleId: params.id, userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (error) {
    console.error('Error managing pole member:', error);
    return NextResponse.json({ error: 'Erreur lors de la gestion du membre' }, { status: 500 });
  }
}
