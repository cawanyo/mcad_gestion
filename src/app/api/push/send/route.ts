import { NextRequest, NextResponse } from 'next/server';
import { webpush } from '@/lib/webpush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, title, message, url, icon, badge } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Aucune souscription fournie pour l\'envoi du push' },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      title: title || 'MCAD — Notification',
      body: message || 'Ceci est une notification de test web-push.',
      url: url || '/dashboard',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/badge-72x72.png',
      timestamp: Date.now(),
    });

    const result = await webpush.sendNotification(subscription, payload);

    return NextResponse.json({
      success: true,
      statusCode: result.statusCode,
      message: 'Notification envoyée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur Web Push:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Échec de l\'envoi de la notification push',
        statusCode: error.statusCode || 500,
      },
      { status: 500 }
    );
  }
}
