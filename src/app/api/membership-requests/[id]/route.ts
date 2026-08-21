import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requirePoleLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const request = await prisma.membershipRequest.findUnique({
      where: { id: params.id },
      include: { user: true, pole: true }
    });

    if (!request) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    // Verify caller has permissions to review this pole's requests
    const auth = await requirePoleLeaderOrAdmin(request.poleId);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const reviewer = auth.user;

    const body = await req.json();
    const { status } = body; // status: 'APPROVED' | 'REJECTED'

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const updated = await prisma.membershipRequest.update({
      where: { id: params.id },
      data: {
        status,
        reviewedById: reviewer.id,
        reviewedAt: new Date()
      }
    });

    if (status === 'APPROVED') {
      // Add or update PoleMembership
      await prisma.poleMembership.upsert({
        where: {
          userId_poleId: {
            userId: request.userId,
            poleId: request.poleId
          }
        },
        create: {
          userId: request.userId,
          poleId: request.poleId,
          status: 'ACTIVE'
        },
        update: {
          status: 'ACTIVE'
        }
      });

      // Notification
      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Adhésion approuvée !",
          message: `Votre demande pour rejoindre le pôle ${request.pole.name} a été acceptée par ${reviewer.firstName} ${reviewer.lastName}.`,
          type: "MEMBERSHIP_APPROVED",
          linkUrl: `/poles`
        }
      }).catch((e) => console.error(e));
    } else if (status === 'REJECTED') {
      // Notification
      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Demande d'adhésion",
          message: `Votre demande pour rejoindre le pôle ${request.pole.name} n'a pas été retenue.`,
          type: "MEMBERSHIP_REJECTED",
          linkUrl: `/poles`
        }
      }).catch((e) => console.error(e));
    }

    // Broadcast real-time update
    broadcastUpdate('MEMBERSHIP_REQUEST_UPDATED', {
      requestId: params.id,
      status,
      userId: request.userId,
      poleId: request.poleId,
      reviewedById: reviewer.id
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating membership request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
