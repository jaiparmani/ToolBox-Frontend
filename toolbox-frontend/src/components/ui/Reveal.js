import React from 'react';
import { Box } from '@mui/material';
import { motion } from '../../theme/tokens';

/**
 * Fades and lifts content in, optionally staggered down a list.
 *
 * A list that appears all at once gives no sense of order; a short stagger
 * lets the eye track down it. The delay is capped so a long list doesn't
 * leave the last row waiting seconds to exist.
 */
export default function Reveal({ children, index = 0, step = 45, maxDelay = 380, sx, ...props }) {
  const delay = Math.min(index * step, maxDelay);
  return (
    <Box
      sx={{
        // A touch more lift + a whisper of scale, so sections settle into place
        // rather than just fading — the dashboard "composes" as it arrives.
        animation: `revealUp ${motion.slow}ms ${motion.ease} both`,
        animationDelay: `${delay}ms`,
        willChange: 'transform, opacity',
        '@keyframes revealUp': {
          from: { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
