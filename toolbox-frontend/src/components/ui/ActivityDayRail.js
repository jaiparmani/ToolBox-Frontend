import React from 'react';
import { Box, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { money } from './money';
import { feedback } from './feedback';
import { accents, motion as motionTokens, radius, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };

/** One slot per day. Fixed height so the rail is a calendar, not a bar chart. */
const SLOT = 18;
/** How far the finger's influence reaches, in slots. */
const FALLOFF = 2.4;
/** Peak thickness multiplier under the finger. */
const LIFT = 2.2;

/** Apple's momentum projection (Designing Fluid Interfaces, WWDC 2018). */
function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Progressive resistance past an edge — Apple Design §9.
 */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * The shape of the period, and a way to grab it.
 *
 * Every day currently in the stream gets one slot; the slot's bar length is
 * that day's real spend as a fraction of the heaviest day shown. Read top to
 * bottom it is the period's spending shape — the same numbers the day headers
 * carry, in one glance.
 *
 * It is also the only thing on this page other than a row you can put a finger
 * on, which is the point (Apple Design §2). Pressing anywhere on the rail jumps
 * the list to that day and then tracks the finger 1:1 the whole way — the page
 * moves *during* the gesture, never only at the end (§1). §8 supplies the
 * hint: bars near the finger thicken and brighten in proportion to their
 * distance from it, so the rail grows toward the touch and you can see where
 * you are about to land before you land there. Length is never touched by that
 * — length is data, thickness is focus. Dragging past either end rubber-bands
 * the readout instead of stopping dead (§9).
 *
 * Everything continuous is written straight to `style.transform` on the pointer
 * event, so it survives a throttled/hidden tab and stays off the layout path.
 *
 * Fallbacks: fewer than three days, or no spending at all, renders null (the
 * timeline is complete without it); `prefers-reduced-motion` drops the
 * magnification and the readout tracking and scrolls without smoothing, while
 * every day stays reachable as a focusable button with the full figure in its
 * accessible name.
 */
export default function ActivityDayRail({ days = [], maxDaySpend = 0, onJump, sx }) {
  const reduce = useReducedMotion();
  const railRef = React.useRef(null);
  const barRefs = React.useRef([]);
  const bubbleRef = React.useRef(null);
  const activeRef = React.useRef(-1);
  const draggingRef = React.useRef(false);
  // Position history along the rail, for the release velocity (§5/§6).
  const historyRef = React.useRef([]);
  const [active, setActive] = React.useState(-1);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const itemRefs = React.useRef([]);

  const usable = days.length >= 3 && maxDaySpend > 0;
  const count = days.length;

  const lengths = React.useMemo(
    () => days.map((d) => (maxDaySpend > 0 ? Math.min((d.spend || 0) / maxDaySpend, 1) : 0)),
    [days, maxDaySpend],
  );

  /** Paint every bar's thickness from the pointer's position (§8). */
  const paint = React.useCallback((pointerY) => {
    for (let i = 0; i < barRefs.current.length; i += 1) {
      const el = barRefs.current[i];
      if (!el) continue;
      const len = lengths[i] || 0;
      if (pointerY == null || reduce) {
        el.style.transform = `scaleX(${len})`;
        el.style.opacity = '';
        continue;
      }
      const centre = i * SLOT + SLOT / 2;
      const near = Math.max(0, 1 - Math.abs(pointerY - centre) / (SLOT * FALLOFF));
      const eased = near * near;
      el.style.transform = `scaleX(${len}) scaleY(${1 + eased * LIFT})`;
      el.style.opacity = String(0.55 + eased * 0.45);
    }
  }, [lengths, reduce]);

  React.useEffect(() => { paint(null); }, [paint]);

  const indexAt = React.useCallback((y) => {
    const i = Math.floor(y / SLOT);
    return Math.max(0, Math.min(count - 1, i));
  }, [count]);

  const track = React.useCallback((clientY, jump) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const y = clientY - rect.top;
    const span = count * SLOT;
    // §9: past either end the readout resists rather than pinning hard.
    let bubbleY = y;
    if (y < 0) bubbleY = -rubberband(-y, span);
    else if (y > span) bubbleY = span + rubberband(y - span, span);

    const i = indexAt(y);
    if (!reduce) paint(Math.max(0, Math.min(span, y)));
    if (bubbleRef.current && !reduce) {
      bubbleRef.current.style.transform = `translate3d(0, ${bubbleY - SLOT}px, 0)`;
    }
    if (jump) {
      historyRef.current.push({ y, t: performance.now() });
      if (historyRef.current.length > 8) historyRef.current.shift();
    }
    if (i !== activeRef.current) {
      activeRef.current = i;
      setActive(i);
      if (jump) {
        feedback('snap');
        onJump?.(days[i]?.key, false);
      }
    }
  }, [count, days, indexAt, onJump, paint, reduce]);

  /** Rail-space velocity in px/s, from the last few pointer samples. */
  const velocityOf = () => {
    const h = historyRef.current;
    if (h.length < 2) return 0;
    const recent = h.slice(-5);
    const dt = recent[recent.length - 1].t - recent[0].t;
    if (dt < 1) return 0;
    return ((recent[recent.length - 1].y - recent[0].y) / dt) * 1000;
  };

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    draggingRef.current = true;
    activeRef.current = -1;
    historyRef.current = [];
    railRef.current?.setPointerCapture?.(e.pointerId);
    track(e.clientY, true);
  };

  const onPointerMove = (e) => {
    if (draggingRef.current) { track(e.clientY, true); return; }
    if (e.pointerType === 'touch') return;
    track(e.clientY, false);
  };

  const release = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    railRef.current?.releasePointerCapture?.(e.pointerId);

    // §6/§5: a flick should throw the list rather than drop it where the
    // finger happened to stop. The release velocity projects a resting point
    // down the rail with Apple's decay function, the day nearest that point
    // wins, and the browser's own smooth scroll carries the remaining travel —
    // so the glide continues at the speed the gesture had. A slow release
    // projects less than half a slot and lands exactly where it already is.
    const v = velocityOf();
    const landing = (activeRef.current >= 0 ? activeRef.current : 0) * SLOT + SLOT / 2 + project(v);
    const target = Math.max(0, Math.min(count - 1, Math.floor(landing / SLOT)));
    if (!reduce && target !== activeRef.current && days[target]) {
      activeRef.current = target;
      setActive(target);
      onJump?.(days[target].key, true);
    }
    historyRef.current = [];

    if (e.pointerType === 'touch') {
      activeRef.current = -1;
      setActive(-1);
      paint(null);
    }
  };

  const onPointerLeave = () => {
    if (draggingRef.current) return;
    activeRef.current = -1;
    setActive(-1);
    paint(null);
  };

  const onKeyDown = (e) => {
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(count - 1, focusIndex + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    itemRefs.current[next]?.focus();
  };

  if (!usable) return null;

  const day = active >= 0 ? days[active] : null;
  const readout = day || days[0];

  return (
    <Box
      data-no-page-drag
      sx={{
        position: 'sticky', top: { xs: 64, md: 76 }, flexShrink: 0, alignSelf: 'flex-start',
        width: 26, ...sx,
      }}
    >
      <Box
        ref={railRef}
        role="group"
        aria-label={`Jump to a day. ${count} days shown, heaviest ${money(maxDaySpend)}.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
        sx={{
          position: 'relative', width: '100%', height: count * SLOT,
          touchAction: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {days.map((d, i) => (
          <Box
            key={d.key || `day-${i}`}
            component="button"
            type="button"
            ref={(node) => { itemRefs.current[i] = node; }}
            tabIndex={i === focusIndex ? 0 : -1}
            onFocus={() => setFocusIndex(i)}
            onClick={() => onJump?.(d.key, !reduce)}
            aria-label={`Jump to ${d.label}, spent ${money(d.spend || 0)}, ${d.count} ${d.count === 1 ? 'transaction' : 'transactions'}`}
            sx={{
              // Pointer work belongs to the rail (one continuous gesture);
              // these exist so every day stays reachable from the keyboard.
              position: 'absolute', left: 0, right: 0, top: i * SLOT, height: SLOT,
              pointerEvents: 'none', border: 'none', background: 'transparent', padding: 0,
              display: 'flex', alignItems: 'center',
              '&:focus-visible': {
                outline: `2px solid ${accents.mint}`, outlineOffset: 1,
                borderRadius: `${radius.sm}px`,
              },
            }}
          >
            <Box
              aria-hidden
              ref={(node) => { barRefs.current[i] = node; }}
              sx={{
                width: '100%', height: 3.5, borderRadius: 999,
                transformOrigin: 'left center',
                transform: `scaleX(${lengths[i] || 0})`,
                background: i === active
                  ? `linear-gradient(90deg, ${accents.mint}, ${accents.cyan})`
                  : undefined,
                bgcolor: i === active ? undefined : 'text.disabled',
                opacity: 0.55,
                boxShadow: i === active ? `0 0 6px ${accents.mint}66` : 'none',
                transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
                willChange: 'transform',
              }}
            />
            {/* A day with no spend still needs a locatable slot; a dot is not a
                magnitude, so it can't be mistaken for one. */}
            {(lengths[i] || 0) === 0 && (
              <Box aria-hidden sx={{
                position: 'absolute', left: 0, top: '50%', mt: '-1.5px',
                width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.4,
              }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Readout — the exact figure for whatever the finger is on. It is always
          mounted (so the first press has a node to position) and only fades in
          once a day is under the pointer. Reduced motion parks it on the slot
          instead of tracking the finger. */}
      <Box
        ref={bubbleRef}
        aria-hidden
        sx={{
          position: 'absolute', left: '100%', top: 0, ml: 0.5, zIndex: 3,
          pointerEvents: 'none', whiteSpace: 'nowrap',
          px: 1, py: 0.5, borderRadius: `${radius.md}px`,
          border: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: (t) => (t.palette.mode === 'dark'
            ? '0 6px 20px rgba(0,0,0,0.5)'
            : '0 6px 20px rgba(0,0,0,0.1)'),
          opacity: day ? 1 : 0,
          transition: `opacity ${motionTokens.fast}ms ${motionTokens.ease}`,
          ...(reduce && { transform: `translate3d(0, ${Math.max(active, 0) * SLOT}px, 0)` }),
        }}
      >
        <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.disabled', lineHeight: 1.3 }}>
          {readout.label}
        </Typography>
        <Typography sx={{ ...num, fontSize: 13, fontWeight: 650, color: 'text.primary', lineHeight: 1.2 }}>
          {money(readout.spend || 0)}
        </Typography>
      </Box>
    </Box>
  );
}
