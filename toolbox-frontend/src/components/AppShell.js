import * as React from 'react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Tooltip, Drawer, Avatar, Menu, MenuItem, ListItemIcon,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Divider,
} from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded';
import AllInboxIcon from '@mui/icons-material/MoveToInboxRounded';
import TimelineIcon from '@mui/icons-material/TimelineRounded';
import AutorenewIcon from '@mui/icons-material/AutorenewRounded';
import AutoGraphIcon from '@mui/icons-material/InsightsRounded';
import CallSplitIcon from '@mui/icons-material/CallSplitRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import { authUtils } from './rest/authUtils';
import { clearAllData } from './rest/userApis';
import { useAuth } from '../contexts/AuthContext';
import { useColorMode } from '../contexts/ColorModeContext';
import { MoneyProvider } from '../contexts/MoneyContext';
import BrandLogo from './motion/BrandLogo';
import PageTransition from './motion/PageTransition';
import { NotificationBell, FinancialWeatherBar } from './ui';
import Assistant from './ui/Assistant';
import { accents, type } from '../theme/tokens';

const RAIL_W = 256;

const NAV = [
  { seg: 'dashboard', alias: ['', 'dashboard'], label: 'Home', icon: DashboardIcon, tone: accents.blue },
  { seg: 'inbox', label: 'Inbox', icon: AllInboxIcon, tone: accents.cyan },
  { seg: 'expense-tracker', label: 'Activity', icon: TimelineIcon, tone: accents.blue },
  { seg: 'recurring', label: 'Recurring', icon: AutorenewIcon, tone: accents.violet },
  { seg: 'reports', label: 'Insights', icon: AutoGraphIcon, tone: accents.purple },
  { seg: 'splits', label: 'Shared', icon: CallSplitIcon, tone: accents.amber },
  { seg: 'health-tracker', label: 'Health', icon: FavoriteIcon, tone: accents.red },
];

const segOf = (pathname) => pathname.replace(/^\/+/, '').split('/')[0];

/** Is this nav item the active route? '' and 'dashboard' both mean Home. */
function isActive(item, pathname) {
  const seg = segOf(pathname);
  if (item.alias) return item.alias.includes(seg);
  return item.seg === seg;
}

/** One nav row. Active state carries a shared, animated indicator (framer layoutId). */
function NavItem({ item, active, onClick, reduce }) {
  const Icon = item.icon;
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      sx={{
        position: 'relative', width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: '12px',
        border: 'none', background: 'transparent', font: 'inherit',
        color: active ? 'text.primary' : 'text.secondary',
        transition: 'color 160ms ease, background-color 160ms ease',
        '&:hover': { backgroundColor: active ? undefined : 'action.hover', color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${item.tone}`, outlineOffset: 2 },
      }}
    >
      {active && (
        <Box
          component={motion.div}
          layoutId={reduce ? undefined : 'nav-active'}
          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          sx={{
            position: 'absolute', inset: 0, borderRadius: '12px', zIndex: 0,
            background: `linear-gradient(90deg, ${item.tone}22, ${item.tone}0e)`,
            border: '1px solid', borderColor: `${item.tone}33`,
          }}
        />
      )}
      {active && (
        <Box
          component={motion.div}
          layoutId={reduce ? undefined : 'nav-bar'}
          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
          sx={{ position: 'absolute', left: -8, top: '50%', width: 3, height: 20, borderRadius: 3,
            transform: 'translateY(-50%)', background: item.tone, boxShadow: `0 0 12px ${item.tone}`, zIndex: 1 }}
        />
      )}
      <Icon sx={{ position: 'relative', zIndex: 1, fontSize: 21, color: active ? item.tone : 'inherit' }} />
      <Typography sx={{ position: 'relative', zIndex: 1, fontSize: '0.92rem', fontWeight: active ? 650 : 500, letterSpacing: '-0.01em' }}>
        {item.label}
      </Typography>
    </Box>
  );
}

/** Display name + avatar initial from the live profile (context), cache fallback. */
function displayIdentity(user) {
  const u = user || authUtils.getUser();
  const name = u?.username || u?.email || 'Your account';
  const initial = (u?.username || u?.email || 'U').trim().charAt(0).toUpperCase();
  return { name, initial };
}

/** The rail's inner content — shared by the desktop rail and the mobile drawer. */
function RailContent({ pathname, onNavigate, onOpenAccount, accountRef, user }) {
  const reduce = useReducedMotion();
  const { name, initial } = displayIdentity(user);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 1.5, py: 2 }}>
      {/* Brand lockup */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, mb: 3 }}>
        <BrandLogo size={30} />
        <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
          ToolBox
        </Typography>
      </Box>

      <Typography sx={{ px: 1.5, mb: 1, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'text.disabled' }}>
        Money
      </Typography>
      <Box component="nav" aria-label="Primary" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {NAV.map((item) => (
          <NavItem key={item.seg} item={item} active={isActive(item, pathname)} reduce={reduce}
            onClick={() => onNavigate('/' + item.seg)} />
        ))}
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Account block → opens the account menu */}
      <Box
        component="button"
        ref={accountRef}
        onClick={onOpenAccount}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', cursor: 'pointer',
          border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 1, font: 'inherit', textAlign: 'left',
          background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          transition: 'border-color 160ms ease, background-color 160ms ease',
          '&:hover': { borderColor: `${accents.blue}66` },
          '&:focus-visible': { outline: `2px solid ${accents.blue}`, outlineOffset: 2 },
        }}
      >
        <Avatar sx={{ width: 34, height: 34, fontSize: '0.95rem', fontWeight: 700,
          background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`, color: '#fff' }}>
          {initial}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '0.86rem', fontWeight: 620, letterSpacing: '-0.01em' }}>{name}</Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Settings &amp; sign-out</Typography>
        </Box>
        <SettingsIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      </Box>
    </Box>
  );
}

/** The ⌘K "Ask ToolBox" affordance. */
function AskButton({ compact }) {
  const open = () => window.dispatchEvent(new Event('toolbox:command-palette'));
  return (
    <Tooltip title="Ask ToolBox (⌘K)">
      <Box
        onClick={open} role="button" aria-label="Open the ToolBox assistant"
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.9, cursor: 'pointer',
          px: compact ? 1 : 1.4, py: 0.6, borderRadius: '11px',
          border: '1px solid', borderColor: 'divider', color: 'text.secondary',
          transition: 'border-color 160ms ease, color 160ms ease, background-color 160ms ease',
          '&:hover': { borderColor: `${accents.blue}88`, color: 'text.primary', backgroundColor: `${accents.blue}0d` },
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: accents.violet }} />
        {!compact && <Typography variant="body2" sx={{ fontWeight: 550 }}>Ask</Typography>}
        {!compact && <Box sx={{ px: 0.6, py: 0.1, borderRadius: '6px', border: '1px solid', borderColor: 'divider', fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled' }}>⌘K</Box>}
      </Box>
    </Tooltip>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { name: acctName, initial: acctInitial } = displayIdentity(user);
  const { mode, toggleColorMode } = useColorMode();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuEl, setMenuEl] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const accountRef = React.useRef(null);

  const go = (to) => { navigate(to); setDrawerOpen(false); };
  const openMenu = (e) => setMenuEl(e?.currentTarget || accountRef.current);
  const closeMenu = () => setMenuEl(null);

  const handleLogout = async () => {
    closeMenu();
    try { authUtils.logout(); await clearAllData(); } catch (e) { /* fall through to redirect */ }
    window.location.href = '/login';
  };
  const handleClear = async () => {
    setClearing(true);
    try { await clearAllData(); } catch (e) { /* ignore */ }
    setClearing(false); setConfirmClear(false);
    window.location.href = '/login';
  };

  const activeItem = NAV.find((i) => isActive(i, location.pathname));
  const pageTitle = activeItem?.label || (segOf(location.pathname) === 'profile' ? 'Settings' : '');

  return (
    <MoneyProvider>
      <Box sx={{ minHeight: '100dvh', display: 'flex' }}>
        {/* ── Desktop rail ── */}
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
            width: RAIL_W, flexShrink: 0, position: 'sticky', top: 0, height: '100dvh',
            borderRight: '1px solid', borderColor: 'divider',
            backgroundColor: (t) => t.palette.mode === 'dark' ? '#0c0c0e' : '#ffffff',
            zIndex: 2,
          }}
        >
          <RailContent pathname={location.pathname} onNavigate={go} onOpenAccount={openMenu} accountRef={accountRef} user={user} />
        </Box>

        {/* ── Mobile drawer ── */}
        <Drawer
          open={drawerOpen} onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: RAIL_W, border: 'none',
              backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(16,16,22,0.92)' : 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)' } }}
        >
          <RailContent pathname={location.pathname} onNavigate={go} onOpenAccount={openMenu} accountRef={accountRef} user={user} />
        </Drawer>

        {/* ── Main column ── */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Topbar */}
          <Box
            component="header"
            sx={{
              position: 'sticky', top: 0, zIndex: 3, display: 'flex', alignItems: 'center', gap: 1,
              px: { xs: 1.5, sm: 2.5 }, py: 1, minHeight: 60,
              borderBottom: '1px solid', borderColor: 'divider',
              backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(10,10,12,0.85)' : 'rgba(251,251,250,0.85)',
              backdropFilter: 'saturate(1.2) blur(8px)', WebkitBackdropFilter: 'saturate(1.2) blur(8px)',
            }}
          >
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' } }} aria-label="Open navigation">
              <MenuRoundedIcon />
            </IconButton>
            {/* Brand on mobile, page title on desktop */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
              <BrandLogo size={26} />
            </Box>
            {/* The page title animates in on route change — a quiet "you are here"
                that reinforces spatial continuity as you move between sections. */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative', minWidth: 120, height: 24, overflow: 'hidden' }}>
              <Typography
                key={pageTitle}
                component={motion.div}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: reduceMotion ? 0.15 : 0.34, ease: [0.32, 0.72, 0, 1] }}
                sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: '24px' }}
              >
                {pageTitle}
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* The climate lives here now — one persistent chip, not a banner
                repeated on every screen. Tap to open Insights. */}
            <FinancialWeatherBar compact sx={{ display: { xs: 'none', md: 'inline-flex' }, mr: 0.5 }} />
            <AskButton compact={false} />
            <NotificationBell />
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton onClick={toggleColorMode} aria-label="Toggle color mode" size="small">
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Account">
              <IconButton onClick={openMenu} aria-label="Account menu" size="small" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                <Avatar sx={{ width: 30, height: 30, fontSize: '0.85rem', fontWeight: 700,
                  background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`, color: '#fff' }}>
                  {acctInitial}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Routed content — the shell above/left persists; only this transitions
              per route (keyed), so navigation feels continuous, not a full reload. */}
          <Box component="main" sx={{ flex: 1, px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}>
            {/* Generous cap: fills the canvas on typical PC widths (up to ~1080p),
                only reins in ultra-wide monitors so lines don't sprawl. */}
            <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </Box>
          </Box>
        </Box>

        {/* The one ToolBox Assistant */}
        <Assistant />
      </Box>

      {/* Account menu */}
      <Menu
        anchorEl={menuEl} open={!!menuEl} onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: -1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography noWrap sx={{ fontWeight: 650, fontSize: '0.92rem' }}>{acctName}</Typography>
          <Typography noWrap sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{(user || authUtils.getUser())?.email || ''}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { closeMenu(); navigate('/profile'); }}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={() => { toggleColorMode(); }}>
          <ListItemIcon>{mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}</ListItemIcon>
          {mode === 'dark' ? 'Light mode' : 'Dark mode'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { closeMenu(); setConfirmClear(true); }} sx={{ color: 'warning.main' }}>
          <ListItemIcon><DeleteSweepIcon fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
          Clear local data
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>

      {/* Clear-data confirm */}
      <Dialog open={confirmClear} onClose={() => !clearing && setConfirmClear(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'warning.main' }}>Clear local data?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This clears cookies, session and local storage on this device and signs you out. Your account and its data on the server are untouched.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)} disabled={clearing} color="inherit">Cancel</Button>
          <Button onClick={handleClear} variant="contained" color="warning" disabled={clearing}
            startIcon={clearing ? <CircularProgress size={16} /> : <DeleteSweepIcon />}>
            {clearing ? 'Clearing…' : 'Clear data'}
          </Button>
        </DialogActions>
      </Dialog>
    </MoneyProvider>
  );
}
