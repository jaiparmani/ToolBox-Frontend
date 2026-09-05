import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { motion as motionTokens } from '../../theme/tokens';

/**
 * One full-bleed "page" of a scroll-snapped story — Apple Design §7/§9.
 *
 * Snaps to the viewport as you scroll past it and reveals its content with a
 * one-shot spring (transform + opacity only, no continuous per-frame work).
 * `viewport.once: false` means it plays again each time you scroll back to
 * it, so the story stays alive in both directions rather than only forward.
 *
 * `containerRef` must point at the scrolling ancestor (not the window) so
 * IntersectionObserver measures against the actual scroll container.
 */
export default function StorySection({ children, index, onEnter, containerRef, sx }) {
  const reduce = useReducedMotion();

  return (
    <Box
      sx={{
        minHeight: 'calc(100dvh - 60px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
        px: { xs: 2, sm: 3 }, py: 4,
        ...sx,
      }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ root: containerRef, amount: 0.55, once: false }}
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
