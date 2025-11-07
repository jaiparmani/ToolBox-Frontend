// Simple authentication utilities using localStorage
export const authUtils = {
  // Check if user is logged in
  isAuthenticated: () => {
    return !!localStorage.getItem('userid') && !!localStorage.getItem('username');
  },

  // Get current user info
  getUser: () => {
    const userid = localStorage.getItem('userid');
    const username = localStorage.getItem('username');
    return userid && username ? { userid, username } : null;
  },

  // Login user
  login: (userid, username) => {
    localStorage.setItem('userid', userid.toString());
    localStorage.setItem('username', username);
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('userid');
    localStorage.removeItem('username');
  },

  // Get userid for API calls
  getUserId: () => {
    return localStorage.getItem('userid');
  }
};

// API interceptor to add userid to all requests
export const apiInterceptor = {
  // Add userid to URL query parameters
  addUserIdToUrl: (url) => {
    const userid = authUtils.getUserId();
    if (userid && !url.includes('userid=')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}userid=${userid}`;
    }
    return url;
  },

  // Add userid to request body for POST/PUT/PATCH requests
  addUserIdToBody: (body, method) => {
    const methodRequiresUserId = ['POST', 'PUT', 'PATCH'].includes(method?.toUpperCase());
    const userid = authUtils.getUserId();

    if (methodRequiresUserId && userid && body && typeof body === 'object') {
      // Only add userid if it's not already present in the body
      if (!('userid' in body)) {
        body.userid = userid;
      }
    }

    return body;
  }
};