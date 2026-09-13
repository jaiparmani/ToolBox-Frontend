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
 *
 * `title` still carries the desktop hover tooltip, but that's invisible to
 * touch — a tap fires no hover at all. So when the caller wires up an
 * `onClick` (tap-to-reveal the value, same pattern as the day cells above),
 * the bar also gets a `whileTap` press-down so touch gets its own feedback
 * instead of relying on a tooltip that will never show.
 */
export default function BarGrow({ heightPct, index = 0, sx, title, onClick, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <Box
      component={motion.div}
      title={title}
      onClick={onClick}
      initial={reduce ? false : { scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      whileTap={reduce || !onClick ? undefined : { scale: 0.94, opacity: 0.85 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 20, delay: index * 0.045 }}
      sx={{ height: `${heightPct}%`, transformOrigin: 'bottom', cursor: onClick ? 'pointer' : undefined, ...sx }}
      {...rest}
    />
  );
}
