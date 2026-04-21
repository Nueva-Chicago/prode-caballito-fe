// PRODE Caballito — Service Worker
const CACHE = 'prode-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { return; }

  const { title = 'PRODE Caballito', body = '', url = '/', icon = '/favicon.svg' } = data;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/favicon.svg',
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

// Click on notification → open or focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(self.location.origin + url);
      } else {
        clients.openWindow(self.location.origin + url);
      }
    })
  );
});
