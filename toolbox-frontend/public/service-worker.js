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

// ---------------------------------------------------------------------------
// IndexedDB helper — reads the auth token mirrored here by authUtils.login().
// DB: "money_os"  |  store: "auth"  |  key: "auth_token"
// ---------------------------------------------------------------------------
function getAuthToken() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('money_os', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth');
        }
      };
      req.onsuccess = (e) => {
        try {
          const db = e.target.result;
          const tx = db.transaction('auth', 'readonly');
          const get = tx.objectStore('auth').get('auth_token');
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------------------
// Push: show notification with an inline-reply action so users can log an
// expense directly from the banner without opening the app.
// ---------------------------------------------------------------------------
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
        // Inline-reply action: Android Chrome shows a text field; iOS shows a
        // plain button (graceful degradation — type:'text' is ignored there).
        actions: [
          {
            action: 'reply',
            type: 'text',
            title: 'Log expense',
            placeholder: '40 chai…',
          },
        ],
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'toolbox:notify-refresh' }));
      }),
    ])
  );
});

// ---------------------------------------------------------------------------
// Notification click / reply
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // --- Inline reply: log the expense without opening the app ---
  if (event.action === 'reply') {
    const text = (event.reply || '').trim();
    if (!text) return;

    event.waitUntil(
      getAuthToken().then((token) => {
        if (!token) {
          return self.registration.showNotification('Money OS', {
            body: 'Couldn\'t log — open the app to sign in first.',
            icon: '/logo192.png',
            tag: 'log-error',
            silent: true,
          });
        }

        return fetch('https://jaiparmani.pythonanywhere.com/api/expenses/expenses/quick_add/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + token,
          },
          body: JSON.stringify({ text }),
        })
          .then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then((data) => {
            const description = data.description || text;
            const amount = data.amount != null ? '₹' + data.amount : '';
            return self.registration.showNotification('Logged ✓', {
              body: description + (amount ? ' — ' + amount : ''),
              icon: '/favicon.svg',
              tag: 'log-confirm',
              silent: true,
            });
          })
          .catch(() => {
            return self.registration.showNotification('Money OS', {
              body: 'Couldn\'t log — open the app and try again.',
              icon: '/logo192.png',
              tag: 'log-error',
              silent: true,
            });
          });
      })
    );
    return;
  }

  // --- Default: focus an already-open tab or open one at the card's route ---
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
