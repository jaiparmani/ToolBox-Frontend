/**
 * ToolBox /next — the money book. A separate UI that runs beside the classic
 * app (mounted at /next/* in Router.js) and touches none of its screens.
 *
 * Anti-template brief (see frontend-design-excellence → references/ai-tells.md):
 *   Refused   dark dashboard: sidebar, big-total card, chart card, category bars,
 *             calendar card, list card, one blue accent, Geist, motion on load.
 *   Material  a bank passbook / khata: ruled paper, red margin rule, ink figures,
 *             rubber-stamp heads, running total in the margin, carried-forward line.
 *   Departures structure (one ledger page, month index tabs, the add form is the
 *             next blank line), type (IBM Plex Serif + Mono), material (paper/ink;
 *             dark mode is a carbon copy).
 *   Signature the running total in the margin: watch the month add up line by line.
 *
 * Motion budget — every animation has a user cause; nothing animates on load:
 *   switch page or month  → the page turns (clip from the fore-edge)
 *   write a line          → it is stamped in, lines below slide down, the total is
 *                           struck through and rewritten
 *   choose a head         → other lines dim
 *   open an entry         → the line unfolds into a receipt slip (shared element)
 *   scroll the review     → a day marker moves through the month; margin notes ink
 *                           in when the marker reaches their date
 * Timing comes from theme/tokens `motion`; spacing from the 4pt scale.
 */
import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, Navigate, Link } from 'react-router-dom';
import { motion as m, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import { useColorMode } from '../contexts/ColorModeContext';
import { motion as T } from '../theme/tokens';
import { LedgerProvider } from './ledger';
import { EASE, sec } from './motionKit';
import MonthPage from './pages/MonthPage';
import Entries from './pages/Entries';
import Review from './pages/Review';
import './next.css';

const NAV = [
  { to: '/next', end: true, label: 'This month' },
  { to: '/next/entries', label: 'All entries' },
  { to: '/next/review', label: 'Review' },
];

/** Route change = turning to another page of the book. */
export function PageTurn({ children, turnKey }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      key={turnKey}
      className="nx-turn"
      initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0% 0% 0% 100%)', opacity: 0.6 }}
      animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, transition: { duration: sec(T.slower), ease: EASE }, transitionEnd: { clipPath: 'none' } }}
      exit={{ opacity: 0, transition: { duration: sec(T.instant) } }}
    >
      {children}
    </m.div>
  );
}

export default function NextApp() {
  const { mode, toggleColorMode } = useColorMode();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const prev = document.title; document.title = 'Money book';
    // Scroll-linked scenes measure against <html>; give it a positioned box
    // while /next is mounted, and hand it back untouched on the way out.
    const root = document.documentElement; const prevPos = root.style.position;
    root.style.position = 'relative';
    return () => { document.title = prev; root.style.position = prevPos; };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <LedgerProvider mode={mode}>
        <div className={`nx nx--${mode}`}>
          <a href="#nx-main" className="nx-skip">Skip to the ledger</a>
          <header className="nx-top">
            <Link to="/next" className="nx-mark">
              <span className="nx-mark-seal" aria-hidden="true">₹</span>
              <span>Money book</span>
            </Link>
            <nav className="nx-tabs" aria-label="Book sections">
              {NAV.map(({ to, end, label }) => (
                <NavLink key={to} to={to} end={end} className="nx-tab">{label}</NavLink>
              ))}
            </nav>
            <div className="nx-top-end">
              <button type="button" className="nx-icon" onClick={toggleColorMode}
                aria-label={mode === 'dark' ? 'Use paper (light) mode' : 'Use carbon (dark) mode'}>
                {mode === 'dark' ? <LightModeRounded fontSize="small" /> : <DarkModeRounded fontSize="small" />}
              </button>
              <Link to="/" className="nx-classic">Classic app</Link>
            </div>
          </header>

          <main id="nx-main" className="nx-desk">
            <AnimatePresence mode="wait" initial={false}>
              <PageTurn key={location.pathname} turnKey={location.pathname}>
                <Routes location={location}>
                  <Route index element={<MonthPage onToast={setToast} />} />
                  <Route path="entries" element={<Entries />} />
                  <Route path="review" element={<Review />} />
                  {/* earlier /next paths */}
                  <Route path="activity" element={<Navigate to="/next/entries" replace />} />
                  <Route path="story" element={<Navigate to="/next/review" replace />} />
                  <Route path="*" element={<Navigate to="/next" replace />} />
                </Routes>
              </PageTurn>
            </AnimatePresence>
          </main>

          <div id="nx-layer" />
          <div className="nx-toast-zone" aria-live="polite">
            <AnimatePresence>
              {toast && (
                <m.p className="nx-toast" key={toast}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: sec(T.normal), ease: EASE }}>
                  {toast}
                </m.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </LedgerProvider>
    </MotionConfig>
  );
}
