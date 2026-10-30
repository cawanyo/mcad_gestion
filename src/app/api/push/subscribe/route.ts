import { NextRequest, NextResponse } from 'next/server';

// In-memory cache of subscriptions for instant local delivery
const subscriptionsStore = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 });
    }

    const key = subscription.endpoint;
    subscriptionsStore.set(key, {
      subscription,
      userId: userId || null,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, registered: key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    count: subscriptionsStore.size,
    subscriptions: Array.from(subscriptionsStore.values()),
  });
}
