import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  getUserProfile,
  registerUser as apiRegisterUser,
  logout as apiLogout,
  changePassword as apiChangePassword,
  clearAllData,
  getSessionId,
  setSessionId,
  clearSession,
  handleApiError,
  transformUserForUI
} from '../components/rest/userApis.js';

// Auth Context State
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,
  sessionId: null
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
        isInitialized: true,
        sessionId: action.payload.sessionId
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionId: action.payload.sessionId
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
        error: null,
        sessionId: action.payload.sessionId
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
      const sessionId = getSessionId();

      if (sessionId) {
        try {
          const userProfile = await getUserProfile();
          dispatch({
            type: AUTH_ACTIONS.INITIALIZE,
            payload: {
              isAuthenticated: true,
              user: userProfile,
              sessionId: sessionId
            }
          });
        } catch (error) {
          console.log('Session invalid, clearing...');
          clearSession();
          dispatch({
            type: AUTH_ACTIONS.INITIALIZE,
            payload: {
              isAuthenticated: false,
              user: null,
              sessionId: null
            }
          });
        }
      } else {
        dispatch({
          type: AUTH_ACTIONS.INITIALIZE,
          payload: {
            isAuthenticated: false,
            user: null,
            sessionId: null
          }
        });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      // For session-based authentication, we'll use a direct fetch to get the session cookie
      // Login endpoint is CSRF exempt since users need to login before getting CSRF tokens
      // use api base url below
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

    const baseUrl = isLocalhost
        ? 'http://localhost:8000'
        : 'https://jaiparmani.pythonanywhere.com';

    // Environment indicator for debugging
    console.log(`🔗 API Environment: ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} | Base URL: ${baseUrl}`);

    return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(API_BASE_URL +'/api/users/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); 
      setSessionId(data.sessionId);
      // If login successful, get the session ID from cookies/localStorage
      // and fetch user profile
      while(!getSessionId()){
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const currentSessionId = getSessionId();
      // wait for 2 seconds to ensure session cookie is set
      console.log('Current Session ID after login:', currentSessionId);
       const getAllCookies = (domain) => {
                const cookies = document.cookie.split(';');
                const cookieNames = cookies.map(cookie => {
                    const eqPos = cookie.indexOf('=');
                    return eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                });
                return cookieNames;
            }
        console.log('All Cookies after login:', getAllCookies(window.location.hostname));
      if (currentSessionId) {
        const userProfile = await getUserProfile();

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: userProfile,
            sessionId: currentSessionId
          }
        });

        return { success: true, user: userProfile };
      } else {
        throw new Error('Failed to establish session');
      }
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
      const registeredUser = await apiRegisterUser(userData);

      // After successful registration, automatically log in the user
      const currentSessionId = getSessionId();
      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: {
          user: registeredUser,
          sessionId: currentSessionId
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
    sessionId: state.sessionId,

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