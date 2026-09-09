import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useReducedMotion } from 'framer-motion';
import ActivityCategoryChips from './ActivityCategoryChips';
import { money } from './money';
import { feedback } from './feedback';
import { accents, chart, motion as motionTokens, radius, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums' };

/** Anything under this share of the period is folded into one "Other" band. */
const MIN_SHARE = 0.015;
/** How far the finger's influence reaches, in segments. */
const FALLOFF = 1.9;
/** How far the un-focused bands neck down while a finger is on the bar. */
const NECK = 0.5;

/** Progressive resistance past an edge — Apple Design §9. */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Where the period's money actually went — one bar, and a way to grab it.
 *
 * This is the only figure on the Activity tab that covers the whole scope
 * rather than the page of rows on screen: `summary.categoryBreakdown` is the
 * server's own per-category total for the same date window the list is
 * filtered to. Each band's width is `that category ÷ the sum of the bands`,
 * and nothing else about a band is ever scaled by data, so the widths are the
 * one and only claim the graphic makes.
 *
 * Apple Design §2/§8/§9/§13 are what make it a control rather than a picture.
 * Put a finger anywhere on it and the readout tracks 1:1 from the first pixel
 * (§2) — no wait for a release. The bands away from the finger neck down and
 * dim in proportion to their distance from it, so the bar visibly grows toward
 * the touch and you can see which category you are about to land on before you
 * land on it (§8); *width never moves*, because width is the data. Dragging
 * past either end rubber-bands the readout rather than pinning it dead (§9),
 * and each new band crossed fires one tick of haptic, on the crossing itself
 * (§13 causality). Releasing on a band filters the stream to that category —
 * the same `filters.category` the chips drove, so this is not a second,
 * competing way to set the same thing; it is the same one, with the magnitude
 * added.
 *
 * Every figure it draws is also written out: the total sits above the bar, the
 * largest (or selected) band is named with its exact amount and share below it,
 * and every band is a focusable button whose accessible name carries its own
 * amount and share. Continuous work is written straight to `style.transform`
 * on the pointer event, so it survives a throttled tab and never touches
 * layout.
 *
 * Fallbacks: no breakdown (summary still loading, or a scope with no spending)
 * falls back to the plain category chips, so filtering never disappears;
 * `prefers-reduced-motion` drops the bloom, the necking and the finger
 * tracking, leaving a static bar whose bands are still tappable and still
 * carry every number.
 */
export default function ActivityComposition({
  breakdown,
  categories = [],
  selected = '',
  onSelect,
  scopeLabel,
}) {
  const reduce = useReducedMotion();
  const theme = useTheme();
  const palette = chart.categorical[theme.palette.mode] || chart.categorical.dark;
  const trackRef = React.useRef(null);
  const bandRefs = React.useRef([]);
  const bubbleRef = React.useRef(null);
  const activeRef = React.useRef(-1);
  const draggingRef = React.useRef(false);
  const [active, setActive] = React.useState(-1);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const itemRefs = React.useRef([]);

  // Category id + colour by name: the breakdown is keyed by name, the filter
  // the rest of the page reads is keyed by id.
  const byName = React.useMemo(() => {
    const map = new Map();
    for (const c of categories) if (c?.name) map.set(String(c.name).toLowerCase(), c);
    return map;
  }, [categories]);

  const { bands, total } = React.useMemo(() => {
    const rows = (breakdown || [])
      .map((b) => ({ name: b.name, amount: Math.abs(Number(b.amount) || 0) }))
      .filter((b) => b.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    if (!sum) return { bands: [], total: 0 };

    // Slivers are unreadable and unclickable; folded into one honest band that
    // names its parts in its own accessible label.
    const big = rows.filter((r) => r.amount / sum >= MIN_SHARE);
    const small = rows.filter((r) => r.amount / sum < MIN_SHARE);
    const out = big.map((r, i) => {
      const cat = byName.get(String(r.name).toLowerCase());
      return {
        key: r.name,
        name: r.name,
        amount: r.amount,
        share: r.amount / sum,
        id: cat?.id != null ? String(cat.id) : null,
        color: cat?.color || palette[i % palette.length],
      };
    });
    if (small.length) {
      const amount = small.reduce((s, r) => s + r.amount, 0);
      out.push({
        key: '__other__',
        name: small.length === 1 ? small[0].name : `${small.length} smaller`,
        amount,
        share: amount / sum,
        id: small.length === 1 ? (byName.get(String(small[0].name).toLowerCase())?.id ?? null) : null,
        parts: small,
        color: null,
      });
    }
    return { bands: out, total: sum };
  }, [breakdown, byName, palette]);

  const selectedIndex = React.useMemo(
    () => (selected ? bands.findIndex((b) => b.id && b.id === String(selected)) : -1),
    [bands, selected],
  );
  const selectedRef = React.useRef(selectedIndex);
  selectedRef.current = selectedIndex;

  // Cumulative left edge of each band, 0..1 — the geometry the pointer maps to.
  const edges = React.useMemo(() => {
    const out = [];
    let acc = 0;
    for (const b of bands) { out.push(acc); acc += b.share; }
    return out;
  }, [bands]);

  /**
   * The single writer of every band's transform. `x` is the pointer's position
   * inside the track in px, or null for "no finger" — in which case the only
   * thing that shapes the bar is which category is currently filtered.
   */
  const paint = React.useCallback((x, width) => {
    const sel = selectedRef.current;
    for (let i = 0; i < bandRefs.current.length; i += 1) {
      const el = bandRefs.current[i];
      if (!el) continue;
      let scale = 1;
      let opacity = 1;
      if (x != null && !reduce && width > 0) {
        const centre = (edges[i] + bands[i].share / 2) * width;
        const reach = Math.max(width * 0.06, 28) * FALLOFF;
        const near = Math.max(0, 1 - Math.abs(x - centre) / reach);
        const eased = near * near;
        scale = NECK + (1 - NECK) * eased;
        opacity = 0.42 + 0.58 * eased;
      } else if (sel >= 0) {
        // A filter is on: the chosen band stays whole, the rest recede so the
        // bar reads as "this slice of the period".
        scale = i === sel ? 1 : 0.55;
        opacity = i === sel ? 1 : 0.32;
      }
      el.style.transform = `scaleY(${scale})`;
      el.style.opacity = String(opacity);
    }
  }, [bands, edges, reduce]);

  React.useEffect(() => { paint(null, 0); }, [paint, selectedIndex]);

  const indexAt = React.useCallback((frac) => {
    for (let i = bands.length - 1; i >= 0; i -= 1) if (frac >= edges[i]) return i;
    return 0;
  }, [bands.length, edges]);

  const track = React.useCallback((clientX) => {
    const el = trackRef.current;
    if (!el) return -1;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    if (!width) return -1;
    const x = clientX - rect.left;

    // §9: past either end the readout resists instead of stopping dead.
    let bubbleX = x;
    if (x < 0) bubbleX = -rubberband(-x, width);
    else if (x > width) bubbleX = width + rubberband(x - width, width);

    const i = indexAt(Math.max(0, Math.min(0.999, x / width)));
    paint(Math.max(0, Math.min(width, x)), width);
    if (bubbleRef.current && !reduce) {
      bubbleRef.current.style.transform = `translate3d(${bubbleX}px, 0, 0)`;
    }
    if (i !== activeRef.current) {
      activeRef.current = i;
      setActive(i);
      // §13 utility: one tick on the crossing itself, and only while a finger
      // is actually on the bar — a mouse skimming past is not a commitment.
      if (draggingRef.current) feedback('snap');
    }
    return i;
  }, [indexAt, paint, reduce]);

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    if (bands.length === 0) return;
    draggingRef.current = true;
    activeRef.current = -1;
    trackRef.current?.setPointerCapture?.(e.pointerId);
    track(e.clientX);
  };

  const onPointerMove = (e) => {
    if (draggingRef.current) { track(e.clientX); return; }
    if (e.pointerType === 'touch') return;
    track(e.clientX);
  };

  const commit = (index) => {
    const band = bands[index];
    if (!band || !band.id) return;
    onSelect?.(String(selected) === band.id ? '' : band.id);
    feedback('open');
  };

  const release = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    trackRef.current?.releasePointerCapture?.(e.pointerId);
    const i = activeRef.current;
    if (i >= 0) commit(i);
    if (e.pointerType !== 'mouse') {
      activeRef.current = -1;
      setActive(-1);
      paint(null, 0);
    }
  };

  const onPointerLeave = () => {
    if (draggingRef.current) return;
    activeRef.current = -1;
    setActive(-1);
    paint(null, 0);
  };

  const onKeyDown = (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(bands.length - 1, focusIndex + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, focusIndex - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = bands.length - 1;
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    itemRefs.current[next]?.focus();
  };

  // No server breakdown for this scope yet — keep the plain chips so category
  // filtering never vanishes while the summary is loading or empty.
  if (bands.length === 0) {
    return (
      <Box data-no-page-drag>
        <ActivityCategoryChips categories={categories} selected={selected} onSelect={onSelect} />
      </Box>
    );
  }

  const shown = active >= 0 ? bands[active] : selectedIndex >= 0 ? bands[selectedIndex] : bands[0];
  const readoutIsLive = active >= 0;

  const labelFor = (b) => (b.parts
    ? `${b.name} categories, ${money(b.amount)}, ${Math.round(b.share * 100)} percent: ${b.parts.map((p) => `${p.name} ${money(p.amount)}`).join(', ')}`
    : `${b.name}, ${money(b.amount)}, ${Math.round(b.share * 100)} percent of ${money(total)}${b.id ? '. Filter the stream to this category' : ''}`);

  return (
    <Box data-no-page-drag sx={{ mb: 2.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.085em',
          textTransform: 'uppercase', color: 'text.disabled', lineHeight: 1.3,
        }} noWrap>
          Where it went{scopeLabel ? ` · ${scopeLabel}` : ''}
        </Typography>
        <Typography sx={{
          ...num, fontSize: 13, fontWeight: 650, flexShrink: 0,
          letterSpacing: '-0.025em', lineHeight: 1.1, color: 'text.secondary',
        }}>
          {money(total)}
        </Typography>
      </Box>

      {/* The gesture surface is taller than the bar it draws, so the target is
          a comfortable one on a phone without the graphic getting heavy. */}
      <Box
        sx={{ position: 'relative', py: 1, touchAction: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      >
        <Box
          ref={trackRef}
          role="group"
          aria-label={`Spending by category${scopeLabel ? ` for ${scopeLabel}` : ''}, ${money(total)} across ${bands.length} bands`}
          sx={{
            position: 'relative', display: 'flex', width: '100%', height: 34,
            borderRadius: `${radius.md}px`, overflow: 'hidden',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
            boxShadow: (t) => t.palette.mode === 'dark'
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.2)'
              : 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 4px rgba(0,0,0,0.06)',
            transformOrigin: 'left center',
            ...(!reduce && {
              animation: `activityCompositionBloom ${motionTokens.slow}ms ${motionTokens.ease} both`,
              '@keyframes activityCompositionBloom': {
                from: { transform: 'scaleX(0)' },
                to: { transform: 'scaleX(1)' },
              },
            }),
          }}
        >
          {bands.map((b, i) => (
            <Box
              key={b.key}
              component="button"
              type="button"
              ref={(node) => { itemRefs.current[i] = node; }}
              tabIndex={i === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(i)}
              onClick={() => commit(i)}
              aria-label={labelFor(b)}
              style={{ width: `${b.share * 100}%` }}
              sx={{
                position: 'relative', height: '100%', flexShrink: 0, minWidth: 0,
                border: 'none', padding: 0, background: 'transparent', font: 'inherit',
                // The whole bar is one continuous gesture; these exist so every
                // band stays reachable from the keyboard.
                pointerEvents: 'none',
                '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: -2 },
              }}
            >
              <Box
                aria-hidden
                ref={(node) => { bandRefs.current[i] = node; }}
                sx={{
                  width: '100%', height: '100%', transformOrigin: 'center',
                  bgcolor: b.color || 'text.disabled',
                  opacity: b.color ? 1 : 0.35,
                  boxShadow: i === 0 ? 'none' : 'inset 1px 0 0 rgba(0,0,0,0.28)',
                  transition: reduce ? 'none' : `transform ${motionTokens.fast}ms ${motionTokens.ease}, opacity ${motionTokens.fast}ms ${motionTokens.ease}`,
                  willChange: 'transform',
                }}
              />
            </Box>
          ))}
        </Box>

        {/* The exact figure for whatever the finger is on. Always mounted so
            the first press has a node to move; parked under reduced motion. */}
        <Box
          ref={bubbleRef}
          aria-hidden
          sx={{
            position: 'absolute', left: 0, top: '100%', mt: 0.5, zIndex: 3,
            pointerEvents: 'none', whiteSpace: 'nowrap',
            transform: 'translate3d(0,0,0)',
            px: 1, py: 0.5, borderRadius: `${radius.md}px`,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            boxShadow: (t) => (t.palette.mode === 'dark' ? '0 6px 20px rgba(0,0,0,0.5)' : '0 6px 20px rgba(0,0,0,0.1)'),
            opacity: readoutIsLive && !reduce ? 1 : 0,
            transition: `opacity ${motionTokens.fast}ms ${motionTokens.ease}`,
          }}
        >
          <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.disabled', lineHeight: 1.3 }}>
            {shown.name}
          </Typography>
          <Typography sx={{ ...num, fontSize: 13, fontWeight: 650, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1.2 }}>
            {money(shown.amount)}
          </Typography>
        </Box>
      </Box>

      {/* The persistent text path to the same numbers — whichever band is under
          the finger, or filtered, or (at rest) the largest one. */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mt: 0.35, minHeight: 18 }}>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', minWidth: 0 }} noWrap>
          <Box component="span" sx={{ fontWeight: 650, color: 'text.primary' }}>{shown.name}</Box>
          {' '}
          <Box component="span" sx={{ ...num, letterSpacing: '-0.01em' }}>{money(shown.amount)}</Box>
          {' · '}
          {Math.round(shown.share * 100)}% of {money(total)}
        </Typography>
        {selectedIndex >= 0 && (
          <Box
            component="button"
            type="button"
            onClick={() => onSelect?.('')}
            sx={{
              flexShrink: 0, border: 'none', background: 'transparent', font: 'inherit', padding: 0,
              cursor: 'pointer', fontSize: 11.5, fontWeight: 650, color: accents.mint,
              '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2, borderRadius: `${radius.sm}px` },
            }}
          >
            Clear filter
          </Box>
        )}
      </Box>
    </Box>
  );
}
