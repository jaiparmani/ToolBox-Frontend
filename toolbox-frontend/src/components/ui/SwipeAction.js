import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Swipe a row sideways to reveal an action, past a threshold to fire it.
 *
 * Built on a ref, not a motion library: the row's transform is written on each
 * pointermove, so a quick flick tracks the finger exactly and can't be starved
 * by the frequent re-renders these screens do while data loads. Under the
 * threshold it springs back; past it, the row slides out and the action runs.
 *
 * Horizontal intent only: a mostly-vertical drag is ignored so the page can
 * still scroll normally.
 */
export default function SwipeAction({
  children, onAction, color = '#FF453A', icon, label = 'Delete',
  direction = 'left', threshold = 96, borderRadius = 12,
}) {
  const frontRef = React.useRef(null);
  const start = React.useRef({ x: 0, y: 0 });
  const dx = React.useRef(0);
  const active = React.useRef(false);
  const locked = React.useRef(null); // null until axis is decided: 'x' or 'y'
  const [revealed, setRevealed] = React.useState(0); // 0..1 for the action layer

  const sign = direction === 'left' ? -1 : 1;
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const setX = (x) => {
    if (frontRef.current) frontRef.current.style.transform = `translateX(${x}px)`;
    setRevealed(Math.min(Math.abs(x) / threshold, 1));
  };

  const onDown = (e) => {
    if (reduce) return;
    active.current = true;
    locked.current = null;
    start.current = { x: e.clientX, y: e.clientY };
    if (frontRef.current) frontRef.current.style.transition = 'none';
  };
  const onMove = (e) => {
    if (!active.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (locked.current === null) {
      // Decide the axis once, after a little movement.
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      locked.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    }
    if (locked.current !== 'x') return;
    // Only allow swiping in the action direction; the other way rubber-bands.
    let move = mx;
    if (Math.sign(mx) !== sign) move = mx * 0.25;
    dx.current = move;
    setX(move);
  };
  const onUp = () => {
    if (!active.current) return;
    active.current = false;
    const passed = Math.sign(dx.current) === sign && Math.abs(dx.current) >= threshold;
    if (frontRef.current) {
      frontRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
      if (passed) {
        // Slide the row fully out, then run the action.
        frontRef.current.style.transform = `translateX(${sign * 400}px)`;
        setRevealed(1);
        setTimeout(() => onAction?.(), 220);
      } else {
        frontRef.current.style.transform = 'translateX(0)';
        setRevealed(0);
      }
    }
    dx.current = 0;
  };

  return (
    <Box sx={{ position: 'relative', borderRadius: `${borderRadius}px`, overflow: 'hidden' }}>
      {/* Action layer, revealed as the row moves off it */}
      <Box
        sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: direction === 'left' ? 'flex-end' : 'flex-start',
          px: 3, gap: 1, backgroundColor: color,
          opacity: revealed, transition: 'opacity 120ms linear',
        }}
      >
        {icon}
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
      </Box>
      {/* The row itself */}
      <Box
        ref={frontRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        sx={{ position: 'relative', touchAction: 'pan-y', willChange: 'transform', backgroundColor: 'background.paper' }}
      >
        {children}
      </Box>
    </Box>
  );
}
