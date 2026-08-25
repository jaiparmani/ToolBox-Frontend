// User API Configuration - Dynamic base URL with environment detection
import { authUtils } from './authUtils.js';

const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

    const baseUrl = isLocalhost
        ? 'http://localhost:8000/api/users'
        : 'https://toolbox.pythonanywhere.com/api/users';

    // Environment indicator for debugging
    console.log(`🔗 User API Environment: ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} | Base URL: ${baseUrl}`);

    return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Clear the stored auth token (and any legacy session keys).
export const clearSession = () => {
    authUtils.logout();
    localStorage.removeItem('sessionid');
};

/**
 * Clear all authentication data including cookies, storage, and server session
 * This is a comprehensive cleanup function that should be called when user wants to clear all data
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<boolean>} Success status
 */
export const clearAllData = async (onSuccess, onError) => {
    try {
        // Best-effort server-side token invalidation, then wipe the local token.
        try {
            if (authUtils.isAuthenticated()) {
                await fetch(`${API_BASE_URL}/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authUtils.authHeader() },
                });
            }
        } catch (e) {
            // Network failure shouldn't block a local logout.
            console.warn('Server logout failed; clearing locally anyway.', e);
        }
        authUtils.logout();
        if (onSuccess) onSuccess(true);
        return true;
    } catch (error) {
        console.error('Error clearing all authentication data:', error);
        authUtils.logout();
        const handledError = handleApiError(error, 'clear all data');
        if (onError) onError(handledError);
        throw handledError;
    }
};


// Utility function for making authenticated (token) requests.
const authenticatedFetch = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...authUtils.authHeader(),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers, body: options.body });

    if (response.status === 401) {
        authUtils.logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
        throw new Error('Session expired or invalid. Please log in again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throwHttpError(errorData, response.status);
    }

    return response;
};

/**
 * DRF error bodies aren't always {"detail": "..."} - validation errors come back
 * field-keyed, e.g. {"username": ["A user with that username already exists."]}.
 * Pull a human-readable message out of whatever shape comes back.
 */
const extractErrorMessage = (errorData, status) => {
    if (errorData && typeof errorData === 'object') {
        if (errorData.detail) {
            return errorData.detail;
        }
        const fieldMessages = Object.entries(errorData)
            .filter(([, value]) => Array.isArray(value) || typeof value === 'string')
            .map(([field, value]) => {
                const text = Array.isArray(value) ? value.join(' ') : value;
                return field === 'non_field_errors' ? text : `${field}: ${text}`;
            });
        if (fieldMessages.length > 0) {
            return fieldMessages.join(' ');
        }
    }
    return `HTTP error! status: ${status}`;
};

/** Throw an Error carrying the real HTTP status so callers don't have to string-sniff the message for digits. */
const throwHttpError = (errorData, status) => {
    const error = new Error(extractErrorMessage(errorData, status));
    error.status = status;
    throw error;
};

// Utility function for making public requests (no authentication required)
const publicFetch = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Include credentials to get CSRF token from cookies
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throwHttpError(errorData, response.status);
    }

    return response;
};

// Error handling utility
export const handleApiError = (error, operation) => {
    console.error(`Error ${operation}:`, error);
    const status = error.status;

    if (status === 401 || error.message.includes('Session expired')) {
        return { type: 'auth_error', message: 'Please log in again.' };
    } else if (status === 400) {
        return { type: 'validation_error', message: error.message };
    } else if (status === 403) {
        return { type: 'permission_error', message: 'You do not have permission to perform this action.' };
    } else if (status === 404) {
        return { type: 'not_found', message: 'Resource not found.' };
    } else if (status === 409) {
        return { type: 'conflict_error', message: 'Username or email already exists.' };
    } else if (status === 429) {
        return { type: 'rate_limit', message: 'Too many requests. Please try again later.' };
    } else {
        return { type: 'network_error', message: error.message || `Failed to ${operation}. Please try again.` };
    }
};

// Data transformation utilities
export const transformUserForUI = (apiUser) => {
    return {
        id: apiUser.id,
        username: apiUser.username,
        email: apiUser.email,
        firstName: apiUser.first_name,
        lastName: apiUser.last_name,
        displayName: `${apiUser.first_name} ${apiUser.last_name}`.trim() || apiUser.username,
        dateJoined: new Date(apiUser.date_joined),
        isActive: apiUser.is_active !== false // Default to true if not specified
    };
};

// Type definitions for API responses
/**
 * @typedef {Object} UserProfile
 * @property {number} id - User ID
 * @property {string} username - Username
 * @property {string} email - Email address
 * @property {string} first_name - First name
 * @property {string} last_name - Last name
 * @property {string} date_joined - ISO date string
 */

/**
 * @typedef {Object} RegisterUserData
 * @property {string} username - Required username
 * @property {string} email - Required email
 * @property {string} first_name - Optional first name
 * @property {string} last_name - Optional last name
 * @property {string} password - Required password
 * @property {string} password_confirm - Required password confirmation
 */

/**
 * @typedef {Object} UpdateProfileData
 * @property {string} username - Optional username
 * @property {string} email - Optional email
 * @property {string} first_name - Optional first name
 * @property {string} last_name - Optional last name
 */

/**
 * @typedef {Object} ChangePasswordData
 * @property {string} old_password - Current password
 * @property {string} new_password - New password
 * @property {string} new_password_confirm - New password confirmation
 */

// User API Functions

/**
 * Register a new user account
 * @param {RegisterUserData} userData - User registration data
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<UserProfile>} Created user profile
 */
export const registerUser = async (userData, onSuccess, onError) => {
    try {
        console.log('Registering user:', {
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name
        });

        const response = await publicFetch(`${API_BASE_URL}/users/`, {
            method: 'POST',
            body: JSON.stringify({
                username: userData.username,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                password: userData.password,
                password_confirm: userData.password_confirm
            })
        });

        // Backend returns { token, user } — store the token so the new account
        // is logged straight in, and return the user for the UI.
        const data = await response.json();
        if (data.token) authUtils.login(data.token, data.user);
        const transformedData = transformUserForUI(data.user || data);

        if (onSuccess) onSuccess(transformedData);
        return transformedData;
    } catch (error) {
        const handledError = handleApiError(error, 'register user');
        if (onError) onError(handledError);
        throw handledError;
    }
};

/**
 * Get current user profile
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<UserProfile>} User profile data
 */
export const getUserProfile = async (onSuccess, onError) => {
    try {
        console.log("Fetching user profile with Django session authentication");
        const response = await authenticatedFetch(`${API_BASE_URL}/profile/`);
        const data = await response.json();
        const transformedData = transformUserForUI(data);

        if (onSuccess) onSuccess(transformedData);
        return transformedData;
    } catch (error) {
        const handledError = handleApiError(error, 'get user profile');
        if (onError) onError(handledError);
        throw handledError;
    }
};

/**
 * Update entire user profile
 * @param {UpdateProfileData} profileData - Updated profile data
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<UserProfile>} Updated user profile
 */
export const updateUserProfile = async (profileData, onSuccess, onError) => {
    try {
        console.log('Updating user profile:', profileData);

        const response = await authenticatedFetch(`${API_BASE_URL}/profile/`, {
            method: 'PUT',
            body: JSON.stringify({
                username: profileData.username,
                email: profileData.email,
                first_name: profileData.first_name,
                last_name: profileData.last_name
            })
        });

        const data = await response.json();
        const transformedData = transformUserForUI(data);

        if (onSuccess) onSuccess(transformedData);
        return transformedData;
    } catch (error) {
        const handledError = handleApiError(error, 'update user profile');
        if (onError) onError(handledError);
        throw handledError;
    }
};

/**
 * Partially update user profile
 * @param {UpdateProfileData} profileData - Partial profile data to update
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<UserProfile>} Updated user profile
 */
export const patchUserProfile = async (profileData, onSuccess, onError) => {
    try {
        console.log('Patching user profile:', profileData);

        const response = await authenticatedFetch(`${API_BASE_URL}/profile/`, {
            method: 'PATCH',
            body: JSON.stringify({
                username: profileData.username,
                email: profileData.email,
                first_name: profileData.first_name,
                last_name: profileData.last_name
            })
        });

        const data = await response.json();
        const transformedData = transformUserForUI(data);

        if (onSuccess) onSuccess(transformedData);
        return transformedData;
    } catch (error) {
        const handledError = handleApiError(error, 'patch user profile');
        if (onError) onError(handledError);
        throw handledError;
    }
};

/**
 * Change user password
 * @param {ChangePasswordData} passwordData - Password change data
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<Object>} Success message
 */
export const changePassword = async (passwordData, onSuccess, onError) => {
    try {
        console.log('Changing user password');

        const response = await authenticatedFetch(`${API_BASE_URL}/password-change/`, {
            method: 'POST',
            body: JSON.stringify({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
                new_password_confirm: passwordData.new_password_confirm
            })
        });

        const data = await response.json();

        // The server rotates the token on a password change; adopt the new one
        // so the current session keeps working.
        if (data.token) authUtils.login(data.token);

        if (onSuccess) onSuccess(data);
        return data;
    } catch (error) {
        const handledError = handleApiError(error, 'change password');
        if (onError) onError(handledError);
        throw handledError;
    }
};

/**
 * Logout user (clear session)
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @returns {Promise<boolean>} Logout success status
 */
export const logout = async (onSuccess, onError) => {
    try {
        // Call logout endpoint if available, or just clear local session
        try {
            await authenticatedFetch(`${API_BASE_URL}/logout/`, {
                method: 'POST'
            });
        } catch (error) {
            // If logout endpoint doesn't exist, just continue with local cleanup
            console.log('Logout endpoint not available, clearing local session only');
        }

        clearSession();

        if (onSuccess) onSuccess(true);
        return true;
    } catch (error) {
        // Even if server logout fails, clear local session
        clearSession();
        const handledError = handleApiError(error, 'logout');
        if (onError) onError(handledError);
        throw handledError;
    }
};
