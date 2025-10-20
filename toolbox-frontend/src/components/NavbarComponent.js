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
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { clearAllData } from './rest/userApis';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LogoutIcon from '@mui/icons-material/Logout';

export default function NavbarComponent() {
  const { user, logout } = useAuth();
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
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <AppBar
        position="static"
        elevation={1}
        sx={{
          backgroundColor: 'primary.main',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                color: 'primary.contrastText'
              }}
            >
              ToolBox Dashboard
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User info */}
            {user && (
              <Typography
                variant="body2"
                sx={{
                  color: 'primary.contrastText',
                  mr: 2,
                  opacity: 0.9
                }}
              >
                Welcome, {user.username || user.email || 'User'}
              </Typography>
            )}

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
          <DialogContentText>
            This action will:
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
          </DialogContentText>
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
