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

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

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
  login: (token, user, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    // Never leave a copy in the other store, so the chosen lifetime is honoured.
    clearBoth(TOKEN_KEY);
    clearBoth(USER_KEY);
    try {
      if (token) store.setItem(TOKEN_KEY, token);
      if (user) store.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* private mode: stay in memory for this page load */ }
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
  },

  // The Authorization header for authenticated requests (empty when logged out).
  authHeader: () => {
    const token = read(TOKEN_KEY);
    return token ? { Authorization: `Token ${token}` } : {};
  },
};
