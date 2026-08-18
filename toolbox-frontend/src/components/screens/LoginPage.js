import React, { useState } from 'react';
import {
  Container, Paper, Typography, Box, Grid, TextField,
  Button, Alert, InputAdornment,
  LinearProgress, Divider, Link,
  FormControlLabel, Checkbox
} from '@mui/material';
import {
  Person,
  Login,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authUtils } from '../rest/authUtils';
import { clearAllData } from '../rest/userApis';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    userid: '',
    rememberMe: false
  });

  // UI state
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [clearingSession, setClearingSession] = useState(false);

  // Render a field error with a matching icon
  const renderFieldError = (message) => {
    if (!message) return '';
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <ErrorIcon sx={{ fontSize: 14 }} />
        {message}
      </Box>
    );
  };

  // Handle input changes
  const handleInputChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    // Userid validation
    if (!formData.userid.trim()) {
      errors.userid = 'User ID is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

        const baseUrl = isLocalhost
            ? 'http://localhost:8000'
            : 'https://toolbox.pythonanywhere.com';

        console.log(`🔗 API Environment: ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} | Base URL: ${baseUrl}`);

        return baseUrl;
      };

      const API_BASE_URL = getApiBaseUrl();

      const response = await fetch(API_BASE_URL + `/api/users/login/?userid=${formData.userid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Login successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response data:', data);

      // Use the userid from the form since we're sending it explicitly
      const userid = formData.userid;

      if (!userid) {
        throw new Error('User ID is required');
      }

      // Save to localStorage
      authUtils.login(userid, `user${userid}`);

      console.log('Login successful, userid:', userid);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      setError({ message: error.message || 'Login failed. Please check your credentials and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clear session
  const handleClearSession = async () => {
    setClearingSession(true);
    try {
      await clearAllData();
      // Show success message or redirect to login
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
    } finally {
      setClearingSession(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Login Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Welcome back! You will be redirected to your dashboard shortly.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            startIcon={<Login />}
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'background.default',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 15% 20%, rgba(10,132,255,0.35), transparent 42%),
            radial-gradient(circle at 85% 15%, rgba(191,90,242,0.28), transparent 45%),
            radial-gradient(circle at 50% 100%, rgba(255,55,95,0.22), transparent 55%)
          `,
          opacity: (theme) => (theme.palette.mode === 'dark' ? 1 : 0.5),
        },
      }}
    >
    <Container maxWidth="sm" sx={{ position: 'relative' }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(30,30,32,0.75)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Login sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your ToolBox account
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error.message || 'Login failed. Please check your credentials and try again.'}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* User ID Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="User ID"
                value={formData.userid}
                onChange={handleInputChange('userid')}
                error={!!formErrors.userid}
                helperText={renderFieldError(formErrors.userid)}
                required
                autoComplete="userid"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Remember Me Checkbox */}
            <Grid item xs={12} sx={{ pt: '0 !important' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.rememberMe}
                    onChange={handleInputChange('rememberMe')}
                    color="primary"
                  />
                }
                label="Remember me"
              />
            </Grid>
          </Grid>

          {/* Loading Progress */}
          {isLoading && <LinearProgress sx={{ mt: 2, mb: 2 }} />}

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 1, py: 1.3 }}
            startIcon={isLoading ? null : <Login />}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Secondary Actions */}
          <Box textAlign="center" sx={{ mt: 1 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleClearSession}
              disabled={clearingSession}
              sx={{
                textDecoration: 'none',
                color: 'warning.main',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {clearingSession ? 'Clearing session...' : 'Clear Session Data'}
            </Link>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Info */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Login to access your toolbox
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Don't have an account?{' '}
              <Link component="button" type="button" variant="body2" onClick={() => navigate('/register')}>
                Create one
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
    </Box>
  );
}