import * as React from 'react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Tooltip, Drawer, Avatar, Menu, MenuItem, ListItemIcon,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Divider,
} from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import TimelineIcon from '@mui/icons-material/TimelineRounded';
import AutorenewIcon from '@mui/icons-material/AutorenewRounded';
import AutoGraphIcon from '@mui/icons-material/InsightsRounded';
import CallSplitIcon from '@mui/icons-material/CallSplitRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';

import { authUtils } from './rest/authUtils';
import { clearAllData } from './rest/userApis';
import { useAuth } from '../contexts/AuthContext';
import { useColorMode } from '../contexts/ColorModeContext';
import { MoneyProvider, useMoney } from '../contexts/MoneyContext';
import { deriveWeather } from './ui/FinancialWeather';
import BrandLogo from './motion/BrandLogo';
import PageTransition from './motion/PageTransition';
import { NotificationBell, FinancialWeatherBar } from './ui';
import Assistant from './ui/Assistant';
import usePressSpring from './ui/usePressSpring';
import useScrollEdge from './ui/useScrollEdge';
import { accents, type } from '../theme/tokens';

const RAIL_W = 256;

// Nav is scoped to the expense-tracking core, plus Pulse and Shared brought
// back by request. Inbox (copilot cards + split balances), Universe
// (immersive, opt-in visualisation) and the guide stay out; their routes and
// pages still exist (a copilot card's "Settle up" or "Manage recurring"
// action still lands somewhere real), they're just not what this app leads
// with.
const NAV = [
  { seg: 'dashboard', alias: ['', 'dashboard'], label: 'Home', icon: DashboardIcon, tone: accents.blue },
  { seg: 'story', label: 'Today', icon: AutoStoriesRoundedIcon, tone: accents.mint },
  { seg: 'expense-tracker', label: 'Activity', icon: TimelineIcon, tone: accents.blue },
  { seg: 'recurring', label: 'Recurring', icon: AutorenewIcon, tone: accents.violet },
  { seg: 'reports', label: 'Insights', icon: AutoGraphIcon, tone: accents.purple },
  { seg: 'pulse', label: 'Pulse', icon: FavoriteBorderRoundedIcon, tone: accents.red },
  { seg: 'splits', label: 'Shared', icon: CallSplitIcon, tone: accents.amber },
  { seg: 'guide', label: 'Guide', icon: ArticleRoundedIcon, tone: accents.cyan },
];

const LEARN = [];

const ALL_NAV = [...NAV, ...LEARN];

const segOf = (pathname) => pathname.replace(/^\/+/, '').split('/')[0];

/** Is this nav item the active route? '' and 'dashboard' both mean Home. */
function isActive(item, pathname) {
  const seg = segOf(pathname);
  if (item.alias) return item.alias.includes(seg);
  return item.seg === seg;
}

/** One nav row. Active state carries a shared, animated indicator (framer layoutId). */
function NavItem({ item, active, onClick, reduce, weatherColor }) {
  const Icon = item.icon;
  const press = usePressSpring({ pressScale: 0.97 });
  const pillColor = weatherColor || item.tone;
  return (
    <Box
      component="button"
      ref={press.ref}
      onClick={onClick}
      {...press.bindEvents}
      aria-current={active ? 'page' : undefined}
      sx={{
        position: 'relative', width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: '12px',
        border: 'none', background: 'transparent', font: 'inherit',
        color: active ? 'text.primary' : 'text.secondary',
        transition: 'color 160ms ease',
        '&:hover': { backgroundColor: active ? undefined : 'action.hover', color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${item.tone}`, outlineOffset: 2 },
      }}
    >
      {/* Weather-tinted spring pill slides between nav items via shared layoutId */}
      <AnimatePresence initial={false}>
        {active && !reduce && (
          <motion.div
            key="nav-pill"
            layoutId="nav-pill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: 10, zIndex: 0,
              backgroundColor: alpha(pillColor, 0.15),
              boxShadow: `0 0 12px ${alpha(pillColor, 0.5)}`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon scales up on active with a spring */}
      <motion.div
        animate={{ scale: active ? 1.08 : 1.0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}
      >
        <Icon sx={{ fontSize: 21, color: active ? pillColor : 'inherit' }} />
      </motion.div>

      <Typography sx={{ position: 'relative', zIndex: 1, fontSize: '0.92rem', fontWeight: active ? 650 : 500, letterSpacing: '-0.01em' }}>
        {item.label}
      </Typography>
    </Box>
  );
}

/** Display name + avatar initial from the live profile (context), cache fallback. */
function displayIdentity(user) {
  const u = user || authUtils.getUser();
  const first = u?.firstName || u?.first_name;
  const full = [first, u?.lastName || u?.last_name].filter(Boolean).join(' ').trim();
  const name = full || u?.displayName || first || u?.username || u?.email || 'Your account';
  const initial = (first || u?.username || u?.email || 'U').trim().charAt(0).toUpperCase();
  return { name, initial };
}

/** The rail's inner content — shared by the desktop rail and the mobile drawer. */
function RailContent({ pathname, onNavigate, onOpenAccount, accountRef, user }) {
  const reduce = useReducedMotion();
  const { name, initial } = displayIdentity(user);
  const { projection, pulse } = useMoney();
  const weather = deriveWeather({ projection, pulse });
  const weatherColor = weather.color || accents.mint;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 1.5, py: 2 }}>
      {/* Brand lockup */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, mb: 3 }}>
        <BrandLogo size={30} />
        <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
          Money OS
        </Typography>
      </Box>

      <Typography sx={{ px: 1.5, mb: 1, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'text.disabled' }}>
        Money
      </Typography>
      <Box component="nav" aria-label="Primary" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {NAV.map((item) => (
          <NavItem key={item.seg} item={item} active={isActive(item, pathname)} reduce={reduce}
            onClick={() => onNavigate('/' + item.seg)} weatherColor={weatherColor} />
        ))}
        {LEARN.length > 0 && (
          <>
            <Box sx={{ height: '1px', bgcolor: 'divider', mx: 1.5, my: 1 }} aria-hidden />
            {LEARN.map((item) => (
              <NavItem key={item.seg} item={item} active={isActive(item, pathname)} reduce={reduce}
                onClick={() => onNavigate('/' + item.seg)} weatherColor={weatherColor} />
            ))}
          </>
        )}
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

/** The ⌘K "Ask Money OS" affordance. */
function AskButton({ compact }) {
  const open = () => window.dispatchEvent(new Event('toolbox:command-palette'));
  return (
    <Tooltip title="Ask Money OS (⌘K)">
      <Box
        onClick={open} role="button" aria-label="Open the Money OS assistant"
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

// Home | Activity | [FAB] | Insights | More
const BOTTOM_ITEMS = [
  NAV.find((n) => n.seg === 'dashboard'),
  NAV.find((n) => n.seg === 'expense-tracker'),
  null,
  NAV.find((n) => n.seg === 'reports'),
  { seg: null, label: 'More', icon: MoreHorizRoundedIcon },
];

// Items surfaced in the "More" bottom sheet
const MORE_ITEMS = [
  NAV.find((n) => n.seg === 'story'),
  NAV.find((n) => n.seg === 'recurring'),
  NAV.find((n) => n.seg === 'splits'),
  NAV.find((n) => n.seg === 'pulse'),
  NAV.find((n) => n.seg === 'guide'),
];

/** Compact bottom sheet for secondary nav destinations. */
function MoreSheet({ open, onClose, onNavigate }) {
  const { mode, toggleColorMode } = useColorMode();
  const openAsk = () => { onClose(); window.dispatchEvent(new Event('toolbox:command-palette')); };
  return (
    <Drawer
      anchor="bottom" open={open} onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          borderRadius: '20px 20px 0 0', px: 2, pt: 2,
          pb: 'calc(1.5rem + env(safe-area-inset-bottom))',
          backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(18,18,26,0.97)' : 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
        },
      }}
    >
      {/* Handle + close */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 12 }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nav grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 1, mb: 1.5 }}>
        {MORE_ITEMS.filter(Boolean).map((item) => {
          const Icon = item.icon;
          return (
            <Box
              key={item.seg}
              component="button"
              onClick={() => { onNavigate('/' + item.seg); onClose(); }}
              aria-label={item.label}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
                border: 'none', cursor: 'pointer', font: 'inherit', borderRadius: '14px',
                background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                py: 1.5, px: 1, color: 'text.secondary',
                transition: 'background 150ms ease, color 150ms ease',
                '&:active': { background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' },
              }}
            >
              <Icon sx={{ fontSize: 22, color: item.tone }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 500, lineHeight: 1, color: 'text.primary' }}>
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Utility row */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box
          component="button"
          onClick={openAsk}
          sx={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 1, py: 1.1, px: 1.5,
            border: '1px solid', borderColor: 'divider', borderRadius: '12px',
            background: 'transparent', cursor: 'pointer', font: 'inherit', color: 'text.secondary',
            '&:active': { background: 'action.hover' },
          }}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: accents.violet }} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 550 }}>Ask Money OS</Typography>
        </Box>
        <Box
          component="button"
          onClick={() => { toggleColorMode(); onClose(); }}
          aria-label="Toggle theme"
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, py: 1.1, px: 1.5,
            border: '1px solid', borderColor: 'divider', borderRadius: '12px',
            background: 'transparent', cursor: 'pointer', font: 'inherit', color: 'text.secondary',
            '&:active': { background: 'action.hover' },
          }}
        >
          {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 550 }}>{mode === 'dark' ? 'Light' : 'Dark'}</Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

/** Persistent bottom tab bar rendered on xs/sm only. */
function BottomBar({ pathname, onNavigate, onOpenDrawer }) {
  const { projection, pulse } = useMoney();
  const weather = deriveWeather({ projection, pulse });
  const weatherColor = weather.color || accents.mint;
  const [moreOpen, setMoreOpen] = useState(false);

  const addExpense = () => window.dispatchEvent(new Event('toolbox:add-expense'));

  return (
    <>
      <Box
        component="nav"
        aria-label="Mobile navigation"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
          height: 'calc(60px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          alignItems: 'stretch',
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(14,14,20,0.97)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          borderTop: '1px solid', borderColor: 'divider',
        }}
      >
        {BOTTOM_ITEMS.map((item, i) => {
          // ── Centre FAB ──
          if (i === 2) {
            return (
              <Box key="add" sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                  component="button"
                  onClick={addExpense}
                  aria-label="Add expense"
                  sx={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: accents.cyan,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                    transform: 'translateY(-10px)',
                    transition: 'transform 160ms ease',
                    '&:active': { transform: 'translateY(-8px) scale(0.96)' },
                  }}
                >
                  <AddRoundedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mt: '-6px', lineHeight: 1 }}>Add</Typography>
              </Box>
            );
          }

          if (!item) return null;
          const active = item.alias
            ? item.alias.includes(segOf(pathname))
            : item.seg === segOf(pathname);
          const Icon = item.icon;
          const handleClick = item.seg === null
            ? () => setMoreOpen(true)
            : () => onNavigate('/' + item.seg);

          return (
            <Box
              key={item.label}
              component="button"
              onClick={handleClick}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              sx={{
                flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '3px',
                border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit',
                color: active ? weatherColor : 'text.secondary',
                transition: 'color 200ms ease',
                position: 'relative',
              }}
            >
              {/* Active indicator pill at top of button */}
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    layoutId="bottom-indicator"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 24, height: 3, borderRadius: '0 0 3px 3px',
                      backgroundColor: weatherColor,
                    }}
                  />
                )}
              </AnimatePresence>
              <motion.div
                animate={{ scale: active ? 1.1 : 1.0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Icon sx={{ fontSize: 23 }} />
              </motion.div>
              <Typography sx={{ fontSize: '0.63rem', fontWeight: active ? 650 : 500, lineHeight: 1 }}>
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { name: acctName, initial: acctInitial } = displayIdentity(user);
  const { mode, toggleColorMode } = useColorMode();
  const reduceMotion = useReducedMotion();
  const { sentinelRef, scrolled } = useScrollEdge();
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

  const activeItem = ALL_NAV.find((i) => isActive(i, location.pathname));
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
              borderBottom: '1px solid',
              borderColor: scrolled ? 'divider' : 'transparent',
              boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.08)' : 'none',
              backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(10,10,12,0.85)' : 'rgba(251,251,250,0.85)',
              backdropFilter: scrolled ? 'saturate(1.4) blur(16px)' : 'saturate(1.2) blur(8px)',
              WebkitBackdropFilter: scrolled ? 'saturate(1.4) blur(16px)' : 'saturate(1.2) blur(8px)',
              transition: 'border-color 240ms ease, box-shadow 240ms ease, backdrop-filter 240ms ease',
            }}
          >
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ display: { xs: 'inline-flex', md: 'none' } }} aria-label="Open navigation">
              <MenuRoundedIcon />
            </IconButton>
            {/* Brand logo on mobile */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
              <BrandLogo size={26} />
            </Box>
            {/* Page title — shown on both mobile and desktop */}
            <Box sx={{ position: 'relative', minWidth: { xs: 80, md: 120 }, height: 24, overflow: 'hidden' }}>
              <Typography
                key={pageTitle}
                component={motion.div}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: reduceMotion ? 0.15 : 0.34, ease: [0.32, 0.72, 0, 1] }}
                sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: { xs: '1rem', md: '1.15rem' }, letterSpacing: '-0.02em', lineHeight: '24px' }}
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
          <Box component="main" sx={{ flex: 1, px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 }, pb: { xs: 'calc(76px + env(safe-area-inset-bottom))', md: 3 } }}>
            <Box ref={sentinelRef} sx={{ height: '1px', mt: '-1px' }} aria-hidden />
            <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </Box>
          </Box>
        </Box>

        {/* Mobile bottom tab bar — replaces the hamburger nav on xs/sm */}
        <BottomBar pathname={location.pathname} onNavigate={go} onOpenDrawer={() => setDrawerOpen(true)} />

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
