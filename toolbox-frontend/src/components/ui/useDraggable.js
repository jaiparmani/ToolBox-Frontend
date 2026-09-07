import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { motion as motionTokens, space } from '../../theme/tokens';

/**
 * Pick a fixed floating control up and put it somewhere else.
 *
 * Everything here is the Apple Design motion chapters made concrete, because a
 * thing you can grab is held to a much higher bar than a thing you can only
 * look at — the illusion is that you're moving an object, and every shortcut
 * breaks it:
 *
 *  §1  Response — the press lands on pointer-DOWN, and the element starts
 *      tracking on the very first move past the threshold. Nothing waits for a
 *      click.
 *  §2  Direct manipulation — position is `posAtGrab + (pointer - pointerAtGrab)`,
 *      so the point you grabbed stays under your finger for the whole gesture.
 *      Pointer capture keeps that true after the finger leaves the 40px orb,
 *      which it does immediately.
 *  §3  Interruptibility — a pointer-down mid-flight stops the settle where it
 *      is. Because the springs write `posRef` every frame, the presentation
 *      value *is* the value we resume from; there is no target to snap to.
 *  §4  Springs, critically damped (ζ = 1.0) by default. Stiffness and damping
 *      are derived from a response time taken from the motion tokens rather
 *      than typed in, so this control settles on the same clock as everything
 *      else in the app.
 *  §5  Velocity handoff — the release velocity, measured over the last ~120ms
 *      of real pointer samples, becomes the spring's initial velocity. No seam
 *      between the drag and the animation.
 *  §6  Momentum projection — a flick lands where it was *aimed*: we project the
 *      resting point with Apple's exponential-decay function and choose the
 *      snap edge from there, not from the release point.
 *  §9  Rubber-banding — drag past a boundary and resistance grows; it never
 *      just stops dead.
 *  §10 Hysteresis — 10px of slop before the gesture is a drag at all, so a tap
 *      is still a tap and the assistant still opens.
 *  §14 Reduced motion — the settle becomes an immediate write. Dragging itself
 *      is direct manipulation, not decoration, so it stays.
 *
 * Transform only: the element sits at `left:0; top:0` and is moved entirely by
 * `translate3d`, written straight to the node inside the pointer handler (the
 * house technique — see `MoneyConstellation` / `TiltCard`). No layout property
 * is touched per frame, and nothing depends on `requestAnimationFrame`, which
 * a hidden tab freezes.
 */

// Apple's scroll deceleration rate. 0.998 is the normal "flick a list" feel.
const DECELERATION = 0.998;
// §10: movement below this is a tap, not a drag.
const HYSTERESIS = 10;
// Above this release speed (px/s) the gesture carried momentum, which is the
// only case where §4 permits a little overshoot on the way home.
const FLICK_SPEED = 320;
// How far back we look for release velocity. Long enough to be stable, short
// enough that a pause before letting go reads as "put it down", not "throw it".
const VELOCITY_WINDOW_MS = 120;
// The lift when you pick it up — a real object comes toward you off the surface.
const LIFT_SCALE = 1.06;
// A hard flick hands the spring enough energy to sail a long way past the edge
// before being pulled back. On a full-screen sheet that excursion reads as
// physical; on a 52px chip it reads as the thing falling off the screen. So the
// *handoff* (§5) is capped — while the *projection* (§6) still uses the true
// velocity, which means a flick is still aimed exactly where it was thrown.
const MAX_HANDOFF_SPEED = 1600;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** §6 — where a flick at this velocity would come to rest. */
const project = (velocity, deceleration = DECELERATION) =>
  (velocity / 1000) * (deceleration / (1 - deceleration));

/** §9 — the further past the edge you pull, the less it follows. */
const rubberband = (overshoot, dimension, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

/**
 * Apple parameterises springs as damping ratio + response, not stiffness/mass.
 * Convert, so callers can think in the terms the design language uses and the
 * response can come from a motion token.
 */
function springFor(dampingRatio, responseMs, velocity) {
  const omega = (2 * Math.PI) / (responseMs / 1000);
  return {
    type: 'spring',
    mass: 1,
    stiffness: omega * omega,
    damping: 2 * dampingRatio * omega,
    velocity,
    restDelta: 0.1,
    restSpeed: 2,
  };
}

/**
 * env(safe-area-inset-*) is only knowable to CSS, so ask CSS. One throwaway
 * probe rather than a hard-coded guess at the home indicator's height.
 */
function readSafeInsets() {
  const fallback = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined' || !document.body) return fallback;
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;'
      + 'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);'
      + 'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);';
    document.body.appendChild(probe);
    const cs = window.getComputedStyle(probe);
    const px = (v) => parseFloat(v) || 0;
    const out = {
      top: px(cs.paddingTop), right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom), left: px(cs.paddingLeft),
    };
    probe.remove();
    return out;
  } catch {
    return fallback;
  }
}

/**
 * @param {object}  o
 * @param {string}  o.storageKey     localStorage key for the remembered spot.
 * @param {number}  o.margin         gap kept between the control and the viewport edge.
 * @param {number}  o.reserveBottom  extra bottom chrome to stay clear of (e.g. the mobile tab bar).
 * @param {number}  o.reserveTop     extra top chrome to stay clear of.
 * @param {boolean} o.reduce         prefers-reduced-motion is on.
 * @param {string}  o.label          how the control is named in move announcements.
 * @param {Function} o.onDragCommit  fired once, the instant a press becomes a drag.
 */
export default function useDraggable({
  storageKey,
  margin = space[4],
  reserveBottom = space[2],
  reserveTop = 0,
  reduce = false,
  label = 'Control',
  onDragCommit,
} = {}) {
  const nodeRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const boundsRef = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 });
  const insetsRef = useRef({ top: 0, right: 0, bottom: 0, left: 0 });
  const gestureRef = useRef(null);
  const historyRef = useRef([]);
  const animsRef = useRef([]);
  // True from the moment a gesture crosses the threshold until the click it
  // would otherwise produce has been swallowed.
  const suppressClickRef = useRef(false);

  // Options change with the breakpoint; keep the handlers reading the live set
  // without re-binding every listener.
  const optsRef = useRef(null);
  optsRef.current = { margin, reserveBottom, reserveTop, reduce, label, storageKey, onDragCommit };

  // Only the things the view actually renders differently live in state, and
  // each is set at most once per gesture — never per frame.
  const [edge, setEdge] = useState('left');
  const [atTop, setAtTop] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announceTick = useRef(0);

  // ── Writing ───────────────────────────────────────────────────────────────
  const write = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scaleRef.current.toFixed(4)})`;
  }, []);

  const stopAnimations = useCallback(() => {
    animsRef.current.forEach((a) => { try { a.stop(); } catch { /* already done */ } });
    animsRef.current = [];
  }, []);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const measure = useCallback(() => {
    const el = nodeRef.current;
    if (!el || typeof window === 'undefined') return boundsRef.current;
    const { margin: m, reserveBottom: rb, reserveTop: rt } = optsRef.current;
    const ins = insetsRef.current;
    // offsetWidth/Height are layout sizes — unaffected by the lift scale or by
    // the absolutely-positioned first-run note, which is why both are safe to
    // read mid-gesture.
    const width = el.offsetWidth || 0;
    const height = el.offsetHeight || 0;
    const minX = m + ins.left;
    const minY = m + ins.top + rt;
    boundsRef.current = {
      minX,
      minY,
      maxX: Math.max(minX, window.innerWidth - m - ins.right - width),
      maxY: Math.max(minY, window.innerHeight - m - ins.bottom - rb - height),
      width,
      height,
    };
    return boundsRef.current;
  }, []);

  /**
   * Which side it belongs to, and whether it is sitting high enough that a
   * callout hung above it would run off the top of the screen.
   */
  const syncPlacement = useCallback((x, y) => {
    const b = boundsRef.current;
    const side = x + b.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
    setEdge(side);
    setAtTop(y - b.minY < space[16] + space[6]);
    return side;
  }, []);

  // ── Persistence ───────────────────────────────────────────────────────────
  // Stored as edge + vertical ratio rather than raw pixels: a phone that
  // rotates, or a window that is resized, then keeps the *relationship* the
  // user chose instead of a coordinate that no longer means anything.
  const save = useCallback((x, y) => {
    const key = optsRef.current.storageKey;
    if (!key) return;
    const b = boundsRef.current;
    const side = x + b.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
    const span = b.maxY - b.minY;
    const ratio = span > 0 ? clamp((y - b.minY) / span, 0, 1) : 1;
    try {
      localStorage.setItem(key, JSON.stringify({ edge: side, ratio: Number(ratio.toFixed(4)) }));
    } catch { /* private mode, quota — the control still works, it just forgets */ }
  }, []);

  const load = useCallback(() => {
    const key = optsRef.current.storageKey;
    // Default: bottom-left, exactly where the launcher has always stood.
    const fallback = { edge: 'left', ratio: 1 };
    if (!key) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      if (!v || (v.edge !== 'left' && v.edge !== 'right') || typeof v.ratio !== 'number' || !Number.isFinite(v.ratio)) {
        return fallback;
      }
      return { edge: v.edge, ratio: clamp(v.ratio, 0, 1) };
    } catch {
      return fallback;
    }
  }, []);

  /** Put it where the stored preference says, clamped into the current viewport. */
  const applyStored = useCallback(() => {
    const b = measure();
    const { edge: side, ratio } = load();
    const x = side === 'left' ? b.minX : b.maxX;
    const y = b.minY + ratio * (b.maxY - b.minY);
    posRef.current = { x, y };
    scaleRef.current = 1;
    write();
    syncPlacement(x, y);
  }, [measure, load, write, syncPlacement]);

  // ── Settling ──────────────────────────────────────────────────────────────
  const settleTo = useCallback((targetX, targetY, velocity = { x: 0, y: 0 }, momentum = false) => {
    stopAnimations();
    const { reduce: noMotion } = optsRef.current;
    syncPlacement(targetX, targetY);
    save(targetX, targetY);

    if (noMotion) {
      // §14 — arrive, don't travel. Still a change of position, just not a journey.
      posRef.current = { x: targetX, y: targetY };
      scaleRef.current = 1;
      write();
      return;
    }

    // §3 — X and Y are separate springs. One spring over a 2D distance desyncs
    // the moment the two axes carry different velocities, which after a
    // diagonal flick they always do.
    const ratio = momentum ? 0.82 : 1.0;
    const response = motionTokens.slow;
    const start = { ...posRef.current };
    const startScale = scaleRef.current;

    animsRef.current = [
      animate(start.x, targetX, {
        ...springFor(ratio, response, velocity.x),
        onUpdate: (v) => { posRef.current.x = v; write(); },
      }),
      animate(start.y, targetY, {
        ...springFor(ratio, response, velocity.y),
        onUpdate: (v) => { posRef.current.y = v; write(); },
      }),
      animate(startScale, 1, {
        ...springFor(1.0, motionTokens.normal, 0),
        onUpdate: (v) => { scaleRef.current = v; write(); },
      }),
    ];
  }, [stopAnimations, syncPlacement, save, write]);

  // ── The gesture ───────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button != null && e.button > 0) return;   // left / touch / pen only
    suppressClickRef.current = false;
    // §3 — grabbing something in flight stops it exactly where it is on screen.
    stopAnimations();
    measure();
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
      active: false,
      node: e.currentTarget,
    };
    historyRef.current = [{ t: performance.now(), x: posRef.current.x, y: posRef.current.y }];
  }, [stopAnimations, measure]);

  const onPointerMove = useCallback((e) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.active) {
      // §10 — below the threshold this is still a tap. Nothing moves, so a
      // shaky finger on a button doesn't make the button shiver.
      if (Math.hypot(dx, dy) < HYSTERESIS) return;
      g.active = true;
      suppressClickRef.current = true;
      // Capture *after* we're sure it's a drag: an uncommitted press must stay
      // cancellable by dragging away, which is what the press spring wants.
      try { g.node.setPointerCapture?.(e.pointerId); } catch { /* capture unavailable */ }
      // The press state belongs to the tap that is no longer happening — hand
      // it back before the lift, so the two scales never fight over the node.
      optsRef.current.onDragCommit?.();
      setDragging(true);
      if (!optsRef.current.reduce) {
        scaleRef.current = LIFT_SCALE;   // it comes up off the surface
      }
    }

    // §2 — offset from the grab point, preserved exactly, for the whole gesture.
    const rawX = g.originX + dx;
    const rawY = g.originY + dy;
    const b = boundsRef.current;

    // §9 — soft walls. The resistance is scaled to the *object*, not the
    // viewport: a scroll view can afford to let a whole screen of content pull
    // past the edge, but a 52px chip dragged 300px off-screen just looks
    // broken. Twice its own extent is enough travel to feel the wall.
    const giveX = Math.max(b.width, 1) * 2;
    const giveY = Math.max(b.height, 1) * 2;
    let x = rawX;
    if (rawX < b.minX) x = b.minX - rubberband(b.minX - rawX, giveX);
    else if (rawX > b.maxX) x = b.maxX + rubberband(rawX - b.maxX, giveX);
    let y = rawY;
    if (rawY < b.minY) y = b.minY - rubberband(b.minY - rawY, giveY);
    else if (rawY > b.maxY) y = b.maxY + rubberband(rawY - b.maxY, giveY);

    posRef.current = { x, y };
    write();

    const now = performance.now();
    const h = historyRef.current;
    h.push({ t: now, x, y });
    while (h.length > 2 && now - h[0].t > VELOCITY_WINDOW_MS) h.shift();
  }, [write]);

  const endGesture = useCallback((e) => {
    const g = gestureRef.current;
    if (!g || (e && g.id !== e.pointerId)) return;
    gestureRef.current = null;
    try { g.node?.releasePointerCapture?.(g.id); } catch { /* never captured */ }

    if (!g.active) {
      // It was a tap after all — but a tap that landed on a moving target has
      // stopped it (§3), and something that has been stopped mid-flight is
      // owed a resting place. Without this, pressing a settling launcher and
      // letting go strands it wherever the spring happened to be.
      historyRef.current = [];
      const rest = measure();
      const { x, y } = posRef.current;
      const restX = x + rest.width / 2 < window.innerWidth / 2 ? rest.minX : rest.maxX;
      const restY = clamp(y, rest.minY, rest.maxY);
      if (Math.abs(x - restX) > 0.5 || Math.abs(y - restY) > 0.5) settleTo(restX, restY);
      return;
    }
    setDragging(false);

    // §5 — velocity from real samples over a short window, not a single frame's
    // delta, which is noisy enough to turn a careful placement into a throw.
    const now = performance.now();
    const h = historyRef.current;
    let vx = 0;
    let vy = 0;
    if (h.length >= 2) {
      const first = h[0];
      const last = h[h.length - 1];
      const dt = (last.t - first.t) / 1000;
      // A stale sample means the finger was resting at release: no throw.
      if (dt > 0.008 && now - last.t < VELOCITY_WINDOW_MS) {
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
      }
    }
    historyRef.current = [];

    const b = measure();
    // §6 — snap from where the flick was *going*, not from where it was let go.
    const projectedX = posRef.current.x + project(vx);
    const projectedY = posRef.current.y + project(vy);
    const side = projectedX + b.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
    const targetX = side === 'left' ? b.minX : b.maxX;
    const targetY = clamp(projectedY, b.minY, b.maxY);

    const cap = (v) => clamp(v, -MAX_HANDOFF_SPEED, MAX_HANDOFF_SPEED);
    settleTo(targetX, targetY, { x: cap(vx), y: cap(vy) }, Math.hypot(vx, vy) > FLICK_SPEED);
  }, [measure, settleTo]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  // A pointer gesture can't be the only way to move it. Left/Right park it on
  // that edge; Up/Down nudge it a step at a time. Same physics, same
  // persistence, announced so it isn't a silent change.
  const onKeyDown = useCallback((e) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const b = measure();
    const step = e.shiftKey ? space[16] : space[6];
    let { x, y } = posRef.current;
    let said;
    if (e.key === 'ArrowLeft') { x = b.minX; said = 'moved to the left edge'; }
    else if (e.key === 'ArrowRight') { x = b.maxX; said = 'moved to the right edge'; }
    else if (e.key === 'ArrowUp') { y = clamp(y - step, b.minY, b.maxY); said = y <= b.minY ? 'at the top' : 'moved up'; }
    else { y = clamp(y + step, b.minY, b.maxY); said = y >= b.maxY ? 'at the bottom' : 'moved down'; }
    settleTo(x, y);
    const span = b.maxY - b.minY;
    const down = span > 0 ? Math.round(((y - b.minY) / span) * 100) : 100;
    // The zero-width toggle is not decoration: an identical string is not a DOM
    // change, and a live region that doesn't change is a live region that stays
    // silent — so two presses of the same arrow would announce only once.
    announceTick.current = (announceTick.current + 1) % 2;
    setAnnouncement(`${optsRef.current.label} ${said}, ${down}% down the screen.${'\u200B'.repeat(announceTick.current)}`);
  }, [measure, settleTo]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    insetsRef.current = readSafeInsets();
    applyStored();
  }, [applyStored]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let queued = 0;
    const reflow = () => {
      cancelAnimationFrame(queued);
      // One coalesced pass per resize burst; an orientation change fires a
      // flurry of these and the insets change with it.
      queued = requestAnimationFrame(() => {
        if (gestureRef.current) return;   // don't yank it out of a live grip
        stopAnimations();
        insetsRef.current = readSafeInsets();
        applyStored();
      });
    };
    window.addEventListener('resize', reflow);
    window.addEventListener('orientationchange', reflow);
    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('orientationchange', reflow);
    };
  }, [applyStored, stopAnimations]);

  // Breakpoint flips change reserveBottom; re-place rather than leaving it
  // parked under a tab bar that has just appeared.
  useEffect(() => {
    if (gestureRef.current) return;
    optsRef.current = { ...optsRef.current, margin, reserveBottom, reserveTop };
    applyStored();
  }, [margin, reserveBottom, reserveTop, applyStored]);

  useEffect(() => () => {
    // Unmount mid-drag (the panel opens over it) — drop the animations and the
    // capture rather than leaving the pointer owned by a detached node.
    stopAnimations();
    const g = gestureRef.current;
    if (g) { try { g.node?.releasePointerCapture?.(g.id); } catch { /* gone */ } }
    gestureRef.current = null;
  }, [stopAnimations]);

  /** True if the click that just arrived is the tail of a drag and should die. */
  const consumeDragClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    nodeRef,
    edge,
    atTop,
    dragging,
    announcement,
    consumeDragClick,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endGesture, onPointerCancel: endGesture, onKeyDown },
  };
}
