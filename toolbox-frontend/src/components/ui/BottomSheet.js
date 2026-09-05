import React from 'react';
import { Box, Modal, Fade, Slide, useMediaQuery, useTheme } from '@mui/material';
import { animate, useReducedMotion } from 'framer-motion';
import { radius } from '../../theme/tokens';
import { feedback } from './feedback';

/**
 * Apple's momentum-projection function (Designing Fluid Interfaces, WWDC 2018).
 * Returns the distance the element would coast given an initial velocity and
 * exponential deceleration — the same physics as native scroll deceleration.
 */
function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Progressive rubber-band resistance. The further past the boundary the user
 * drags, the less the element follows — real things slow before they stop.
 */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * A sheet that slides up from the bottom on phones and becomes a centred
 * dialog on larger screens. The one container for detail sheets, pickers and
 * composers so they share a single motion + scrim treatment.
 *
 * Spring physics: the sheet tracks the finger 1:1, inherits the release
 * velocity into a framer-motion spring, and uses Apple's momentum projection
 * to decide dismiss vs. snap — so a flick always lands where it should.
 */
export default function BottomSheet({ open, onClose, children, maxWidth = 520, sx }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const reduce = useReducedMotion();
  const sheetRef = React.useRef(null);
  const stopRef = React.useRef(null);
  const drag = React.useRef({
    active: false,
    startY: 0,
    dy: 0,
    history: [],        // velocity tracking: last N pointer events
  });

  const springTo = (y, velocity = 0) => {
    const el = sheetRef.current;
    if (!el) return;
    if (stopRef.current) stopRef.current();

    if (reduce) {
      el.style.transition = 'transform 200ms ease';
      el.style.transform = `translateY(${Math.max(0, y)}px)`;
      return;
    }

    const controls = animate(
      parseFloat(el.style.transform?.match(/translateY\((.+?)px\)/)?.[1] || '0'),
      Math.max(0, y),
      {
        type: 'spring',
        stiffness: 400,
        damping: 40,
        velocity,
        onUpdate: (v) => {
          el.style.transition = 'none';
          el.style.transform = `translateY(${v}px)`;
        },
        onComplete: () => { stopRef.current = null; },
      }
    );
    stopRef.current = () => controls.stop();
  };

  const setYDirect = (y) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${y}px)`;
  };

  const getVelocity = () => {
    const h = drag.current.history;
    if (h.length < 2) return 0;
    const recent = h.slice(-4);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = last.t - first.t;
    if (dt < 1) return 0;
    return ((last.y - first.y) / dt) * 1000; // px/s
  };

  const onPointerDown = (e) => {
    if (!isPhone || reduce) return;
    const el = sheetRef.current;
    if (el && el.scrollTop > 4) return;

    // Interrupt any running spring — grab from current position
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }

    const currentY = parseFloat(el?.style.transform?.match(/translateY\((.+?)px\)/)?.[1] || '0');

    drag.current = {
      active: true,
      startY: e.clientY - currentY,
      dy: currentY,
      history: [{ y: e.clientY, t: performance.now() }],
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    let dy = e.clientY - drag.current.startY;

    // Rubber-band when dragging above rest position
    if (dy < 0) {
      dy = -rubberband(-dy, window.innerHeight * 0.5);
    }

    drag.current.dy = dy;
    drag.current.history.push({ y: e.clientY, t: performance.now() });
    if (drag.current.history.length > 8) drag.current.history.shift();

    setYDirect(Math.max(dy, -30));
  };

  const onPointerUp = (e) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const dy = drag.current.dy;
    const velocity = getVelocity(); // px/s

    // Project where the sheet would coast to
    const sheetHeight = sheetRef.current?.offsetHeight || 400;
    const projectedEnd = dy + project(velocity);
    const dismissThreshold = sheetHeight * 0.4;

    if (projectedEnd > dismissThreshold) {
      // Dismiss — animate out with inherited velocity, then close
      feedback('snap');
      const el = sheetRef.current;
      if (el && !reduce) {
        const controls = animate(dy, sheetHeight + 40, {
          type: 'spring',
          stiffness: 300,
          damping: 34,
          velocity,
          onUpdate: (v) => {
            el.style.transition = 'none';
            el.style.transform = `translateY(${v}px)`;
          },
          onComplete: () => onClose?.(),
        });
        stopRef.current = () => { controls.stop(); onClose?.(); };
      } else {
        onClose?.();
      }
    } else {
      // Snap back home — spring with inherited velocity
      feedback('tap');
      springTo(0, velocity);
    }
  };

  React.useEffect(() => {
    if (open) {
      if (stopRef.current) { stopRef.current(); stopRef.current = null; }
      const el = sheetRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.transform = 'translateY(0px)';
      }
    }
  }, [open]);

  // Cleanup spring on unmount
  React.useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition
      sx={{ display: 'flex', alignItems: isPhone ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <Slide in={open} direction={isPhone ? 'up' : undefined} timeout={isPhone ? 260 : 0}>
        <Box>
          <Fade in={open} timeout={isPhone ? 0 : 200}>
            <Box ref={sheetRef} sx={{
              width: isPhone ? '100vw' : `min(${maxWidth}px, 92vw)`,
              maxHeight: isPhone ? '92vh' : '88vh', overflowY: 'auto',
              bgcolor: 'background.paper',
              borderRadius: isPhone ? `${radius.xl}px ${radius.xl}px 0 0` : `${radius.lg}px`,
              boxShadow: 24, outline: 'none', p: { xs: 2.5, sm: 3 }, willChange: isPhone ? 'transform' : undefined,
              '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', ...sx,
            }}>
              {isPhone && (
                <Box
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  sx={{ mx: -2.5, mt: -2.5, pt: 1.5, pb: 1, cursor: 'grab', touchAction: 'none' }}
                  aria-label="Drag to dismiss"
                >
                  <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: 'divider', mx: 'auto' }} />
                </Box>
              )}
              {children}
            </Box>
          </Fade>
        </Box>
      </Slide>
    </Modal>
  );
}
