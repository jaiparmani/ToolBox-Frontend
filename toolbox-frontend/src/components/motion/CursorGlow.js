import React from 'react';
import { Box } from '@mui/material';
import { useReducedMotion } from 'framer-motion';

/**
 * Ambient cursor light — a soft radial glow that trails the pointer to give the
 * dashboard depth, the thing you feel more than notice. Recovered from the old
 * mouse-reactive effect (a spark comet) and remade as the restrained version:
 * one faint light, no particles, no trail.
 *
 * Performance: the position is written straight to the node's transform on each
 * pointermove (the browser coalesces them) — no requestAnimationFrame loop to
 * freeze in a background tab, no per-frame React. Fine-pointer only (disabled on
 * touch) and a no-op under prefers-reduced-motion. Sits behind the content
 * (zIndex 0); interactive surfaces are opaque, so it reads only in the gaps.
 */
export default function CursorGlow({ color = '55, 201, 138' /* green rgb */ }) {
  const ref = React.useRef(null);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (reduce) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let shown = false;
    const move = (e) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!shown) { shown = true; el.style.opacity = '1'; }
    };
    const leave = () => { el.style.opacity = '0'; shown = false; };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseleave', leave);
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: 'fixed', top: 0, left: 0, width: 0, height: 0, zIndex: 0,
        pointerEvents: 'none', opacity: 0, transition: 'opacity 600ms ease', willChange: 'transform',
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0,
          width: 640, height: 640, marginLeft: '-320px', marginTop: '-320px', borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,255,255,0.045) 0%, rgba(${color},0.07) 26%, transparent 62%)`,
        },
      }}
    />
  );
}
