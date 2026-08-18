import React, { useState } from 'react';
import {
  Container, Paper, Typography, Box, Grid, TextField,
  Button, Alert, Snackbar, IconButton, InputAdornment,
  LinearProgress, Card, CardContent, Divider, Link,
  FormHelperText
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  CheckCircle,
  Error as ErrorIcon,
  ArrowBack,
  HowToReg
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function UserRegistrationPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
    color: 'error.main'
  });

  // Handle input changes
  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
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

    // Real-time password strength check
    if (field === 'password') {
      validatePasswordStrength(value);
    }
  };

  // Password strength validation
  const validatePasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) score += 25;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('One lowercase letter');

    if (/[0-9]/.test(password)) score += 25;
    else feedback.push('One number');

    let color = 'error.main';
    if (score >= 75) color = 'success.main';
    else if (score >= 50) color = 'warning.main';

    setPasswordStrength({ score, feedback, color });
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // First name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (passwordStrength.score < 50) {
      errors.password = 'Password is too weak';
    }

    // Password confirmation validation
    if (!formData.password_confirm) {
      errors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      errors.password_confirm = 'Passwords do not match';
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
      const result = await register(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Registration error:', error);
    }
  };

  // Password strength indicator component
  const PasswordStrengthIndicator = () => (
    <Box sx={{ mt: 1 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="caption" color="text.secondary">
          Password Strength:
        </Typography>
        <LinearProgress
          variant="determinate"
          value={passwordStrength.score}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 3,
            '& .MuiLinearProgress-bar': {
              backgroundColor: passwordStrength.color,
              borderRadius: 3
            }
          }}
        />
        <Typography variant="caption" sx={{ color: passwordStrength.color }}>
          {passwordStrength.score < 50 ? 'Weak' :
           passwordStrength.score < 75 ? 'Medium' : 'Strong'}
        </Typography>
      </Box>
      {passwordStrength.feedback.length > 0 && (
        <Box>
          {passwordStrength.feedback.map((item, index) => (
            <Typography key={index} variant="caption" display="block" color="text.secondary">
              • {item}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Registration Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your account has been created successfully. You will be redirected to the dashboard shortly.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            startIcon={<ArrowBack />}
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
        py: 4,
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
    <Container maxWidth="md" sx={{ position: 'relative' }}>
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
          <HowToReg sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join ToolBox and start organizing your projects
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error.message || 'Registration failed. Please try again.'}
          </Alert>
        )}

        {/* Registration Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Username Field */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={!!formErrors.username}
                helperText={formErrors.username}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Email Field */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* First Name Field */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Last Name Field */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                required
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
              <PasswordStrengthIndicator />
            </Grid>

            {/* Confirm Password Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={formData.password_confirm}
                onChange={handleInputChange('password_confirm')}
                error={!!formErrors.password_confirm}
                helperText={formErrors.password_confirm}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password confirmation visibility"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        edge="end"
                      >
                        {showPasswordConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Password Requirements Info */}
          <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Password Requirements:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <Typography variant="caption" color={formData.password.length >= 8 ? 'success.main' : 'text.secondary'}>
                  ✓ 8+ characters
                </Typography>
                <Typography variant="caption" color={/[A-Z]/.test(formData.password) ? 'success.main' : 'text.secondary'}>
                  ✓ Uppercase letter
                </Typography>
                <Typography variant="caption" color={/[a-z]/.test(formData.password) ? 'success.main' : 'text.secondary'}>
                  ✓ Lowercase letter
                </Typography>
                <Typography variant="caption" color={/[0-9]/.test(formData.password) ? 'success.main' : 'text.secondary'}>
                  ✓ Number
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Loading Progress */}
          {isLoading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Login Link */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                sx={{ textDecoration: 'none' }}
              >
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
    </Box>
  );
}