import { useRef, useCallback } from 'react';
import { animate } from 'framer-motion';

/**
 * Instant pointer-down scale response — Apple Design §1 (Response).
 *
 * Returns pointer event handlers that scale an element to `pressScale` on
 * pointer-down (instant, no delay) and spring back on pointer-up. Supports
 * cancel-by-drag-away: if the pointer leaves the element while pressed, the
 * scale springs back without firing the action.
 *
 * The animation targets the element's CSS transform directly (no React state,
 * no re-renders) so it stays on the compositor and runs at 60fps even during
 * heavy renders. Uses a framer-motion spring for the release so the bounce
 * feels physical, not canned.
 *
 * Usage:
 *   const press = usePressSpring();
 *   <Box {...press.bindEvents} ref={press.ref} onClick={handleClick}>
 */
export default function usePressSpring({
  pressScale = 0.97,
  springStiffness = 500,
  springDamping = 30,
  disabled = false,
} = {}) {
  const elRef = useRef(null);
  const stopRef = useRef(null);
  const pressedRef = useRef(false);

  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const scaleDown = useCallback(() => {
    const el = elRef.current;
    if (!el || disabled || reduce) return;
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    el.style.transition = 'transform 60ms ease-out';
    el.style.transform = `scale(${pressScale})`;
  }, [pressScale, disabled, reduce]);

  const springUp = useCallback(() => {
    const el = elRef.current;
    if (!el || disabled) return;

    if (reduce) {
      el.style.transition = 'transform 100ms ease';
      el.style.transform = 'scale(1)';
      return;
    }

    if (stopRef.current) { stopRef.current(); stopRef.current = null; }

    const controls = animate(pressScale, 1, {
      type: 'spring',
      stiffness: springStiffness,
      damping: springDamping,
      onUpdate: (v) => {
        el.style.transition = 'none';
        el.style.transform = `scale(${v})`;
      },
      onComplete: () => {
        el.style.transform = '';
        stopRef.current = null;
      },
    });
    stopRef.current = () => controls.stop();
  }, [pressScale, springStiffness, springDamping, disabled, reduce]);

  const onPointerDown = useCallback((e) => {
    if (disabled) return;
    pressedRef.current = true;
    scaleDown();
  }, [scaleDown, disabled]);

  const onPointerUp = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    springUp();
  }, [springUp]);

  const onPointerLeave = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    springUp();
  }, [springUp]);

  const onPointerCancel = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    springUp();
  }, [springUp]);

  return {
    ref: elRef,
    bindEvents: {
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
  };
}
