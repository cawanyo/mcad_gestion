// MCAD Service Worker (PWA & Web Push Notifications)
const CACHE_NAME = 'mcad-cache-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first for navigations with offline fallback, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass API routes and WebSocket connections
  if (url.pathname.startsWith('/api') || url.pathname.includes('/_convex') || request.method !== 'GET') {
    return;
  }

  // Navigation requests: try network, then fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Static files: Stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});

// ==========================================
// Web Push Notifications
// ==========================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'MCAD',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    url: '/dashboard'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const baseOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    data: {
      url: payload.url || (payload.data && payload.data.url) || '/dashboard',
      dateOfArrival: Date.now()
    },
    tag: payload.tag || ('mcad-push-' + Date.now()),
    renotify: true
  };

  event.waitUntil(
    self.registration
      .showNotification(payload.title, {
        ...baseOptions,
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open', title: 'Ouvrir' },
          { action: 'close', title: 'Fermer' }
        ]
      })
      .catch(() => {
        // Fallback for browsers that reject actions/vibrate
        return self.registration.showNotification(payload.title, baseOptions);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  let rawUrl = event.notification.data?.url || '/dashboard';

  // Sécurité : corriger les anciennes URLs d'événements vers la route /calendar
  if (rawUrl.startsWith('/events/')) {
    const eventId = rawUrl.replace('/events/', '');
    rawUrl = `/calendar?eventId=${eventId}`;
  } else if (rawUrl === '/events') {
    rawUrl = '/calendar';
  } else if (rawUrl === '/validations') {
    rawUrl = '/service';
  }

  const urlToOpen = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la réactiver et naviguer
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre vers l'URL absolue
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
