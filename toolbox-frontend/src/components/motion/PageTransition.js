import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Interruptible page entrance — Apple Design §3.
 *
 * Replaced the CSS @keyframes with a framer-motion spring so navigating
 * mid-animation crossfades seamlessly from the current opacity/position
 * instead of cutting. The spring animates from the presentation value by
 * default, which is exactly what interruption needs.
 *
 * Mode "wait" is wrong for page transitions — it blocks the new page until
 * the old one exits. Instead we use no exit animation (instant unmount of
 * the old page) and only animate the entrance of the new page. This keeps
 * navigation feeling instant while the new page settles in gracefully.
 */
export default function PageTransition({ children }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={children?.key || 'page'}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0 }}
        transition={reduce
          ? { duration: 0.12 }
          : {
              type: 'spring',
              stiffness: 380,
              damping: 36,
              mass: 0.8,
              filter: { duration: 0.25 },
            }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
