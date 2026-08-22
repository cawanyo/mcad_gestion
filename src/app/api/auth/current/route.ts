import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('auth_session')?.value || req.headers.get('x-user-id');

    if (!sessionUserId) {
      return NextResponse.json({ user: null, allUsers: [] });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      include: {
        poleLeaderships: { include: { pole: true } },
        poleMemberships: { include: { pole: true } },
        membershipRequests: {
          where: { status: 'PENDING' },
          include: { pole: true }
        }
      }
    });

    if (!user || user.status === 'INACTIVE') {
      return NextResponse.json({ user: null, allUsers: [] });
    }

    const { searchParams } = new URL(req.url);
    const includeAllUsers = searchParams.get('includeAllUsers') === 'true';

    let allUsers: any[] = [];
    if (includeAllUsers) {
      allUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, avatar: true, phone: true, gender: true }
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        avatar: user.avatar,
        birthDate: user.birthDate,
        poleLeaderships: user.poleLeaderships,
        poleMemberships: user.poleMemberships,
        membershipRequests: user.membershipRequests
      },
      allUsers
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch user', user: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Security check: Disable direct arbitrary user impersonation in production
    if (process.env.NODE_ENV === 'production') {
      const currentUser = await getAuthenticatedUser();
      if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Action non autorisée en environnement de production.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { userId } = body;

    if (userId) {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
      }

      const cookieStore = cookies();
      cookieStore.set('auth_session', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      return NextResponse.json({ success: true, userId });
    }

    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
