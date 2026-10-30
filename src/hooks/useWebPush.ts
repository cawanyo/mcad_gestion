'use client';

import React from 'react';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/pushClient';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export function useWebPush() {
  const [isSupported, setIsSupported] = React.useState<boolean>(false);
  const [permission, setPermission] = React.useState<PushPermissionStatus>('default');
  const [subscription, setSubscription] = React.useState<PushSubscription | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PushPermissionStatus);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      setStatusMessage('Les notifications push ne sont pas supportées par ce navigateur.');
      return false;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // 1. Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionStatus);

      if (result !== 'granted') {
        setStatusMessage('Autorisation refusée par l\'utilisateur.');
        setLoading(false);
        return false;
      }

      // 2. Wait for Service Worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to push manager
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }

      setSubscription(sub);

      // 4. Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      setStatusMessage('Notifications activées avec succès.');
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erreur souscription web-push:', err);
      setStatusMessage(err.message || 'Échec de l\'activation des notifications.');
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return true;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setStatusMessage('Notifications désactivées.');
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erreur désinscription web-push:', err);
      setStatusMessage('Erreur lors de la désactivation.');
      setLoading(false);
      return false;
    }
  };

  const sendTestNotification = async (title?: string, message?: string): Promise<boolean> => {
    if (!subscription) {
      setStatusMessage('Veuillez activer les notifications avant de tester.');
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: title || 'MCAD — Notification reçue',
          message: message || 'Le service web-push fonctionne parfaitement sur votre appareil.',
          url: '/dashboard',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage('Notification envoyée avec succès.');
        setLoading(false);
        return true;
      } else {
        setStatusMessage(data.error || 'Erreur lors de l\'envoi.');
        setLoading(false);
        return false;
      }
    } catch (err: any) {
      console.error('Erreur envoi notification test:', err);
      setStatusMessage('Impossible de contacter le serveur de notifications.');
      setLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed: !!subscription,
    subscription,
    loading,
    statusMessage,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
