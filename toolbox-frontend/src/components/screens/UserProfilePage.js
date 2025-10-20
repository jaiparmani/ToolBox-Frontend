import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Grid, TextField,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, Tab, Tabs, Card, CardContent,
  Divider, LinearProgress, IconButton, InputAdornment,
  FormHelperText, Chip, Avatar, CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  AccountCircle as AccountIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { clearAllData } from '../rest/userApis.js';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    clearError,
    updateProfile,
    changePassword,
    refreshUserProfile
  } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Profile editing state
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
    color: 'error.main'
  });

  // Data clearing state
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearDataSuccess, setClearDataSuccess] = useState(false);

  // Initialize profile form when user data is available
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        first_name: user.firstName || '',
        last_name: user.lastName || ''
      });
    }
  }, [user]);

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

  // Profile form validation
  const validateProfileForm = () => {
    const errors = {};

    if (!profileForm.username) {
      errors.username = 'Username is required';
    } else if (profileForm.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(profileForm.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!profileForm.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!profileForm.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!profileForm.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Password form validation
  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.old_password) {
      errors.old_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordStrength.score < 50) {
      errors.new_password = 'Password is too weak';
    }

    if (!passwordForm.new_password_confirm) {
      errors.new_password_confirm = 'Please confirm your new password';
    } else if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      errors.new_password_confirm = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile form input changes
  const handleProfileInputChange = (field) => (event) => {
    const value = event.target.value;
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (profileErrors[field]) {
      setProfileErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle password form input changes
  const handlePasswordInputChange = (field) => (event) => {
    const value = event.target.value;
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    if (field === 'new_password') {
      validatePasswordStrength(value);
    }
  };

  // Handle profile save
  const handleProfileSave = async () => {
    if (!validateProfileForm()) {
      return;
    }

    try {
      const result = await updateProfile(profileForm);

      if (result.success) {
        setProfileSuccess(true);
        setEditMode(false);
        setTimeout(() => setProfileSuccess(false), 4000);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      const result = await changePassword(
        passwordForm.old_password,
        passwordForm.new_password,
        passwordForm.new_password_confirm
      );

      if (result.success) {
        setPasswordSuccess(true);
        setPasswordForm({
          old_password: '',
          new_password: '',
          new_password_confirm: ''
        });
        setPasswordStrength({ score: 0, feedback: [], color: 'error.main' });
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    clearError();
  };

  // Handle clear all data
  const handleClearAllData = async () => {
    setIsClearingData(true);

    try {
      const result = await clearAllData();

      if (result) {
        setClearDataSuccess(true);
        setTimeout(() => {
          setClearDataSuccess(false);
          // Navigate to login page after clearing data
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Clear data error:', error);
    } finally {
      setIsClearingData(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
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

  // Authentication check
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You need to be logged in to view your profile.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            startIcon={<PersonIcon />}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Loading state
  if (isLoading && !user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography>Loading profile...</Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <AccountIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              User Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your account settings and preferences
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error.message || 'An error occurred. Please try again.'}
          </Alert>
        )}

        {/* Success Messages */}
        <Snackbar open={profileSuccess} autoHideDuration={4000} onClose={() => setProfileSuccess(false)}>
          <Alert onClose={() => setProfileSuccess(false)} severity="success" sx={{ width: '100%' }}>
            Profile updated successfully!
          </Alert>
        </Snackbar>

        <Snackbar open={passwordSuccess} autoHideDuration={4000} onClose={() => setPasswordSuccess(false)}>
          <Alert onClose={() => setPasswordSuccess(false)} severity="success" sx={{ width: '100%' }}>
            Password changed successfully!
          </Alert>
        </Snackbar>

        {/* Profile Header Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={3}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
              >
                {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box flexGrow={1}>
                <Typography variant="h5" gutterBottom>
                  {user?.displayName || user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Chip
                  label={`Member since ${user?.dateJoined ? new Date(user.dateJoined).getFullYear() : 'N/A'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              </Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refreshUserProfile}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper elevation={1}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<PersonIcon />} label="Profile Information" />
            <Tab icon={<LockIcon />} label="Change Password" />
            <Tab icon={<SecurityIcon />} label="Privacy & Data" />
          </Tabs>

          {/* Profile Information Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Profile Information</Typography>
                <Box display="flex" gap={1}>
                  {!editMode ? (
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => setEditMode(true)}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => {
                          setEditMode(false);
                          setProfileForm({
                            username: user?.username || '',
                            email: user?.email || '',
                            first_name: user?.firstName || '',
                            last_name: user?.lastName || ''
                          });
                          setProfileErrors({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleProfileSave}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  )}
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={profileForm.username}
                    onChange={handleProfileInputChange('username')}
                    error={!!profileErrors.username}
                    helperText={profileErrors.username}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileInputChange('email')}
                    error={!!profileErrors.email}
                    helperText={profileErrors.email}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profileForm.first_name}
                    onChange={handleProfileInputChange('first_name')}
                    error={!!profileErrors.first_name}
                    helperText={profileErrors.first_name}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profileForm.last_name}
                    onChange={handleProfileInputChange('last_name')}
                    error={!!profileErrors.last_name}
                    helperText={profileErrors.last_name}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {!editMode && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Click "Edit Profile" to modify your information.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Password Change Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ensure your account is secure by regularly updating your password.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showPasswords.old ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={handlePasswordInputChange('old_password')}
                    error={!!passwordErrors.old_password}
                    helperText={passwordErrors.old_password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle current password visibility"
                            onClick={() => togglePasswordVisibility('old')}
                            edge="end"
                          >
                            {showPasswords.old ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={handlePasswordInputChange('new_password')}
                    error={!!passwordErrors.new_password}
                    helperText={passwordErrors.new_password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle new password visibility"
                            onClick={() => togglePasswordVisibility('new')}
                            edge="end"
                          >
                            {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <PasswordStrengthIndicator />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.new_password_confirm}
                    onChange={handlePasswordInputChange('new_password_confirm')}
                    error={!!passwordErrors.new_password_confirm}
                    helperText={passwordErrors.new_password_confirm}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={() => togglePasswordVisibility('confirm')}
                            edge="end"
                          >
                            {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {/* Password Requirements */}
              <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    New Password Requirements:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <Typography variant="caption" color={passwordForm.new_password.length >= 8 ? 'success.main' : 'text.secondary'}>
                      ✓ 8+ characters
                    </Typography>
                    <Typography variant="caption" color={/[A-Z]/.test(passwordForm.new_password) ? 'success.main' : 'text.secondary'}>
                      ✓ Uppercase letter
                    </Typography>
                    <Typography variant="caption" color={/[a-z]/.test(passwordForm.new_password) ? 'success.main' : 'text.secondary'}>
                      ✓ Lowercase letter
                    </Typography>
                    <Typography variant="caption" color={/[0-9]/.test(passwordForm.new_password) ? 'success.main' : 'text.secondary'}>
                      ✓ Number
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePasswordChange}
                  disabled={isLoading}
                  startIcon={<SaveIcon />}
                >
                  {isLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Privacy & Data Tab */}
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Privacy & Data Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your privacy settings and data. These actions are irreversible.
              </Typography>

              {/* Clear Data Success Message */}
              <Snackbar open={clearDataSuccess} autoHideDuration={2000} onClose={() => setClearDataSuccess(false)}>
                <Alert onClose={() => setClearDataSuccess(false)} severity="success" sx={{ width: '100%' }}>
                  All data cleared successfully! Redirecting to login...
                </Alert>
              </Snackbar>

              {/* Clear All Data Section */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <WarningIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="h6" color="warning.main">
                      Clear All Data
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    This action will:
                  </Typography>

                  <Box sx={{ pl: 2, mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      • Clear all browser cookies and session data
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Remove all local storage data
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Invalidate your current session
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Log you out and redirect to login page
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="error" sx={{ mb: 3, fontWeight: 'bold' }}>
                    This action cannot be undone.
                  </Typography>

                  <Button
                    variant="contained"
                    color="error"
                    startIcon={isClearingData ? <CircularProgress size={16} /> : <DeleteIcon />}
                    onClick={handleClearAllData}
                    disabled={isClearingData}
                    size="large"
                  >
                    {isClearingData ? 'Clearing Data...' : 'Clear All Data & Logout'}
                  </Button>
                </CardContent>
              </Card>

              {/* Privacy Information */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Data Retention
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your personal data is stored securely and is only used to provide you with the best experience.
                    We respect your privacy and only collect information necessary for the application to function properly.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
       </Paper>

        {/* Loading Progress */}
        {isLoading && <LinearProgress sx={{ mt: 2 }} />}
      </Paper>
    </Container>
  );
}