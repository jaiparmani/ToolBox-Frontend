// Web Push — this is what makes a notification arrive with no tab open. The
// browser vendor's push service wakes this worker even when the app isn't
// running; everything else (the bell, its 25s poll) only works while a tab
// is alive. Deliberately minimal: no offline caching, no asset precaching —
// just the two events push needs.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Money OS', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  // Show the OS notification AND poke any open tabs to refresh the in-app feed.
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: { url: data.url || '/' },
        tag: data.url || undefined,
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'toolbox:notify-refresh' }));
      }),
    ])
  );
});

// Focus an already-open tab on this origin if one exists; otherwise open one
// at the card's own route (e.g. /splits, /recurring) rather than always the
// dashboard, so the notification actually lands where it's about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
