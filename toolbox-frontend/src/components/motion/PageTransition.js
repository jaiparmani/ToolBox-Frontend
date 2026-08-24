import React from 'react';
import { Box } from '@mui/material';

/**
 * The entrance every screen animates in through.
 *
 * Deliberately pure CSS, not a JS spring. A framer-motion animation here froze
 * partway on the heavier screens: those components re-render many times a
 * second while data loads, which starved the animation loop and left the page
 * stuck at ~25% opacity. A CSS keyframe runs on the compositor and cannot be
 * interrupted by React re-renders, so the page always finishes arriving.
 *
 * Keyed by route in the router, so navigating re-runs the animation.
 */
export default function PageTransition({ children }) {
  return (
    <Box
      sx={{
        animation: 'pageIn 460ms cubic-bezier(0.32, 0.72, 0, 1) both',
        '@keyframes pageIn': {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.99)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {children}
    </Box>
  );
}
