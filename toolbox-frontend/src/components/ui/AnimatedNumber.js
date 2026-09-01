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

    // rAF is throttled/paused in a hidden or backgrounded tab, which would leave
    // the figure frozen at its old value (e.g. ₹0 while data loads off-screen).
    // When we can't animate, snap to the real value so it's never stale.
    if (reduce || from === to || (typeof document !== 'undefined' && document.hidden)) {
      fromRef.current = to;
      setDisplay(to);
      return undefined;
    }

    const start = performance.now();
    let done = false;
    const finish = () => { if (done) return; done = true; fromRef.current = to; setDisplay(to); };
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease out: most of the distance early, so it feels responsive.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else finish();
    };
    frameRef.current = requestAnimationFrame(tick);
    // Safety net: if rAF never delivers the final frame (tab hidden mid-count),
    // guarantee the value lands once past the duration.
    const guard = setTimeout(finish, duration + 120);
    const onHide = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(guard);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [value, duration]);

  const formatted = format === 'smart' ? moneySmart(display)
    : format === 'plain' ? Math.round(display).toLocaleString('en-IN')
    : money(display);

  // Tabular figures stop the width jittering as digits change mid-count.
  return <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }} {...props}>{formatted}</Box>;
}
