import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SettingsIcon from '@mui/icons-material/Settings';
import ConstructionIcon from '@mui/icons-material/Construction';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FunctionsIcon from '@mui/icons-material/Functions';
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
import { MoneyProvider } from '../contexts/MoneyContext';
import BrandLogo from './motion/BrandLogo';
import ParticleFlow from './motion/ParticleFlow';
import { NotificationBell } from './ui';
import Assistant from './ui/Assistant';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

// Focused on the finance core plus Health. The old toy tools (Array Sum, QR,
// Habits) and the admin-only API Keys page are no longer in the primary nav.
const NAVIGATION = [
  { kind: 'header', title: 'Money' },
  { segment: 'dashboard', title: 'Home', icon: <DashboardIcon /> },
  { segment: 'inbox', title: 'Inbox', icon: <AllInboxIcon /> },
  { segment: 'expense-tracker', title: 'Activity', icon: <TimelineIcon /> },
  { segment: 'recurring', title: 'Recurring', icon: <AutorenewIcon /> },
  { segment: 'reports', title: 'Insights', icon: <AutoGraphIcon /> },
  { segment: 'splits', title: 'Shared', icon: <CallSplitIcon /> },
  { segment: 'health-tracker', title: 'Health', icon: <FavoriteIcon /> },
  { kind: 'divider' },
  { segment: 'profile', title: 'Settings', icon: <SettingsIcon /> },
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

// The ⌘K affordance in the top toolbar. Opens the ToolBox Assistant via a
// decoupled window event (the assistant also owns the keyboard shortcut itself).
function CommandTrigger() {
  const openAssistant = () => window.dispatchEvent(new Event('toolbox:command-palette'));
  return (
    <Tooltip title="Ask ToolBox (⌘K)">
      <Box
        onClick={openAssistant}
        role="button"
        aria-label="Open the ToolBox assistant"
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
          px: { xs: 1, sm: 1.5 }, py: 0.6, borderRadius: 2,
          border: '1px solid', borderColor: 'divider', color: 'text.secondary',
          transition: 'border-color 0.2s ease, color 0.2s ease',
          '&:hover': { borderColor: 'primary.main', color: 'text.primary' },
        }}
      >
        <AutoAwesomeRoundedIcon fontSize="small" />
        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Ask</Typography>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, px: 0.6, py: 0.1, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.7rem', fontWeight: 600 }}>⌘K</Box>
      </Box>
    </Tooltip>
  );
}

// The toolbar cluster: live notifications + the assistant trigger.
function ToolbarActions() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
      <NotificationBell />
      <CommandTrigger />
    </Box>
  );
}

export default function DashboardLayoutBasic(props) {
  const { window } = props;
  const { mode } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();

  const demoWindow = window ? window() : undefined;

  // Toolpad drives its own sidebar from this router shim; without it the nav
  // was decorative. pathname tells it which item is active, navigate() runs a
  // react-router transition when an item is clicked.
  const router = useMemo(() => ({
    pathname: location.pathname,
    searchParams: new URLSearchParams(location.search),
    navigate: (url) => navigate(String(url)),
  }), [location.pathname, location.search, navigate]);

  return (
    <AppProvider
      navigation={NAVIGATION}
      theme={demoTheme}
      window={demoWindow}
      router={router}
      branding={{ title: 'ToolBox', logo: <BrandLogo size={30} />, homeUrl: '/' }}
    >
      <ThemeSync mode={mode} />
      <MoneyProvider>
        <DashboardLayout
          slots={{ sidebarFooter: SidebarFooterAccount, toolbarActions: ToolbarActions }}
        >
          {/* The one ToolBox Assistant — ⌘K anywhere, or the toolbar button */}
          <Assistant />
          {/* App-wide particle layer — money in motion (settle → stream home) */}
          <ParticleFlow />
          {/* Every nested route renders here, inside the one shell */}
          <Box sx={{ p: { xs: 0, sm: 1 } }}>
            <Outlet />
          </Box>
        </DashboardLayout>
      </MoneyProvider>
    </AppProvider>
  );
}
