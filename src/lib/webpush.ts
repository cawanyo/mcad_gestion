import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './pushClient';

export { VAPID_PUBLIC_KEY, urlBase64ToUint8Array };

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'iuJbNueLL4RIBcqa-l67Vs06ivez6rn-Sz9bVT6QooM';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:notifications@mcad-eglise.org';

// Configure web-push details on the server side
try {
  if (typeof window === 'undefined' && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch {
  // Ignore during client evaluation
}

export { webpush };
