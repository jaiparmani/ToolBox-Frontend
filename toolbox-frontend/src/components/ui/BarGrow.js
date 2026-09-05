import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * A bar that grows from its baseline instead of appearing fully-formed.
 *
 * GPU-only: animates `scaleY` from a bottom transform-origin rather than
 * `height`, so it never touches layout. Staggered per index so a row of
 * bars reads as a wave landing rather than a static image popping in.
 * `once: true` — a bar chart is a small, self-contained fact, not a story
 * chapter; it shouldn't re-grow every time you scroll past it again.
 * Reduced-motion renders at full height immediately.
 */
export default function BarGrow({ heightPct, index = 0, sx, title, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <Box
      component={motion.div}
      title={title}
      initial={reduce ? false : { scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 20, delay: index * 0.045 }}
      sx={{ height: `${heightPct}%`, transformOrigin: 'bottom', ...sx }}
      {...rest}
    />
  );
}
