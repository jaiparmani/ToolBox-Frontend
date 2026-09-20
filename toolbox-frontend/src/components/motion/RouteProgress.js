import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { accents } from '../../theme/tokens';

/**
 * Thin top-edge progress bar that fires on every route change.
 *
 * Lives at z:9999, pointer-events:none so it never blocks clicks.
 * Uses a CSS keyframe animation so the bar runs entirely on the compositor
 * (no JS per-frame). The bar "completes" when the animation finishes — no
 * manual state machine needed.
 *
 * Under prefers-reduced-motion the bar is hidden entirely; the page
 * transition itself already communicates "something arrived".
 */
export default function RouteProgress() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const [key, setKey] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setKey(k => k + 1);
  }, [location.pathname]);

  if (reduce || key === 0) return null;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      <Box
        key={key}
        sx={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          background: `linear-gradient(90deg, ${accents.cyan}, ${accents.blue})`,
          boxShadow: `0 0 10px ${accents.cyan}80, 0 0 4px ${accents.cyan}60`,
          '@keyframes routeProgressBar': {
            '0%':   { width: '0%',   opacity: 1 },
            '55%':  { width: '72%',  opacity: 1 },
            '80%':  { width: '94%',  opacity: 1 },
            '90%':  { width: '100%', opacity: 1 },
            '100%': { width: '100%', opacity: 0 },
          },
          animation: 'routeProgressBar 600ms cubic-bezier(0.32,0.72,0,1) forwards',
        }}
      />
    </Box>
  );
}
