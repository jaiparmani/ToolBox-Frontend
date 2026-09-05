import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
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
 * Reveals its content with a one-shot spring (transform + opacity only) as it
 * scrolls into the normal document flow — no full-screen paging, no nested
 * scroll container, so it sits in the page exactly like any other block and
 * inherits the app's usual background and scroll behaviour. `viewport.once:
 * false` means it plays again each time you scroll back to it. Direct
 * `StoryItem` children stagger in after the section itself has landed.
 */
export default function StorySection({ children, index, onEnter, sx, divider = true }) {
  const reduce = useReducedMotion();

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
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.4, once: false, margin: '-15% 0px -15% 0px' }}
        variants={container}
        onViewportEnter={() => onEnter?.(index)}
      >
        {children}
      </motion.div>
    </Box>
  );
}
