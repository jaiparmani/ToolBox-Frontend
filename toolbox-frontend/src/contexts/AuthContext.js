import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  getUserProfile,
  registerUser as apiRegisterUser,
  logout as apiLogout,
  changePassword as apiChangePassword,
  clearAllData,
  clearSession,
  handleApiError,
  transformUserForUI
} from '../components/rest/userApis.js';
import { authUtils } from '../components/rest/authUtils.js';

// Auth Context State
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null
};

// Auth Actions
const AUTH_ACTIONS = {
  INITIALIZE: 'INITIALIZE',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  REFRESH_PROFILE: 'REFRESH_PROFILE'
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.INITIALIZE:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        user: action.payload.user,
        isLoading: false,
        isInitialized: true
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
        isInitialized: true
      };

    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: action.payload.user,
        error: null
      };

    case AUTH_ACTIONS.REFRESH_PROFILE:
      return {
        ...state,
        user: action.payload.user,
        error: null
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      // No token → don't hit the API (which would 401 and bounce public pages).
      if (!authUtils.isAuthenticated()) {
        dispatch({ type: AUTH_ACTIONS.INITIALIZE, payload: { isAuthenticated: false, user: null } });
        return;
      }
      try {
        const userProfile = await getUserProfile();
        dispatch({
          type: AUTH_ACTIONS.INITIALIZE,
          payload: { isAuthenticated: true, user: userProfile }
        });
      } catch (error) {
        // Only a *rejected token* means log out. A server or network error
        // (e.g. the profile endpoint 500s) must NOT nuke a valid session —
        // otherwise a transient backend hiccup silently signs the device out.
        // In that case keep the token and fall back to the cached user, so the
        // rest of the app stays usable.
        const isAuthError = error?.type === 'auth_error' || error?.status === 401
          || /session expired|log ?in again/i.test(error?.message || '');
        if (isAuthError) {
          authUtils.logout();
          dispatch({ type: AUTH_ACTIONS.INITIALIZE, payload: { isAuthenticated: false, user: null } });
        } else {
          const cached = authUtils.getUser();
          dispatch({
            type: AUTH_ACTIONS.INITIALIZE,
            payload: { isAuthenticated: true, user: cached ? transformUserForUI(cached) : null },
          });
        }
      }
    };

    initializeAuth();
  }, []);

  // Login function — identifier (email/username) + password → auth token.
  // `remember` decides whether the token persists across restarts.
  const login = async (identifier, password, remember = true) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');
      const API_BASE_URL = isLocalhost ? 'http://localhost:8000' : 'https://toolbox.pythonanywhere.com';

      const response = await fetch(API_BASE_URL + '/api/users/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // { detail, token, user } — store the token, then the app is authenticated.
      const data = await response.json();
      authUtils.login(data.token, data.user, remember);
      const userProfile = transformUserForUI(data.user);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: userProfile },
      });

      return { success: true, user: userProfile };
    } catch (error) {
      const handledError = handleApiError(error, 'login');
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: handledError }
      });
      return { success: false, error: handledError };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      // apiRegisterUser stores the returned auth token itself, so the new
      // account is logged in as soon as this resolves.
      const registeredUser = await apiRegisterUser(userData);

      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: {
          user: registeredUser
        }
      });

      return { success: true, user: registeredUser };
    } catch (error) {
      const handledError = handleApiError(error, 'register');
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: { error: handledError }
      });
      return { success: false, error: handledError };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Logout function
  const logout = async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

    try {
      // Use the comprehensive clearAllData function that clears cookies, storage, and server session
      await clearAllData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: true };
    } catch (error) {
      // Even if clearing fails, still logout locally
      clearSession();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      return { success: false, error: handleApiError(error, 'logout') };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Refresh user profile function
  const refreshUserProfile = async () => {
    if (!state.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const updatedProfile = await getUserProfile();
      dispatch({
        type: AUTH_ACTIONS.REFRESH_PROFILE,
        payload: { user: updatedProfile }
      });
      return { success: true, user: updatedProfile };
    } catch (error) {
      const handledError = handleApiError(error, 'refresh profile');
      return { success: false, error: handledError };
    }
  };

  // Change password function
  const changePassword = async (oldPassword, newPassword, newPasswordConfirm) => {
    if (!state.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }

    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const result = await apiChangePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      });

      // Refresh user profile after password change
      await refreshUserProfile();

      return { success: true, message: result.detail || 'Password changed successfully' };
    } catch (error) {
      const handledError = handleApiError(error, 'change password');
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: handledError
      });
      return { success: false, error: handledError };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    if (!state.isAuthenticated) {
      return { success: false, error: 'User not authenticated' };
    }

    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      // Use the existing updateUserProfile function from userApis
      const { updateUserProfile } = await import('../components/rest/userApis.js');
      const updatedUser = await updateUserProfile(profileData);

      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE,
        payload: { user: updatedUser }
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      const handledError = handleApiError(error, 'update profile');
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: handledError
      });
      return { success: false, error: handledError };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const contextValue = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    error: state.error,

    // Actions
    login,
    register,
    logout,
    refreshUserProfile,
    changePassword,
    updateProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;