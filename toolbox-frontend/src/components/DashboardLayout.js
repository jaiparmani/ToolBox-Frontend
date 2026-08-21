import * as React from 'react';
import { useEffect, useState } from 'react';
import { extendTheme, useColorScheme } from '@mui/material/styles';
import {
  Box, Typography, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, CircularProgress
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LayersIcon from '@mui/icons-material/Layers';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import Grid from '@mui/material/Grid2';
import ExpenseTrackerPage from './screens/ExpenseTrackerPage';
import HobbyTracker from './screens/HobbyTracker.js';
import ArraySumDemo from './ArraySumDemo';
import LandingPage from './screens/LandingPage'
import QRCodeGenerator from './screens/QRCodeGenerator.js';
import UserProfilePage from './screens/UserProfilePage';
import { authUtils } from './rest/authUtils';
import { clearAllData } from './rest/userApis';
import { useColorMode } from '../contexts/ColorModeContext';

const NAVIGATION = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'expense-tracker',
    title: 'Expenses',
    icon: <BarChartIcon />,
  },
  {
    segment: 'hobby-tracker',
    title: 'Habit Tracker',
    icon: <LayersIcon />,
  },
  {
    segment: 'health-tracker',
    title: 'Health Tracker',
    icon: <FavoriteIcon />,
  },
  {
    segment: 'reports',
    title: 'Reports',
    icon: <AssessmentIcon />,
  },
  {
    segment: 'array-sum',
    title: 'Array Sum Demo',
    icon: <BarChartIcon />,
  },
  {
    kind: 'divider',
  },
  {
    kind: 'header',
    title: 'User Management',
  },
  {
    segment: 'profile',
    title: 'My Profile',
    icon: <AccountCircleIcon />,
  },
  {
    segment: 'api-keys',
    title: 'API Keys',
    icon: <VpnKeyIcon />,
  },
];
const demoTheme = extendTheme({
  colorSchemes: {
    light: { palette: { primary: { main: '#0071e3' } } },
    dark: { palette: { primary: { main: '#2997ff' } } },
  },
  colorSchemeSelector: 'class',
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Keeps Toolpad's own CSS-vars color scheme (used by the Dashboard's AppProvider
// theme) in lockstep with the app-wide ColorModeContext, so the same toggle
// works consistently whether it's clicked here or on any other page.
function ThemeSync({ mode }) {
  const { setMode } = useColorScheme();
  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);
  return null;
}

// Rendered at the bottom of the left sidebar - the welcome message, clear-session,
// theme toggle, and logout actions that used to live in a second, redundant top header bar.
function SidebarFooterAccount({ mini }) {
  const user = authUtils.getUser();
  const { mode, toggleColorMode } = useColorMode();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCookies = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      setShowConfirmDialog(false);
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
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
      await clearAllData();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      {!mini && user && (
        <Typography variant="body2" sx={{ px: 1, mb: 1, opacity: 0.8 }} noWrap>
          Welcome, {user.username || user.email || 'User'}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: mini ? 'center' : 'flex-start' }}>
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton size="small" onClick={toggleColorMode}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear all cookies and session data">
          <IconButton
            size="small"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isClearing}
            sx={{ color: 'warning.main' }}
          >
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Logout">
          <IconButton size="small" onClick={handleLogout}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

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
          <Button onClick={() => setShowConfirmDialog(false)} disabled={isClearing} color="inherit">
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
    </Box>
  );
}

export default function DashboardLayoutBasic(props) {
  const { window } = props;
  const { mode } = useColorMode();

  // Remove this const when copying and pasting into your project.
  const demoWindow = window ? window() : undefined;

  return (
    <AppProvider
      navigation={NAVIGATION}
      theme={demoTheme}
      window={demoWindow}
    >
      <ThemeSync mode={mode} />
      <DashboardLayout
        slots={{ sidebarFooter: SidebarFooterAccount, toolbarActions: () => null }}
      >
        <PageContainer>
          <Grid container spacing={2}>
            <Grid xs={12}>
              <LandingPage />
            </Grid>
          </Grid>
        </PageContainer>
      </DashboardLayout>
    </AppProvider>
  );
}
