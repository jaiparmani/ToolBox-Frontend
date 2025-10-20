import React, { useState } from 'react';
import {
  Container, Paper, Typography, Box, Grid, TextField,
  Button, Alert, Snackbar, IconButton, InputAdornment,
  LinearProgress, Card, CardContent, Divider, Link,
  FormControlLabel, Checkbox
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Login,
  CheckCircle,
  Error as ErrorIcon,
  HowToReg
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clearAllData } from '../rest/userApis';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [clearingSession, setClearingSession] = useState(false);

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

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await login(formData.username, formData.password);
        console.log('Login result:', result);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login error:', error);
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
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
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
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error.message || 'Login failed. Please check your credentials and try again.'}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Username Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={!!formErrors.username}
                helperText={formErrors.username}
                required
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Password Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={!!formErrors.password}
                helperText={formErrors.password}
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Remember Me Checkbox */}
            <Grid item xs={12}>
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
            sx={{ mt: 3, mb: 2 }}
            startIcon={isLoading ? null : <Login />}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Clear Session Link */}
          <Box textAlign="center" sx={{ mb: 2 }}>
            <Link
              component="button"
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

          {/* Registration Link */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                sx={{ textDecoration: 'none' }}
              >
                Create one here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}