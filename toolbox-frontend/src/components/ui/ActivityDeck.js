import React from 'react';
import { Box, Typography } from '@mui/material';
import { animate, useReducedMotion } from 'framer-motion';
import SectionNav from './SectionNav';
import { feedback } from './feedback';
import { motion as motionTokens, radius, type } from '../../theme/tokens';

/** Apple's momentum projection (Designing Fluid Interfaces, WWDC 2018). */
function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/** Progressive resistance past an edge — Apple Design §9. */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Movement before we commit to "this is a horizontal page drag" (§10). */
const HYSTERESIS = 10;
/** Fraction of the panel the projected endpoint must clear to change section. */
const COMMIT = 0.3;

/**
 * The spring the deck settles on. Critically damped for a tap or a keypress —
 * nothing threw it, so nothing bounces (§4) — and the same shape for a release,
 * where the bounce would come from the inherited velocity rather than from the
 * curve.
 */
const SETTLE = { type: 'spring', stiffness: 420, damping: 42 };

/**
 * A pointer-down that lands on something with its own horizontal meaning must
 * not be stolen: a row that swipes to delete, a bar that scrubs, a text field,
 * or anything that is itself scrollable sideways. Walked once per gesture.
 */
function ownsHorizontal(target, root) {
  let el = target;
  while (el && el !== root) {
    if (el.nodeType === 1) {
      if (el.matches?.('input, textarea, select, [contenteditable="true"], [data-no-page-drag], [role="slider"], [role="tablist"]')) return true;
      const ox = window.getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/** The card shown on the incoming edge while a page drag is in flight. */
function Peek({ section }) {
  if (!section) return null;
  const Icon = section.icon;
  return (
    <Box sx={{
      position: 'sticky', top: 0, height: '100vh', maxHeight: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 1.5, px: 3, textAlign: 'center',
    }}>
      <Box sx={{
        width: 64, height: 64, borderRadius: `${radius.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${section.color}2a, ${section.color}12)`,
        border: '1px solid', borderColor: `${section.color}44`,
        boxShadow: `0 4px 20px ${section.color}22`,
      }}>
        <Icon sx={{ color: section.color, fontSize: 28 }} />
      </Box>
      <Typography sx={{
        fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em',
        lineHeight: 1.15, color: 'text.primary',
      }}>
        {section.label}
      </Typography>
      {section.hint && (
        <Typography sx={{
          fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums',
          fontSize: 13, letterSpacing: '0.005em', color: 'text.disabled', lineHeight: 1.3,
        }}>
          {section.hint}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The four sections as one deck you can throw, rather than four buttons that
 * swap a box.
 *
 * The tab row still does what it did — this adds the gesture underneath it, and
 * every Apple Design chapter it needed:
 *
 * - §2 direct manipulation. A horizontal drag moves the panel 1:1 with the
 *   finger from the first pixel past the 10px hysteresis, offset-respecting,
 *   with `setPointerCapture` so it keeps tracking off the element's bounds.
 * - §8 hint in the direction of the gesture. The incoming edge is not blank:
 *   the destination section's mark, name and its own real headline figure ride
 *   in alongside, so the in-between frames say where you are going.
 * - §6 momentum projection + §5 velocity handoff. On release the resting point
 *   is projected from the release velocity with Apple's exponential-decay
 *   function, the section nearest that projection wins, and the spring that
 *   finishes the travel starts at the finger's exact velocity — no seam.
 * - §9 rubber-banding. At the first or last section the drag resists
 *   progressively instead of stopping dead.
 * - §3 interruptibility. A pointer-down during the fly-out stops it, reads the
 *   live on-screen transform, and hands the panel straight back to the finger.
 *   The section only changes when the travel lands, so grabbing it mid-flight
 *   leaves no half-applied state.
 *
 * Everything continuous is a `translate3d` + `opacity` written straight to the
 * node on the pointer event: no layout per frame, and nothing that a throttled
 * tab can freeze half-done.
 *
 * The gesture is deliberately touch and pen only. A row already owns horizontal
 * swipe, a scrubbable bar owns its own axis, and on a desktop pointer a drag
 * across text means selection — so `ownsHorizontal` yields to those, and a
 * mouse gets the tab row, the arrow keys and the roving tabindex it always had.
 * `prefers-reduced-motion` drops the drag entirely and cross-fades the panel.
 */
export default function ActivityDeck({ value, onChange, sections, children, sx }) {
  const reduce = useReducedMotion();
  const hostRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const peekRef = React.useRef(null);
  const stopRef = React.useRef(null);
  const gesture = React.useRef(null);
  const committedRef = React.useRef(false);
  const mountedRef = React.useRef(false);
  const prevValue = React.useRef(value);
  const [peek, setPeek] = React.useState(null);

  const stop = () => { if (stopRef.current) { stopRef.current(); stopRef.current = null; } };

  const readX = () => {
    const m = wrapRef.current?.style.transform?.match(/translate3d\((-?[\d.]+)px/);
    return m ? parseFloat(m[1]) : 0;
  };

  /** The one writer of the deck's continuous state. */
  const paint = React.useCallback((dx, width, sign) => {
    const wrap = wrapRef.current;
    if (!wrap || !width) return;
    const travelled = Math.min(Math.abs(dx) / width, 1);
    wrap.style.transform = `translate3d(${dx}px, 0, 0)`;
    wrap.style.opacity = String(1 - travelled * 0.5);
    const peekEl = peekRef.current;
    if (peekEl && sign) {
      // A CSS transition here would smooth (i.e. lag) a value that must track
      // the finger exactly; the fade only exists on the way out, in `clear`.
      peekEl.style.transition = 'none';
      peekEl.style.transform = `translate3d(${dx + sign * width}px, 0, 0)`;
      peekEl.style.opacity = String(Math.min(Math.abs(dx) / (width * 0.55), 1));
    }
  }, []);

  const clear = React.useCallback(() => {
    const wrap = wrapRef.current;
    if (wrap) { wrap.style.transform = ''; wrap.style.opacity = ''; }
    const peekEl = peekRef.current;
    if (peekEl) {
      peekEl.style.transition = `opacity ${motionTokens.fast}ms ${motionTokens.ease}`;
      peekEl.style.opacity = '0';
    }
    setPeek(null);
  }, []);

  // Arriving at a section. A drag that has just landed is already at rest, so
  // it only needs its styles released; a tap or a keypress gets a short travel
  // from the side of the row it came from, so the change still reads as
  // movement along the tab row (§7) rather than a blink.
  React.useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;
    if (!mountedRef.current) { mountedRef.current = true; return undefined; }
    if (value === from) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    if (committedRef.current) { committedRef.current = false; clear(); return undefined; }

    const width = wrap.offsetWidth || 1;
    if (reduce) {
      wrap.style.transform = '';
      const controls = animate(0, 1, {
        duration: motionTokens.fast / 1000,
        onUpdate: (v) => { wrap.style.opacity = String(v); },
        onComplete: () => { wrap.style.opacity = ''; },
      });
      return () => controls.stop();
    }
    const dir = value > from ? 1 : -1;
    const start = dir * width * 0.28;
    const controls = animate(start, 0, {
      ...SETTLE,
      onUpdate: (v) => {
        wrap.style.transform = `translate3d(${v}px, 0, 0)`;
        wrap.style.opacity = String(1 - Math.min(Math.abs(v) / width, 1) * 0.5);
      },
      onComplete: () => { wrap.style.transform = ''; wrap.style.opacity = ''; },
    });
    return () => controls.stop();
  }, [value, reduce, clear]);

  React.useEffect(() => () => stop(), []);

  const onPointerDown = (e) => {
    if (reduce) return;
    if (e.pointerType === 'mouse') return;
    const host = hostRef.current;
    if (!host || ownsHorizontal(e.target, host)) return;
    // §3: whatever was flying, take it back from wherever it is right now.
    stop();
    const width = wrapRef.current?.offsetWidth || 0;
    if (!width) return;
    gesture.current = {
      id: e.pointerId,
      originX: e.clientX - readX(),
      startY: e.clientY,
      startRaw: e.clientX,
      axis: null,
      dx: readX(),
      sign: 0,
      width,
      history: [{ x: e.clientX, t: performance.now() }],
    };
  };

  const destinationFor = (sign) => {
    const next = sign > 0 ? value + 1 : value - 1;
    return next >= 0 && next < sections.length ? next : -1;
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;

    if (g.axis === null) {
      const ax = Math.abs(e.clientX - g.startRaw);
      const ay = Math.abs(e.clientY - g.startY);
      if (ax < HYSTERESIS && ay < HYSTERESIS) return;
      // §10: both gestures were live from the first move; now one wins.
      g.axis = ax > ay ? 'x' : 'y';
      if (g.axis === 'x') hostRef.current?.setPointerCapture?.(e.pointerId);
    }
    if (g.axis !== 'x') return;

    let dx = e.clientX - g.originX;
    const sign = dx < 0 ? 1 : -1; // +1 → destination is the section on the right
    const dest = destinationFor(sign);

    if (dest < 0) {
      // §9: nothing that way — resist, don't stop.
      dx = Math.sign(dx) * rubberband(Math.abs(dx), g.width);
      if (g.sign !== 0) { g.sign = 0; setPeek(null); }
    } else if (sign !== g.sign) {
      g.sign = sign;
      setPeek({ index: dest, sign });
    }

    g.dx = dx;
    g.history.push({ x: e.clientX, t: performance.now() });
    if (g.history.length > 8) g.history.shift();
    paint(dx, g.width, g.sign);
  };

  const velocityOf = (g) => {
    const h = g.history;
    if (h.length < 2) return 0;
    const recent = h.slice(-5);
    const dt = recent[recent.length - 1].t - recent[0].t;
    if (dt < 1) return 0;
    return ((recent[recent.length - 1].x - recent[0].x) / dt) * 1000;
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    hostRef.current?.releasePointerCapture?.(e.pointerId);
    if (g.axis !== 'x') return;

    const velocity = velocityOf(g);
    // §6: land where the throw was going, not where the finger let go.
    const projected = g.dx + project(velocity);
    const sign = g.sign;
    const dest = sign ? destinationFor(sign) : -1;
    const wants = dest >= 0
      && (sign > 0 ? projected < -g.width * COMMIT : projected > g.width * COMMIT);

    const settle = (target, onDone) => {
      stop();
      // §5: the spring starts at the finger's exact speed, so there is no seam
      // between the drag and the animation that finishes it.
      const controls = animate(g.dx, target, {
        ...SETTLE,
        velocity,
        onUpdate: (v) => paint(v, g.width, sign || 1),
        onComplete: () => { stopRef.current = null; onDone(); },
      });
      stopRef.current = () => controls.stop();
    };

    if (wants) {
      feedback('snap');
      settle(sign > 0 ? -g.width : g.width, () => {
        // The peek has arrived exactly where the panel belongs; swapping now
        // means the real content lands on the frame the travel ends.
        committedRef.current = true;
        onChange(dest);
      });
      return;
    }
    settle(0, clear);
  };

  const peekSection = peek ? sections[peek.index] : null;

  return (
    <Box sx={sx}>
      <SectionNav value={value} onChange={onChange} sections={sections} />
      <Box
        ref={hostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: 'relative',
          // `clip`, not `hidden`: `hidden` would make this a scroll container
          // and break the day headers' sticky positioning, exactly as it did on
          // the panel this sits inside.
          overflowX: 'clip',
          // Vertical scrolling stays the browser's; the horizontal axis is ours.
          touchAction: 'pan-y',
        }}
      >
        <Box ref={wrapRef} sx={{ willChange: 'transform' }}>
          {children}
        </Box>

        {/* §8: the destination, riding in on the edge you are pulling from. */}
        <Box
          ref={peekRef}
          aria-hidden
          sx={{
            position: 'absolute', inset: 0, zIndex: 1,
            pointerEvents: 'none', opacity: 0, willChange: 'transform',
          }}
        >
          <Peek section={peekSection} />
        </Box>
      </Box>
    </Box>
  );
}
