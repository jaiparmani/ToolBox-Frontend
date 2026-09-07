import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

/**
 * Interruptible page entrance — Apple Design §3.
 *
 * Replaced the CSS @keyframes with a framer-motion spring so navigating
 * mid-animation crossfades seamlessly from the current opacity/position
 * instead of cutting. The spring animates from the presentation value by
 * default, which is exactly what interruption needs.
 *
 * The exit is deliberately near-instant (one `instant` beat) so the outgoing
 * page never holds the incoming one hostage; the entrance carries the whole
 * transition.
 *
 * Only transform and opacity animate. The entrance used to also animate a
 * `filter: blur()` on the entire page subtree, which forces a full-page
 * re-rasterisation on every frame of every navigation — the most expensive
 * possible way to say "this is arriving". The spring's overshoot-free settle
 * says it for free.
 */
export default function PageTransition({ children }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={children?.key || 'page'}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={reduce
          ? { duration: motionTokens.fast / 1000 }
          : {
              // Damping ratio ≈ 1.0: settles without overshoot, and re-targets
              // from the value on screen if a navigation interrupts it.
              type: 'spring',
              stiffness: 380,
              damping: 36,
              mass: 0.8,
              opacity: { duration: motionTokens.normal / 1000 },
            }
        }
        // The outgoing page leaves immediately; nothing waits on it.
        exitTransition={{ duration: motionTokens.instant / 1000 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
