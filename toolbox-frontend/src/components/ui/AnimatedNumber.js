import React from 'react';
import { Box } from '@mui/material';
import { money, moneySmart } from './money';

/**
 * A figure that counts to its new value instead of snapping.
 *
 * Totals change after almost every action here, and a number that simply
 * swaps leaves you unsure whether it moved at all. Counting draws the eye to
 * what changed - and starts from the previous value, not zero, so a small
 * correction reads as small.
 *
 * Respects prefers-reduced-motion by jumping straight to the value.
 */
export default function AnimatedNumber({ value, format = 'money', duration = 650, ...props }) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const frameRef = React.useRef();

  React.useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const to = Number(value) || 0;

    if (reduce || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease out: most of the distance early, so it feels responsive.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = format === 'smart' ? moneySmart(display)
    : format === 'plain' ? Math.round(display).toLocaleString('en-IN')
    : money(display);

  // Tabular figures stop the width jittering as digits change mid-count.
  return <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }} {...props}>{formatted}</Box>;
}
