import React from 'react';
import { Box, Typography } from '@mui/material';
import { animate } from 'framer-motion';
import { feedback } from './feedback';

/**
 * Apple's momentum projection (WWDC 2018 Designing Fluid Interfaces).
 */
function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Progressive rubber-band resistance at boundaries.
 */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Swipe a row to reveal actions — left for destructive, right for edit.
 *
 * Spring physics: the row tracks the finger 1:1 during the swipe, measures
 * velocity over the last few pointer events, projects where the row would
 * coast to, and decides commit vs. snap-back from the projected endpoint.
 * Snap-back uses a framer-motion spring that inherits the release velocity
 * so there's no seam between finger tracking and animation.
 *
 * Rubber-bands in the wrong direction (dragging right when action is left),
 * fires a haptic at the commit threshold, and respects reduced motion.
 */
export default function SwipeAction({
  children, onAction, onSecondaryAction,
  color = '#FF453A', secondaryColor = '#0A84FF',
  icon, secondaryIcon,
  label = 'Delete', secondaryLabel = 'Edit',
  direction = 'left', threshold = 96, borderRadius = 12,
}) {
  const frontRef = React.useRef(null);
  const stopRef = React.useRef(null);
  const hapticFired = React.useRef(false);
  const state = React.useRef({
    active: false,
    locked: null,
    startX: 0,
    startY: 0,
    dx: 0,
    history: [],
  });
  const [revealed, setRevealed] = React.useState(0);
  const [revealDir, setRevealDir] = React.useState('left');

  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const setX = (x, direct = true) => {
    const el = frontRef.current;
    if (!el) return;
    if (direct) {
      el.style.transition = 'none';
    }
    el.style.transform = `translateX(${x}px)`;
    const abs = Math.abs(x);
    setRevealed(Math.min(abs / threshold, 1));
    setRevealDir(x < 0 ? 'left' : 'right');
  };

  const springTo = (target, velocity = 0, onComplete) => {
    const el = frontRef.current;
    if (!el) { onComplete?.(); return; }
    if (stopRef.current) stopRef.current();

    if (reduce) {
      el.style.transition = 'transform 200ms ease';
      el.style.transform = `translateX(${target}px)`;
      if (onComplete) setTimeout(onComplete, 220);
      return;
    }

    const current = parseFloat(el.style.transform?.match(/translateX\((.+?)px\)/)?.[1] || '0');
    const controls = animate(current, target, {
      type: 'spring',
      stiffness: 420,
      damping: 38,
      velocity,
      onUpdate: (v) => {
        el.style.transition = 'none';
        el.style.transform = `translateX(${v}px)`;
        setRevealed(Math.min(Math.abs(v) / threshold, 1));
      },
      onComplete: () => {
        stopRef.current = null;
        if (target === 0) setRevealed(0);
        onComplete?.();
      },
    });
    stopRef.current = () => controls.stop();
  };

  const getVelocity = () => {
    const h = state.current.history;
    if (h.length < 2) return 0;
    const recent = h.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = last.t - first.t;
    if (dt < 1) return 0;
    return ((last.x - first.x) / dt) * 1000;
  };

  const onDown = (e) => {
    if (reduce) return;
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }

    const currentX = parseFloat(frontRef.current?.style.transform?.match(/translateX\((.+?)px\)/)?.[1] || '0');
    state.current = {
      active: true,
      locked: null,
      startX: e.clientX - currentX,
      startY: e.clientY,
      dx: currentX,
      history: [{ x: e.clientX, t: performance.now() }],
    };
    hapticFired.current = false;
  };

  const onMove = (e) => {
    const s = state.current;
    if (!s.active) return;

    const mx = e.clientX - (s.startX + (s.dx === 0 ? 0 : 0));
    const rawMx = e.clientX - s.startX;
    const my = e.clientY - s.startY;

    if (s.locked === null) {
      if (Math.abs(e.clientX - s.startX - s.dx) < 6 && Math.abs(my) < 6) return;
      s.locked = Math.abs(e.clientX - s.startX - s.dx) > Math.abs(my) ? 'x' : 'y';
    }
    if (s.locked !== 'x') return;

    let move = rawMx;

    // Rubber-band in the non-action direction
    const primarySign = direction === 'left' ? -1 : 1;
    const hasPrimary = !!onAction;
    const hasSecondary = !!onSecondaryAction;

    if (move < 0 && !hasPrimary) {
      move = -rubberband(-move, 200);
    } else if (move > 0 && !hasSecondary) {
      move = rubberband(move, 200);
    }

    // Haptic at threshold crossing
    if (!hapticFired.current && Math.abs(move) >= threshold) {
      hapticFired.current = true;
      feedback('snap');
    }

    s.dx = move;
    s.history.push({ x: e.clientX, t: performance.now() });
    if (s.history.length > 8) s.history.shift();

    setX(move);
  };

  const onUp = (e) => {
    const s = state.current;
    if (!s.active) return;
    s.active = false;

    const dx = s.dx;
    const velocity = getVelocity();
    const projectedEnd = dx + project(velocity);

    // Left swipe (primary action — delete)
    if (dx < 0 && onAction) {
      if (projectedEnd < -threshold) {
        springTo(-400, velocity, () => onAction?.());
        return;
      }
    }

    // Right swipe (secondary action — edit)
    if (dx > 0 && onSecondaryAction) {
      if (projectedEnd > threshold) {
        springTo(400, velocity, () => {
          onSecondaryAction?.();
          setTimeout(() => springTo(0, 0), 100);
        });
        return;
      }
    }

    // Snap back — spring with inherited velocity
    springTo(0, velocity);
  };

  React.useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  const showLeft = revealDir === 'left' && onAction;
  const showRight = revealDir === 'right' && onSecondaryAction;

  return (
    <Box sx={{ position: 'relative', borderRadius: `${borderRadius}px`, overflow: 'hidden' }}>
      {/* Left action layer (swipe left = delete) */}
      {onAction && (
        <Box
          sx={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', px: 3, gap: 1, backgroundColor: color,
            opacity: showLeft ? revealed : 0, transition: 'opacity 80ms linear',
          }}
        >
          {icon}
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{label}</Typography>
        </Box>
      )}

      {/* Right action layer (swipe right = edit) */}
      {onSecondaryAction && (
        <Box
          sx={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-start', px: 3, gap: 1, backgroundColor: secondaryColor,
            opacity: showRight ? revealed : 0, transition: 'opacity 80ms linear',
          }}
        >
          {secondaryIcon}
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{secondaryLabel}</Typography>
        </Box>
      )}

      {/* The row itself — tracks the finger 1:1 */}
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
