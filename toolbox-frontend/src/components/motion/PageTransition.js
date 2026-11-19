import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

// NAV order for direction inference (lower index = "earlier" / left-swipe)
const NAV_ORDER = [
  '', 'dashboard', 'story', 'expense-tracker', 'recurring',
  'reports', 'pulse', 'splits', 'guide', 'verdict',
  'inbox', 'profile', 'api-keys', 'universe', 'share',
];

function navIdx(pathname) {
  const seg = pathname.split('/')[1] || '';
  const i = NAV_ORDER.indexOf(seg);
  return i === -1 ? 99 : i;
}

/**
 * Directional page entrance — slides in from the direction you navigated.
 * Going "deeper" in the nav (higher index) enters from the right;
 * going back enters from the left; the initial fade-up is the fallback.
 *
 * AnimatePresence lives here — stable, not recreated per route — so the
 * outgoing page can play its exit before the incoming page starts.
 *
 * Call as: <PageTransition locationKey={location.pathname}><Outlet /></PageTransition>
 */
export default function PageTransition({ children, locationKey }) {
  const location = useLocation();
  const key = locationKey || location.pathname;

  const reduce = useReducedMotion();
  const prevKey = useRef(key);
  const dirRef = useRef(0);

  if (key !== prevKey.current) {
    const next = navIdx(key);
    const prev = navIdx(prevKey.current);
    dirRef.current = next > prev ? 1 : next < prev ? -1 : 0;
    prevKey.current = key;
  }
  const dir = dirRef.current;

  const xEnter = reduce ? 0 : dir === 1 ? 22 : dir === -1 ? -22 : 0;
  const xExit  = reduce ? 0 : dir === 1 ? -14 : dir === -1 ? 14 : 0;
  const yEnter = dir === 0 && !reduce ? 10 : 0;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, x: xEnter, y: yEnter }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: xExit, y: 0 }}
        transition={reduce
          ? { duration: motionTokens.fast / 1000 }
          : {
              type: 'spring',
              stiffness: 360,
              damping: 34,
              mass: 0.85,
              opacity: { duration: motionTokens.normal / 1000 },
            }
        }
        exitTransition={{ duration: motionTokens.instant / 1000 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
