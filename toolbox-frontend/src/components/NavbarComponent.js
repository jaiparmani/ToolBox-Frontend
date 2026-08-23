import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authUtils } from './rest/authUtils';
import { clearAllData } from './rest/userApis';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useColorMode } from '../contexts/ColorModeContext';

export default function NavbarComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authUtils.getUser();
  const { mode, toggleColorMode } = useColorMode();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCookies = async () => {
    setIsClearing(true);
    try {
      // Use the comprehensive clearAllData function from AuthContext
      await clearAllData();
      setShowSuccess(true);
      setShowConfirmDialog(false);

      // Optional: redirect to login page after clearing
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      console.error('Failed to clear cookies:', error);
      setShowConfirmDialog(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleLogout = async () => {
    try {
      authUtils.logout();
      // Clear all cookies and data as well
      await clearAllData();
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundImage: 'linear-gradient(90deg, #0A84FF, #0071e3 60%, #2997FF)',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            height: '3px',
            backgroundImage: 'linear-gradient(90deg, #0A84FF, #BF5AF2, #FF375F)',
          },
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {location.pathname !== '/' && location.pathname !== '/dashboard' && (
              <Tooltip title="Back to Dashboard">
                <IconButton
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    color: 'primary.contrastText',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>
            )}
            <Typography
              variant="h6"
              component="div"
              noWrap
              sx={{
                fontWeight: 600,
                color: 'primary.contrastText',
                minWidth: 0,
                // "ToolBox Dashboard" wrapped to two lines on a phone and ran
                // into the greeting beside it. Shorter title, one line, and the
                // greeting steps aside below sm.
                fontSize: { xs: '1.05rem', sm: '1.25rem' },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ToolBox Dashboard</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>ToolBox</Box>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User info */}
            {user && (
              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: 'primary.contrastText',
                  mr: 2,
                  opacity: 0.9,
                  // No room for a greeting next to the icons on a phone.
                  display: { xs: 'none', sm: 'block' },
                  maxWidth: 200,
                }}
              >
                Welcome, {user.username || user.email || 'User'}
              </Typography>
            )}

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                onClick={toggleColorMode}
                sx={{
                  color: 'primary.contrastText',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Clear Cookies Button */}
            <Tooltip title="Clear all cookies and session data">
              <IconButton
                onClick={() => setShowConfirmDialog(true)}
                sx={{
                  color: 'warning.light',
                  '&:hover': {
                    backgroundColor: 'warning.dark',
                    color: 'warning.contrastText'
                  }
                }}
                disabled={isClearing}
              >
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>

            {/* Logout Button */}
            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          All cookies and session data cleared successfully! Redirecting to login...
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => !isClearing && setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main' }}>
          Clear All Cookies and Data?
        </DialogTitle>
        <DialogContent>
          <Box sx={{ color: 'text.secondary' }}>
            <Typography variant="body1" color="text.secondary">This action will:</Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Clear all browser cookies</li>
              <li>Remove session data</li>
              <li>Clear local storage</li>
              <li>Log you out of the application</li>
              <li>Redirect you to the login page</li>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            disabled={isClearing}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearCookies}
            variant="contained"
            color="warning"
            disabled={isClearing}
            startIcon={isClearing ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
          >
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
