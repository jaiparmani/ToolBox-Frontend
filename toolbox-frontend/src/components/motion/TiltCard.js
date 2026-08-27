import React from 'react';
import { Box } from '@mui/material';
import { useReducedMotion } from 'framer-motion';

/**
 * A pane of glass with depth.
 *
 * Wraps any card so it tilts toward the pointer in 3D, with a soft glare that
 * tracks the cursor — and on touch devices it leans with the phone itself
 * (device tilt). The transform is written straight to the node per frame (no
 * React re-render), transform/opacity only, so it stays at 60fps. Reduced
 * motion opts out entirely: no listeners, no transform, just the flat card.
 *
 * Children keep all their own interactivity — the wrapper only reads pointer
 * position; it never swallows clicks.
 */
export default function TiltCard({ children, max = 9, glare = true, sx }) {
  const ref = React.useRef(null);
  const glareRef = React.useRef(null);
  const reduce = useReducedMotion();

  // Written straight to the node on each pointer event (as MoneyConstellation
  // does its drag) rather than through rAF — the browser already coalesces
  // pointermove, and a direct write can't be starved or frozen by a hidden tab.
  const write = (rx, ry, gx, gy, active) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(720px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${active ? 1.02 : 1})`;
    if (glareRef.current) {
      glareRef.current.style.opacity = active ? '0.25' : '0';
      glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.85), transparent 46%)`;
    }
  };

  const onMove = (e) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 2 * max;
    const rx = -(py - 0.5) * 2 * max;
    write(rx, ry, px * 100, py * 100, true);
  };

  const onEnter = () => { const el = ref.current; if (el) el.style.transition = 'transform 90ms linear'; };
  const onLeave = () => {
    if (reduce) return;
    const el = ref.current;
    if (el) el.style.transition = 'transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1)'; // settle home with a soft overshoot
    write(0, 0, 50, 50, false);
  };

  // Device tilt on touch: the whole tray of glass leans with the phone.
  React.useEffect(() => {
    if (reduce) return undefined;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (!coarse || typeof window.DeviceOrientationEvent === 'undefined') return undefined;
    const onTilt = (e) => {
      const ry = Math.max(-max, Math.min(max, (e.gamma || 0) / 4));
      const rx = Math.max(-max, Math.min(max, -((e.beta || 0) - 30) / 4));
      write(rx, ry, 50, 50, false);
    };
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, [reduce, max]);

  return (
    <Box ref={ref} onPointerMove={onMove} onPointerEnter={onEnter} onPointerLeave={onLeave}
      sx={{ position: 'relative', height: '100%', willChange: 'transform', ...sx }}>
      {children}
      {glare && (
        <Box ref={glareRef} aria-hidden sx={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          opacity: 0, transition: 'opacity 220ms ease', mixBlendMode: 'overlay', zIndex: 2,
        }} />
      )}
    </Box>
  );
}
