import React, { useCallback, useId, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { motion as motionTokens, color as colorTokens, radius } from '../../theme/tokens';
import { motion, useReducedMotion } from 'framer-motion';
import { resolveToneColor } from './StatusBadge';

/**
 * A pill segmented control. `options`: [{id, label, color?}]. The active
 * segment fills with its colour (or the primary). Scrolls horizontally when it
 * can't fit, so it never wraps on a phone.
 *
 * What it owes the rest of the app:
 *
 * - **One moving selection, not two fading pills.** The fill is a single
 *   `layoutId` thumb that travels from the old segment to the new one, so the
 *   selection reads as a thing that moved rather than one light going out and
 *   another coming on. Framer animates it with transforms only, and it drops to
 *   an instant swap under `prefers-reduced-motion`.
 * - **A keyboard.** It was a row of `role="button"` divs with no `tabIndex`:
 *   unreachable by keyboard and silent about which one was chosen. It is now a
 *   radiogroup with roving focus and arrow-key navigation, and each segment
 *   reports `aria-checked`.
 * - **Legible labels.** The active label used to be hardcoded white, which is
 *   fine on blue and poor on mint or amber in light mode; the theme now picks
 *   the contrasting ink for whatever colour the caller passed.
 * - **Colours that survive light mode.** A caller passing `accents.mint` gets
 *   the mode-tuned twin instead of the dark-canvas value.
 */
export default function SegmentedControl({ options, value, onChange, ariaLabel = 'Options', sx }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const reduce = useReducedMotion();
  const thumbId = useId();
  const railRef = useRef(null);

  const move = useCallback((delta) => {
    const idx = options.findIndex((o) => o.id === value);
    const next = options[(idx + delta + options.length) % options.length];
    if (next) onChange(next.id);
  }, [options, value, onChange]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  };

  const select = (id, el) => {
    onChange(id);
    // Keep the chosen segment in view when the rail is scrolled — otherwise an
    // arrow-key move can select something sitting off the edge of the phone.
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <Box
      ref={railRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      sx={{
        display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25,
        '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', ...sx,
      }}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const c = resolveToneColor(opt.color, mode) || colorTokens.primary[mode];
        // getContrastText throws on anything it can't parse; fall back to the
        // theme's own contrast ink rather than assuming white reads on it.
        let ink;
        try { ink = theme.palette.getContrastText(c); }
        catch { ink = theme.palette.getContrastText(colorTokens.primary[mode]); }
        return (
          <Box
            key={opt.id}
            role="radio"
            aria-checked={active}
            // Roving tabindex: one stop for the whole group, arrows move within.
            tabIndex={active ? 0 : -1}
            onClick={(e) => select(opt.id, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt.id, e.currentTarget); }
            }}
            sx={{
              position: 'relative', flexShrink: 0, px: 2, py: 0.9,
              borderRadius: `${radius.pill}px`, cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.005em', whiteSpace: 'nowrap',
              border: '1.5px solid', borderColor: active ? 'transparent' : 'divider',
              color: active ? ink : 'text.secondary',
              WebkitTapHighlightColor: 'transparent',
              // Only colour/border cross-fade here; position is the thumb's job,
              // and it moves on transforms.
              transition: `color ${motionTokens.fast}ms ${motionTokens.standard}, border-color ${motionTokens.fast}ms ${motionTokens.standard}`,
              '&:active': { transform: 'scale(0.96)' },
              '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
            }}
          >
            {active && (
              <Box
                component={motion.div}
                layoutId={`segmented-thumb-${thumbId}`}
                aria-hidden
                transition={reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 480, damping: 38 }}
                sx={{
                  position: 'absolute', inset: '-1.5px', zIndex: 0,
                  borderRadius: `${radius.pill}px`, backgroundColor: c,
                }}
              />
            )}
            <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{opt.label}</Box>
          </Box>
        );
      })}
    </Box>
  );
}
