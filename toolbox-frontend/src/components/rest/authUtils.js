// Token-based authentication utilities.
//
// The API authenticates every request with a DRF auth token sent as
// `Authorization: Token <token>`. There is no more ?userid= trust — the server
// derives the user from the token alone.
//
// "Remember this device" chooses where the token lives: localStorage keeps the
// device signed in across restarts (DRF tokens don't expire), sessionStorage
// keeps it only until the tab/browser closes. Reads consult both, so a token in
// either place counts as signed in.
//
// We also mirror the token into IndexedDB (DB: "money_os", store: "auth", key:
// "auth_token") so the service worker can read it without access to localStorage
// — used for the tap-from-notification inline reply feature.

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

// --- IndexedDB mirror for the service worker ---

function _openMoneyOsDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('money_os', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function saveTokenToIDB(token) {
  if (!token || typeof indexedDB === 'undefined') return;
  _openMoneyOsDb().then((db) => {
    const tx = db.transaction('auth', 'readwrite');
    tx.objectStore('auth').put(token, 'auth_token');
  }).catch(() => { /* IDB unavailable — graceful no-op */ });
}

function clearTokenFromIDB() {
  if (typeof indexedDB === 'undefined') return;
  _openMoneyOsDb().then((db) => {
    const tx = db.transaction('auth', 'readwrite');
    tx.objectStore('auth').delete('auth_token');
  }).catch(() => { /* IDB unavailable — graceful no-op */ });
}

const read = (key) => {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); }
  catch { return null; }
};
const clearBoth = (key) => {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
};

export const authUtils = {
  // Logged in iff we hold a token in either store.
  isAuthenticated: () => !!read(TOKEN_KEY),

  getToken: () => read(TOKEN_KEY),

  // The cached user object from login/profile, or null.
  getUser: () => {
    try {
      const raw = read(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Store the token (and optionally the user) after a successful login/register.
  // `remember` (default true) → persist across restarts; false → this session only.
  // Also mirrors the token to IndexedDB so the service worker can read it for
  // tap-from-notification inline replies.
  login: (token, user, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    // Never leave a copy in the other store, so the chosen lifetime is honoured.
    clearBoth(TOKEN_KEY);
    clearBoth(USER_KEY);
    try {
      if (token) store.setItem(TOKEN_KEY, token);
      if (user) store.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* private mode: stay in memory for this page load */ }
    // Mirror to IDB for the service worker (fire-and-forget).
    if (token) saveTokenToIDB(token);
  },

  // Update the cached user in whichever store currently holds the token.
  setUser: (user) => {
    if (!user) return;
    const store = (() => { try { return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage; } catch { return sessionStorage; } })();
    try { store.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  },

  logout: () => {
    clearBoth(TOKEN_KEY);
    clearBoth(USER_KEY);
    // Clear the old pre-token keys too, so a stale session can't linger.
    clearBoth('userid');
    clearBoth('username');
    // Remove from IDB so the service worker can't log expenses after sign-out.
    clearTokenFromIDB();
  },

  // The Authorization header for authenticated requests (empty when logged out).
  authHeader: () => {
    const token = read(TOKEN_KEY);
    return token ? { Authorization: `Token ${token}` } : {};
  },
};
