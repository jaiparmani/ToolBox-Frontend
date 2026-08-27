import React from 'react';
import { Box, Modal, Fade, Slide, useMediaQuery, useTheme } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { radius } from '../../theme/tokens';
import { feedback } from './feedback';

/**
 * A sheet that slides up from the bottom on phones and becomes a centred
 * dialog on larger screens. The one container for detail sheets, pickers and
 * composers so they share a single motion + scrim treatment.
 *
 * On phones it's grabbable: drag the sheet down and it follows your finger,
 * with resistance the further it goes; release past a threshold (or with a
 * flick) and it dismisses, otherwise it springs magnetically home. A soft
 * haptic marks the snap. The transform is written straight to the node, so the
 * drag tracks the finger exactly. Reduced motion keeps the sheet but drops the
 * rubber-banding.
 */
export default function BottomSheet({ open, onClose, children, maxWidth = 520, sx }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const reduce = useReducedMotion();
  const sheetRef = React.useRef(null);
  const drag = React.useRef({ active: false, startY: 0, dy: 0, t0: 0 });

  const setY = (y, withSpring) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = withSpring ? 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none';
    el.style.transform = y > 0 ? `translateY(${y}px)` : 'translateY(0px)';
  };

  const onPointerDown = (e) => {
    if (!isPhone || reduce) return;
    // Don't hijack drags that begin on a scrolled-down scroll area.
    const el = sheetRef.current;
    if (el && el.scrollTop > 4) return;
    drag.current = { active: true, startY: e.clientY, dy: 0, t0: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    let dy = e.clientY - drag.current.startY;
    if (dy < 0) dy = -Math.sqrt(-dy) * 3;   // resist dragging up past the top
    drag.current.dy = dy;
    setY(Math.max(0, dy), false);
  };
  const onPointerUp = (e) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const dy = drag.current.dy;
    const dt = performance.now() - drag.current.t0;
    const velocity = dy / Math.max(dt, 1); // px/ms
    if (dy > 140 || velocity > 0.6) {
      feedback('snap');
      onClose?.();
    } else {
      feedback('tap');
      setY(0, true); // spring magnetically home
    }
  };

  // Reset the transform whenever it reopens, so a prior drag doesn't linger.
  React.useEffect(() => { if (open) setY(0, false); }, [open]);

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
