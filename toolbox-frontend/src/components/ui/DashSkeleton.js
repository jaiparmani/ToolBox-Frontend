import React from 'react';
import { Box, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import { accents, motion as motionTokens, radius } from '../../theme/tokens';
import { dashCardSx } from './DashSurface';

/**
 * The dashboard while its two waves of requests are still in flight.
 *
 * Three rules shape everything in this file:
 *
 * 1. **Same geometry as the content it stands in for** (Apple Design §7). Every
 *    placeholder is built from the *actual* numbers its real card uses — the
 *    74px weekday bar track, the 70px trend track, the 84px week-compare track,
 *    the 7-column aspect-1 calendar grid, the same card padding and hairline —
 *    so when data lands the swap is in place and nothing on the page moves.
 *
 * 2. **Never imply a number.** Bars are uniform and flat, blocks carry no
 *    digits, no glyph is ever ₹-shaped. A skeleton that varies its bar heights
 *    is drawing a chart of data it does not have; in a finance app that is a
 *    lie. These read unmistakably as "not yet a value".
 *
 * 3. **Cheap and quiet.** The only thing that animates is `opacity`, staggered
 *    per block so a card breathes as a wave rather than flickering as one
 *    slab — compositor-only, no layout, no per-frame background-position sweep
 *    across a large surface. Under `prefers-reduced-motion` it holds perfectly
 *    still (§14) and still communicates, because the shape alone does the work.
 *
 * Accessibility: everything visual here is `aria-hidden`. A screen reader is
 * told what is happening once, through `<DashLoadingStatus/>`'s live region —
 * never fed a field of meaningless placeholder nodes.
 */

// Derived from the motion scale rather than invented: a slow, calm breath.
const BREATH_MS = motionTokens.slower * 3;

const pulse = (i = 0) => ({
  animation: `dashSkelBreath ${BREATH_MS}ms ${motionTokens.standard} ${(i % 6) * 110}ms infinite`,
  '@keyframes dashSkelBreath': {
    '0%, 100%': { opacity: 0.55 },
    '50%': { opacity: 1 },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.75 },
});

/** One placeholder block. Tone comes from the theme, so light and dark both work. */
export function SkelBlock({ w = '100%', h = 12, r = radius.sm, i = 0, sx }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: w, height: h, flexShrink: 0, borderRadius: `${r}px`,
        bgcolor: 'action.hover', willChange: 'opacity', ...pulse(i), ...sx,
      }}
    />
  );
}

/** The card shell every Dash* card uses — identical border, radius, ground, padding. */
export function SkelCard({ children, sx }) {
  return (
    <Box
      aria-hidden
      sx={{ ...dashCardSx, height: '100%', display: 'flex', flexDirection: 'column', ...sx }}
    >
      {children}
    </Box>
  );
}

/** Eyebrow + optional right-hand readout — the header row every card opens with. */
const SkelHead = ({ right = true, mb = 1.75 }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb, gap: 1 }}>
    <SkelBlock w={92} h={11} r={4} i={0} />
    {right && <SkelBlock w={64} h={11} r={4} i={1} />}
  </Box>
);

/**
 * A flat, uniform bar row on the real track height. Deliberately level: an
 * uneven skeleton chart would read as data.
 */
const SkelBars = ({ track, count = 7, gap = 1, width = '100%' }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: gap }, height: track }}>
    {Array.from({ length: count }).map((_, i) => (
      <Box key={i} sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <SkelBlock w={width} h="34%" r={5} i={i} sx={{ alignSelf: 'flex-end' }} />
      </Box>
    ))}
  </Box>
);

/** Hairline-separated rows — the shape Recent, Bills and Movers all share. */
const SkelRows = ({ n = 5, dot = false }) => (
  <Box>
    {Array.from({ length: n }).map((_, i) => (
      <Box key={i} sx={{
        display: 'flex', alignItems: 'center', gap: 1.3, py: 0.85,
        borderBottom: i === n - 1 ? 'none' : '1px solid', borderColor: 'divider',
      }}>
        {dot && <SkelBlock w={8} h={8} r={2} i={i} />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SkelBlock w={`${52 - (i % 3) * 7}%`} h={12} r={4} i={i} sx={{ mb: 0.5 }} />
          <SkelBlock w={`${28 - (i % 2) * 6}%`} h={10} r={4} i={i + 1} />
        </Box>
        <SkelBlock w={58} h={13} r={4} i={i + 2} />
      </Box>
    ))}
  </Box>
);

// ── Composed placeholders, one per real surface ─────────────────────────────

/**
 * The hero. Mirrors the live hero exactly: date line, greeting, eyebrow, the
 * clamp()-sized figure, the meta row, the micro-stat pair, the pill button —
 * and, on the right, the chart's own 200px box with its two axis captions.
 */
export const HeroSkeleton = () => (
  <Box aria-hidden>
    <SkelBlock w={148} h={12} r={4} i={0} />
    <SkelBlock w={232} h={26} r={6} i={1} sx={{ mt: 0.6 }} />
    <Box sx={{
      display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' },
      gap: { xs: 3, md: 5 }, alignItems: 'center', mt: { xs: 2.5, md: 3 },
    }}>
      <Box>
        <SkelBlock w={120} h={11} r={4} i={0} />
        {/* same clamp as the live figure, so the tallest line in the page keeps its height */}
        <SkelBlock w="72%" h="clamp(54px, 12vw, 78px)" r={12} i={1} sx={{ mt: 1 }} />
        <SkelBlock w={196} h={13} r={4} i={2} sx={{ mt: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 2.5, mt: 1.9 }}>
          {[0, 1].map((k) => (
            <Box key={k}>
              <SkelBlock w={76} h={15} r={4} i={k + 3} />
              <SkelBlock w={52} h={10} r={4} i={k + 4} sx={{ mt: 0.55 }} />
            </Box>
          ))}
        </Box>
        <SkelBlock w={166} h={40} r={999} i={5} sx={{ mt: 3 }} />
      </Box>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <SkelBlock w={128} h={11} r={4} i={0} />
          <SkelBlock w={104} h={11} r={4} i={1} sx={{ display: { xs: 'none', sm: 'block' } }} />
        </Box>
        <SkelBlock w="100%" h={200} r={radius.md} i={2} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
          <SkelBlock w={44} h={10} r={4} i={3} />
          <SkelBlock w={96} h={10} r={4} i={4} />
        </Box>
      </Box>
    </Box>
  </Box>
);

/** DashMonthFlow / the settle card: eyebrow, big figure, 10px bar, 3-up footer. */
export const FigureCardSkeleton = ({ footer = 3 }) => (
  <SkelCard>
    <SkelHead mb={0.75} />
    <SkelBlock w="58%" h={32} r={8} i={2} />
    <SkelBlock w="100%" h={10} r={999} i={3} sx={{ mt: 2 }} />
    {footer > 0 && (
      <Box sx={{ display: 'flex', mt: 2, pt: 1.75, borderTop: '1px solid', borderColor: 'divider' }}>
        {Array.from({ length: footer }).map((_, i) => (
          <Box key={i} sx={{ flex: 1, minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
            <SkelBlock w="76%" h={16} r={4} i={i} />
            <SkelBlock w="46%" h={10} r={4} i={i + 1} sx={{ mt: 0.55 }} />
          </Box>
        ))}
      </Box>
    )}
  </SkelCard>
);

/** DashSpendTrend — 6 columns on its real 70px track, with the label rows. */
export const TrendCardSkeleton = () => (
  <SkelCard>
    <SkelHead mb={2} />
    <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, mb: 0.6 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SkelBlock w={22} h={11} r={4} i={i} />
        </Box>
      ))}
    </Box>
    <SkelBars track={70} count={6} />
    <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, mt: 0.6 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SkelBlock w={24} h={10} r={4} i={i} />
        </Box>
      ))}
    </Box>
    <SkelBlock w="100%" h={11} r={4} i={5} sx={{ mt: 1.9 }} />
  </SkelCard>
);

/** DashPace — figure, the 10px pace track, the two-up caption. */
export const PaceCardSkeleton = () => (
  <SkelCard>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <SkelBlock w={88} h={11} r={4} i={0} />
        <SkelBlock w={172} h={30} r={8} i={1} sx={{ mt: 0.9 }} />
      </Box>
      <SkelBlock w={60} h={26} r={6} i={2} />
    </Box>
    <SkelBlock w="100%" h={10} r={999} i={3} sx={{ mt: 2, mb: 2.25 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <SkelBlock w={168} h={11} r={4} i={4} />
      <SkelBlock w={112} h={11} r={4} i={5} />
    </Box>
  </SkelCard>
);

/** DashWeekdayPattern — 7 columns on its real 74px track. */
export const WeekdayCardSkeleton = () => (
  <SkelCard>
    <SkelHead />
    <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1.25 }, mb: 0.75 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SkelBlock w={20} h={12} r={4} i={i} />
        </Box>
      ))}
    </Box>
    <SkelBars track={74} count={7} gap={1.25} />
    <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1.25 }, mt: 0.75 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SkelBlock w={22} h={11} r={4} i={i} />
        </Box>
      ))}
    </Box>
  </SkelCard>
);

/** DashWeekCompare — headline figure over its real 84px track. */
export const WeekCompareCardSkeleton = () => (
  <SkelCard>
    <SkelHead mb={0.25} />
    <SkelBlock w="44%" h={30} r={8} i={2} sx={{ mb: 1.75 }} />
    <SkelBars track={84} count={7} width="58%" />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
      <SkelBlock w={148} h={11} r={4} i={3} />
      <SkelBlock w={84} h={11} r={4} i={4} />
    </Box>
  </SkelCard>
);

/** DashSpendCalendar — the same 7-column aspect-ratio-1 grid, week for week. */
export const CalendarCardSkeleton = ({ weeks = 5 }) => (
  <SkelCard>
    <SkelHead mb={1.5} />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
          <SkelBlock w={9} h={9} r={3} i={i} />
        </Box>
      ))}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
      {Array.from({ length: weeks * 7 }).map((_, i) => (
        <SkelBlock key={i} w="100%" h="auto" r={5} i={i} sx={{ aspectRatio: '1 / 1' }} />
      ))}
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
      <SkelBlock w={78} h={11} r={4} i={0} />
      <SkelBlock w={96} h={11} r={4} i={1} />
    </Box>
  </SkelCard>
);

/** The "Where it went" donut card — ring plus its legend rows. */
export const DonutCardSkeleton = ({ rows = 5 }) => (
  <SkelCard sx={{ p: { xs: 2, sm: 2.5 } }}>
    <SkelHead mb={1.5} />
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <SkelBlock w={120} h={120} r={999} i={0} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SkelBlock w={8} h={8} r={2} i={i} />
              <SkelBlock w={`${46 - (i % 3) * 8}%`} h={12} r={4} i={i} />
              <Box sx={{ flex: 1 }} />
              <SkelBlock w={52} h={12} r={4} i={i + 1} />
            </Box>
            <SkelBlock w="100%" h={3} r={999} i={i + 2} sx={{ mt: 0.5 }} />
          </Box>
        ))}
      </Box>
    </Box>
  </SkelCard>
);

/** Recent / Upcoming bills / Category movers — a titled list of hairline rows. */
export const ListCardSkeleton = ({ rows = 5, dot = false, pad = 2.5 }) => (
  <SkelCard sx={{ p: { xs: 2, sm: pad } }}>
    <SkelHead mb={1.25} />
    <SkelRows n={rows} dot={dot} />
  </SkelCard>
);

/** The four-up factual strip (transactions / avg / active days / busiest). */
export const RhythmSkeleton = () => (
  <SkelCard sx={{ p: { xs: 1.75, sm: 2.25 }, flexDirection: 'row', alignItems: 'stretch' }}>
    {[0, 1, 2, 3].map((i) => (
      <Box key={i} sx={{
        flex: 1, minWidth: 0, px: { xs: 1, sm: 1.75 },
        borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
      }}>
        <SkelBlock w="70%" h={20} r={5} i={i} />
        <SkelBlock w="52%" h={10} r={4} i={i + 1} sx={{ mt: 0.6 }} />
      </Box>
    ))}
  </SkelCard>
);

// ── Status & error feedback (Apple Design §16: different kinds, said differently)

/**
 * Ongoing status, for eyes and for screen readers.
 *
 * The polite live region is the *only* thing assistive tech hears while the
 * page assembles: one sentence, updated when the picture changes, instead of a
 * hundred nameless placeholder nodes. Visually it stays a whisper until the
 * request is honestly slow, at which point it says so plainly — no spinner
 * theatre, no invented progress.
 */
export function DashLoadingStatus({ loading, slow, secondary }) {
  const message = !loading
    ? 'Dashboard updated.'
    : slow
      ? 'Still loading — the server is taking longer than usual.'
      : secondary
        ? 'Loading income and six-month history…'
        : 'Loading your month…';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, minHeight: 18,
        opacity: loading ? 1 : 0,
        transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {loading && (
        <Box aria-hidden sx={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          bgcolor: slow ? accents.amber : accents.mint,
          ...pulse(0),
        }} />
      )}
      <Typography sx={{
        fontSize: 11.5, letterSpacing: '0.01em',
        color: slow ? accents.amber : 'text.disabled',
      }}>
        {loading ? message : ''}
      </Typography>
    </Box>
  );
}

/**
 * Error, not status: the request came back with nothing, and saying so beats an
 * eternal skeleton. Gives the way out (§16 wayfinding — never trap the user)
 * rather than only naming the problem.
 */
export function DashLoadError({ onRetry }) {
  return (
    <Box
      role="alert"
      sx={{ ...dashCardSx, px: 3, py: { xs: 5, sm: 7 }, textAlign: 'center' }}
    >
      <CloudOffRoundedIcon sx={{ fontSize: 34, color: accents.amber, mb: 1.25 }} />
      <Typography sx={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.01em' }}>
        Couldn’t load this month
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, maxWidth: 340, mx: 'auto', lineHeight: 1.5 }}>
        Your data is safe — we just couldn’t reach the server. Nothing below is missing; it simply hasn’t arrived.
      </Typography>
      <Box
        component="button" type="button" onClick={onRetry}
        sx={{
          mt: 2.5, display: 'inline-flex', alignItems: 'center', gap: 0.75,
          px: 2.25, py: 1.05, borderRadius: 999, cursor: 'pointer',
          border: '1px solid', borderColor: 'divider', bgcolor: 'transparent',
          color: 'text.primary', font: 'inherit', fontSize: 13.5, fontWeight: 600,
          transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, transform ${motionTokens.fast}ms ${motionTokens.ease}`,
          '&:hover': { borderColor: 'text.disabled' },
          '&:active': { transform: 'scale(0.97)' },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:active': { transform: 'none' } },
        }}
      >
        <RefreshRoundedIcon sx={{ fontSize: 17 }} /> Try again
      </Box>
    </Box>
  );
}
