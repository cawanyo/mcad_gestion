import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('auth_session')?.value;

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId') || sessionUserId;

    if (!userIdParam) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: userIdParam },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: userIdParam, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications', notifications: [], unreadCount: 0 }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('auth_session')?.value;
    const body = await req.json();
    const { id, markAllRead } = body;
    const userId = body.userId || sessionUserId;

    if (markAllRead && userId) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
