/**
 * ToolBox /next — a separate, motion-forward UI that runs beside the classic
 * app. It reuses the existing tokens, APIs and colour-mode, and touches none of
 * the classic screens. Mounted at /next/* (see Router.js).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation, Navigate, Link } from 'react-router-dom';
import { motion as m, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import SpaceDashboardRounded from '@mui/icons-material/SpaceDashboardRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useColorMode } from '../contexts/ColorModeContext';
import { tokensFor, motion as T } from '../theme/tokens';
import { LedgerProvider } from './ledger';
import { Magnetic, EASE, sec } from './motionKit';
import AddExpenseSheet from './AddExpenseSheet';
import Overview from './pages/Overview';
import Activity from './pages/Activity';
import Story from './pages/Story';
import './next.css';

const NAV = [
  { to: '/next', end: true, label: 'Overview', icon: SpaceDashboardRounded },
  { to: '/next/activity', label: 'Activity', icon: ReceiptLongRounded },
  { to: '/next/story', label: 'Month story', icon: AutoStoriesRounded },
];

/** Token roles -> CSS custom properties on the root, per mode. */
function cssVars(mode) {
  const t = tokensFor(mode);
  const dark = mode === 'dark';
  return {
    '--nx-bg': dark ? '#0a0a0d' : '#f6f6f3',
    '--nx-surface': dark ? '#131318' : '#ffffff',
    '--nx-raised': dark ? '#1a1a21' : '#ffffff',
    '--nx-sunken': t.color.sunken,
    '--nx-hairline': t.color.hairline,
    '--nx-hairline-strong': dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)',
    '--nx-text': t.color.text,
    '--nx-dim': t.color.textDim,
    '--nx-faint': dark ? '#8a8c9a' : '#6f7482',
    '--nx-primary': t.color.primary,
    '--nx-on-primary': '#ffffff',
    '--nx-success': t.state.success,
    '--nx-danger': t.state.danger,
    '--nx-warning': t.state.warning,
    '--nx-grid': t.chart.gridline,
    '--nx-shadow-sm': t.shadow.sm,
    '--nx-shadow-lg': t.shadow.lg,
    '--nx-display': t.type.displayFamily,
    '--nx-body': t.type.family,
    '--nx-r-sm': `${t.radius.sm}px`,
    '--nx-r-md': `${t.radius.md}px`,
    '--nx-r-lg': `${t.radius.lg}px`,
    '--nx-r-xl': `${t.radius.xl}px`,
    '--nx-fast': `${T.fast}ms`,
    '--nx-normal': `${T.normal}ms`,
    '--nx-slow': `${T.slow}ms`,
    '--nx-slower': `${T.slower}ms`,
    '--nx-ease': T.ease,
    '--nx-emphasis': T.emphasis,
    colorScheme: mode,
  };
}

/** Route content enters from a soft mask and leaves quickly — spatial, not a flash. */
function Page({ children }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className="nx-page"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, clipPath: 'inset(0% 0% 6% 0% round 0px)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 0px)', transition: { duration: sec(T.slower), ease: EASE } }}
      exit={{ opacity: 0, y: reduce ? 0 : -8, transition: { duration: sec(T.fast), ease: EASE } }}
    >
      {children}
    </m.div>
  );
}

export default function NextApp() {
  const { mode, toggleColorMode } = useColorMode();
  const location = useLocation();
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const vars = useMemo(() => cssVars(mode), [mode]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const prev = document.title; document.title = 'Money OS — Next';
    // Scroll-linked scenes measure against <html>; give it a positioned box
    // while /next is mounted, and hand it back untouched on the way out.
    const root = document.documentElement; const prevPos = root.style.position;
    root.style.position = 'relative';
    return () => { document.title = prev; root.style.position = prevPos; };
  }, []);

  const addButton = (
    <Magnetic>
      <button type="button" className="nx-btn nx-btn--primary nx-add" onClick={() => setAdding(true)}>
        <AddRounded fontSize="small" /> <span className="nx-add-label">Add expense</span>
      </button>
    </Magnetic>
  );

  return (
    <MotionConfig reducedMotion="user">
      <LedgerProvider mode={mode}>
        <div className={`nx nx--${mode}`} style={vars}>
          <a href="#nx-main" className="nx-skip">Skip to content</a>
          <aside className="nx-rail" aria-label="Primary">
            <Link to="/next" className="nx-brand" aria-label="Money OS, overview">
              <span className="nx-brand-mark" aria-hidden="true"><i /><i /><i /></span>
              <span className="nx-brand-word">Money OS</span>
            </Link>
            <div className="nx-rail-add">{addButton}</div>
            <nav className="nx-nav">
              {NAV.map(({ to, end, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={end} className="nx-nav-link">
                  {({ isActive }) => (
                    <>
                      {isActive && <m.span layoutId="nx-nav-pill" className="nx-nav-pill" transition={{ duration: sec(T.slow), ease: EASE }} />}
                      <Icon fontSize="small" className="nx-nav-icon" />
                      <span className="nx-nav-label">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="nx-rail-foot">
              <button type="button" className="nx-icon-btn" onClick={toggleColorMode}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <AnimatePresence mode="wait" initial={false}>
                  <m.span key={mode} className="nx-icon-swap"
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: sec(T.normal), ease: EASE }}>
                    {mode === 'dark' ? <LightModeRounded fontSize="small" /> : <DarkModeRounded fontSize="small" />}
                  </m.span>
                </AnimatePresence>
              </button>
              <Link to="/" className="nx-classic"><ArrowBackRounded fontSize="inherit" /> <span>Classic app</span></Link>
            </div>
          </aside>

          <main id="nx-main" className="nx-main">
            <AnimatePresence mode="wait" initial={false}>
              <Routes location={location} key={location.pathname}>
                <Route index element={<Page><Overview onAdd={() => setAdding(true)} /></Page>} />
                <Route path="activity" element={<Page><Activity onAdd={() => setAdding(true)} /></Page>} />
                <Route path="story" element={<Page><Story /></Page>} />
                <Route path="*" element={<Navigate to="/next" replace />} />
              </Routes>
            </AnimatePresence>
          </main>

          {/* Phone: floating primary action above the tab bar. */}
          <div className="nx-fab">
            <button type="button" className="nx-btn nx-btn--primary nx-fab-btn" onClick={() => setAdding(true)} aria-label="Add expense">
              <AddRounded />
            </button>
          </div>

          <div id="nx-layer" />

          <AddExpenseSheet open={adding} onClose={() => setAdding(false)} onSaved={setToast} />

          <div className="nx-toast-zone" aria-live="polite">
            <AnimatePresence>
              {toast && (
                <m.div className="nx-toast" key={toast}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }} transition={{ duration: sec(T.slow), ease: EASE }}>
                  <span className="nx-toast-dot" /> {toast}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </LedgerProvider>
    </MotionConfig>
  );
}
