import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

/**
 * One chapter of the story feed — Apple Design §7/§9.
 *
 * Reveals its content with a one-shot spring (transform + opacity only) as it
 * scrolls into the normal document flow — no full-screen paging, no nested
 * scroll container, so it sits in the page exactly like any other block and
 * inherits the app's usual background and scroll behaviour. `viewport.once:
 * false` means it plays again each time you scroll back to it.
 */
export default function StorySection({ children, index, onEnter, sx, divider = true }) {
  const reduce = useReducedMotion();

  return (
    <Box sx={{ py: { xs: 3.5, sm: 4.5 }, borderBottom: divider ? '1px solid' : 'none', borderColor: 'divider', ...sx }}>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ amount: 0.4, once: false, margin: '-15% 0px -15% 0px' }}
        transition={reduce
          ? { duration: motionTokens.fast / 1000 }
          : { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 }}
        onViewportEnter={() => onEnter?.(index)}
      >
        {children}
      </motion.div>
    </Box>
  );
}
