// CSRF Token Utility Functions for Django Integration

/**
 * Get CSRF token from cookies
 * Django sets the CSRF token in a cookie named 'csrftoken'
 * @returns {string|null} CSRF token value or null if not found
 */
            import Cookies from "js-cookie";

export const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;

    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();

            // Check if this cookie starts with the name we want    
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
};

/**
 * Get CSRF token from cookies or fetch it from Django if not available
 * This function will make a GET request to get a CSRF token if one isn't present
 * @param {string} baseUrl - Base URL for the Django server
 * @returns {Promise<string>} CSRF token value
 */
export const ensureCsrfToken = async (baseUrl = '') => {
    let token = getCsrfToken();

    if (!token) {
        try {
            // Make a request to get a CSRF token from our custom endpoint
            const response = await fetch(`${baseUrl}/api/users/csrf/`, {
                method: 'GET',
                credentials: 'include', // Important for cookie handling
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                token = data.csrfToken || getCsrfToken();
            } else {
                // Fallback: try to get token from cookies after any request
                // Django sets CSRF token in cookies after requests
                console.log('CSRF endpoint not available, relying on cookie-based tokens');
                token = getCsrfToken();
            }
        } catch (error) {
            console.warn('Failed to fetch CSRF token:', error);
            // Fallback to cookie-based token
            token = getCsrfToken();
        }
    }

    if (!token) {
        console.warn('CSRF token not available. Requests requiring CSRF protection may fail.');
    }

    return token;
};

/**
 * Create headers object with CSRF token for POST/PUT/PATCH/DELETE requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Promise<Object>} Headers object with CSRF token
 */
export const getCsrfHeaders = async (additionalHeaders = {}) => {
    const token = await ensureCsrfToken();

    const headers = {
        'Content-Type': 'application/json',
        ...additionalHeaders,
    };

    if (token) {
        headers['X-CSRFToken'] = token;
    }

    return headers;
};

/**
 * Enhanced fetch function that automatically includes CSRF tokens for mutating requests
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const csrfFetch = async (url, options = {}) => {
    const method = options.method || 'GET';

    // Only add CSRF token for state-changing requests
    const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

    if (requiresCsrf) {
        const csrfHeaders = await getCsrfHeaders(options.headers);
        options.headers = csrfHeaders;
    }

    // Ensure credentials are included for session cookie handling
    options.credentials = 'include';

    return fetch(url, options);
};

/**
 * Check if a request requires CSRF protection
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @returns {boolean} True if CSRF protection is needed
 */
export const requiresCsrfProtection = (method, url) => {
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return unsafeMethods.includes(method.toUpperCase());
};

/**
 * Get CSRF token for forms (useful for traditional form submissions)
 * @returns {Object} Object containing token and hidden input HTML
 */
export const getCsrfTokenForForms = () => {
    const token = getCsrfToken();

    if (!token) {
        console.warn('CSRF token not available for form submission');
        return { token: null, input: '' };
    }

    const input = `<input type="hidden" name="csrfmiddlewaretoken" value="${token}" />`;

    return { token, input };
};

/**
 * Clear all authentication-related cookies and storage
 * This function clears Django session cookies, CSRF tokens, and localStorage
 * @param {string} domain - Optional domain for cookie clearing (defaults to current domain)
 */
export const clearAllCookies = (domain = window.location.hostname) => {
    console.log('🧹 Clearing all authentication cookies and storage...');

    // Clear localStorage
    try {
        localStorage.removeItem('sessionid');
        console.log('✓ Cleared localStorage sessionid');
    } catch (error) {
        console.warn('Failed to clear localStorage:', error);
    }

    // Django cookies to clear
    const djangoCookies = [
        'sessionid',
        'csrftoken',
        'django.contrib.sessions.cached_db'
    ];

    // Additional common auth cookies
    const authCookies = [
        ...djangoCookies,
        '_auth_user_id',
        '_auth_user_backend',
        '_auth_user_hash'
    ];

    // Clear cookies for current domain and path
    authCookies.forEach(cookieName => {
        try {
            // Clear cookie for root path
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

            // Clear cookie for current path
            const currentPath = window.location.pathname;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${currentPath}; domain=${domain};`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${currentPath};`;

            console.log(`✓ Cleared cookie: ${cookieName}`);
        } catch (error) {
            console.warn(`Failed to clear cookie ${cookieName}:`, error);
        }
    });

    // Clear all cookies using a more aggressive approach
    try {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

            // Clear any cookie that looks like it might be auth-related
            if (name.includes('session') || name.includes('csrf') || name.includes('auth') || name.includes('django')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
                console.log(`✓ Cleared additional auth cookie: ${name}`);
            }
        });
    } catch (error) {
        console.warn('Failed to clear additional cookies:', error);
    }

    console.log('✓ Cookie clearing completed');
};

/**
 * Clear all authentication data (cookies, storage, and session)
 * This is a comprehensive cleanup function that should be called on logout
 * @param {string} domain - Optional domain for cookie clearing
 * @returns {Promise<boolean>} Success status
 */
export const    clearAllAuthData = async (domain = window.location.hostname) => {
    try {
        // Clear cookies and storage

        // Try to make a request to clear server-side session if possible
        try {
            const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:8000/api/users'
                : 'https://jaiparmani.pythonanywhere.com/api/users';

            // Make a request to logout endpoint to clear server session
            // add csrf token to headers
            await fetch(`${apiBaseUrl}/logout/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
            });
            console.log('✓ Server session cleared');
            // delete all cookies


        clearAllCookies(domain);


        } catch (error) {
            console.warn('Failed to clear server session (this is normal if already logged out):', error);
        }

        return true;
    } catch (error) {
        console.error('Error during auth data cleanup:', error);
        return false;
    }
};