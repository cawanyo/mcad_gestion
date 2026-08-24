import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const poleId = searchParams.get('poleId');

    const where: Record<string, any> = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (poleId && poleId !== 'ALL') {
      where.poleId = poleId;
    }

    const requests = await prisma.membershipRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            phone: true,
            avatar: true,
            role: true,
            poleMemberships: {
              where: { status: 'ACTIVE' },
              include: { pole: true }
            }
          }
        },
        pole: true,
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Failed to fetch membership requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, poleId, motivation } = body;

    // Check if there is already a pending request
    const existing = await prisma.membershipRequest.findFirst({
      where: { userId, poleId, status: 'PENDING' }
    });

    if (existing) {
      return NextResponse.json({ error: 'Une demande est déjà en cours pour ce pôle' }, { status: 400 });
    }

    const request = await prisma.membershipRequest.create({
      data: {
        userId,
        poleId,
        motivation: motivation?.trim() || 'Souhaite rejoindre l\'équipe.',
        status: 'PENDING'
      },
      include: { pole: true, user: true }
    });

    // 🚀 Broadcast real-time update
    broadcastUpdate('MEMBERSHIP_REQUEST_CREATED', {
      requestId: request.id,
      userId,
      poleId,
      poleName: request.pole?.name
    });

    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
