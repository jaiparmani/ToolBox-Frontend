import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

/**
 * Variants for a direct `motion.div` child of a StorySection that should pop
 * in on its own beat instead of moving with the section as one block — stat
 * tiles, chapter cards. A child using these has no initial/animate of its
 * own; it inherits "hidden"/"visible" from the nearest StorySection
 * ancestor, which is what turns `staggerChildren` into a real
 * one-after-another reveal instead of everything arriving at once.
 */
export const storyItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

/**
 * One chapter of the story feed — Apple Design §7/§9.
 *
 * Two motion layers, deliberately kept separate so they never fight:
 * 1. An ambient depth layer bound directly to scroll position (transform +
 *    opacity only, via framer-motion's MotionValues — no React re-renders,
 *    so it costs nothing to run continuously). A chapter dims and shrinks
 *    slightly as it drifts toward the top or bottom edge, full-strength in
 *    the middle — the scroll reads as a space with depth, not a flat list.
 * 2. The existing one-shot spring pop (+ staggered children) on first
 *    entering view, nested inside the depth layer.
 * `viewport.once: false` on the pop means it plays again each time you
 * scroll back to a chapter; the depth layer is always live regardless.
 */
export default function StorySection({ children, index, onEnter, sx, divider = true }) {
  const reduce = useReducedMotion();
  const depthRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: depthRef, offset: ['start end', 'end start'] });
  const depthOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.4, 1, 1, 0.45]);
  const depthScale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.97]);

  const container = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.98 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: reduce
        ? { duration: motionTokens.fast / 1000 }
        : { type: 'spring', stiffness: 260, damping: 30, mass: 0.9, staggerChildren: 0.07, delayChildren: 0.06 },
    },
  };

  return (
    <Box sx={{ py: { xs: 3.5, sm: 4.5 }, borderBottom: divider ? '1px solid' : 'none', borderColor: 'divider', ...sx }}>
      <motion.div ref={depthRef} style={reduce ? undefined : { opacity: depthOpacity, scale: depthScale }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.4, once: false, margin: '-15% 0px -15% 0px' }}
          variants={container}
          onViewportEnter={() => onEnter?.(index)}
        >
          {children}
        </motion.div>
      </motion.div>
    </Box>
  );
}
