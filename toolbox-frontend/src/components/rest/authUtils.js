// Token-based authentication utilities (localStorage-backed).
//
// The API authenticates every request with a DRF auth token sent as
// `Authorization: Token <token>`. There is no more ?userid= trust — the server
// derives the user from the token alone.

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const authUtils = {
  // Logged in iff we hold a token.
  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),

  getToken: () => localStorage.getItem(TOKEN_KEY),

  // The cached user object from login/profile, or null.
  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Store the token (and optionally the user) after a successful login/register.
  login: (token, user) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  setUser: (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Clear the old pre-token keys too, so a stale session can't linger.
    localStorage.removeItem('userid');
    localStorage.removeItem('username');
  },

  // The Authorization header for authenticated requests (empty when logged out).
  authHeader: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Token ${token}` } : {};
  },
};
