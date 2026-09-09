import React from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { money } from './money';
import { accents, motion as motionTokens, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums' };

/**
 * The day header for the Activity stream — a label, the day's real net, and a
 * bottom edge that carries the day's weight.
 *
 * Two Apple Design chapters are doing the work here.
 *
 * §12 (materials, scroll-edge effects). The header is transparent while it sits
 * in the flow — floating chrome should only materialise where it actually
 * overlaps content. The instant it pins under the app bar, a translucent layer
 * fades up behind it and a short gradient appears below it, so rows dissolve as
 * they travel underneath instead of colliding with a hard 1px divider. "Pinned"
 * is detected with one IntersectionObserver per header (threshold 1 against a
 * negative top rootMargin) — no scroll listener, no measurement per frame, and
 * the only animated properties are opacity.
 *
 * §15 (typography). The day label is small, so it gets positive tracking and
 * uppercase; the net figure is large, so it gets the display face, tabular
 * figures and negative tracking with tight leading, rather than inheriting the
 * body's letterfit.
 *
 * Data-true: the bottom edge is `this day's spend ÷ the heaviest day currently
 * shown`, with a tick at `the average active day ÷ that same heaviest day`.
 * Both of those figures are real sums over the loaded rows, both are named in
 * the meter's aria-label, and the day's own total plus its biggest single
 * expense stay on screen as text. A day with no spending (income only, or an
 * empty day) draws no meter at all rather than an invented sliver.
 */
export default function ActivityDayHeader({
  dayKey,
  label,
  net,
  count,
  topSpend,
  spend = 0,
  maxDaySpend = 0,
  avgDaySpend = 0,
  onRegister,
  sx,
}) {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const stickyTop = isMd ? 60 : 54;
  const ref = React.useRef(null);
  const [stuck, setStuck] = React.useState(false);

  // Let the day rail find this header so it can scroll the page to it.
  React.useEffect(() => {
    const node = ref.current;
    onRegister?.(dayKey, node);
    return () => onRegister?.(dayKey, null);
  }, [dayKey, onRegister]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // No observer support: keep the material on permanently. The fallback has
    // to stay legible, and an always-solid header is the calm version.
    if (typeof IntersectionObserver === 'undefined') { setStuck(true); return undefined; }
    const io = new IntersectionObserver(
      ([entry]) => setStuck(entry.intersectionRatio < 0.999),
      { threshold: [1], rootMargin: `-${stickyTop + 1}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stickyTop]);

  const meter = maxDaySpend > 0 && spend > 0 ? Math.min(spend / maxDaySpend, 1) : 0;
  const avgMark = maxDaySpend > 0 && avgDaySpend > 0 ? Math.min(avgDaySpend / maxDaySpend, 1) : 0;
  const vsAvg = avgDaySpend > 0 && spend > 0 ? spend / avgDaySpend : 0;
  const heaviest = meter >= 0.999 && spend > 0;
  // Colour is a reading, not decoration: neutral at or under the average day,
  // amber above it, and the single heaviest day in view in red.
  const meterTone = heaviest ? accents.red : vsAvg > 1 ? accents.amber : theme.palette.text.disabled;

  const meterLabel = meter > 0
    ? `Spent ${money(spend)} on ${label}. Heaviest day shown ${money(maxDaySpend)}. Average active day ${money(avgDaySpend)}.`
    : undefined;

  return (
    <Box
      ref={ref}
      sx={{
        position: 'sticky', top: { xs: 54, md: 60 }, zIndex: 2,
        pt: 0.5, pb: 0.9, px: { xs: 0.75, sm: 1 },
        ...sx,
      }}
    >
      {/* §12: the material only exists while the header overlaps content. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute', inset: 0, zIndex: 0,
          backdropFilter: 'blur(18px) saturate(180%)',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(20,20,26,0.82)' : 'rgba(255,255,255,0.86)'),
          opacity: stuck ? 1 : 0,
          transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
          '@media (prefers-reduced-transparency: reduce)': {
            backdropFilter: 'none',
            bgcolor: 'background.paper',
          },
        }}
      />
      {/* §12: a scroll-edge fade under the pinned header instead of a divider. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute', left: 0, right: 0, top: '100%', height: 14, zIndex: 0,
          pointerEvents: 'none',
          background: (t) => `linear-gradient(to bottom, ${t.palette.background.paper}, ${t.palette.background.paper}00)`,
          opacity: stuck ? 1 : 0,
          transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.085em',
            textTransform: 'uppercase', color: 'text.disabled', lineHeight: 1.3,
          }}>
            {label}
          </Typography>
          <Typography sx={{
            ...num, fontSize: 14.5, fontWeight: 600,
            letterSpacing: '-0.025em', lineHeight: 1.1,
            color: net >= 0 ? accents.green : 'text.secondary',
          }}>
            {net >= 0 ? '+' : '−'}{money(Math.abs(net))}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mt: 0.2 }}>
          <Typography sx={{ fontSize: 10.5, letterSpacing: '0.005em', color: 'text.disabled', minWidth: 0 }} noWrap>
            {count} {count === 1 ? 'transaction' : 'transactions'}
            {topSpend > 0 ? ` · max ${money(topSpend)}` : ''}
          </Typography>
          {vsAvg > 0 && (
            <Typography sx={{
              ...num, fontSize: 10.5, fontWeight: 600, flexShrink: 0, letterSpacing: '0.005em',
              color: vsAvg > 1 ? (heaviest ? accents.red : accents.amber) : 'text.disabled',
            }}>
              {vsAvg >= 10 ? Math.round(vsAvg) : vsAvg.toFixed(1)}× avg day
            </Typography>
          )}
        </Box>
      </Box>

      {/* The header's bottom edge IS the day's weight — no separate divider. */}
      {meter > 0 && (
        <Box
          role="img"
          aria-label={meterLabel}
          sx={{
            position: 'absolute', left: { xs: 6, sm: 8 }, right: { xs: 6, sm: 8 }, bottom: 0, height: 4,
            zIndex: 1, borderRadius: 999, overflow: 'hidden',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
          }}
        >
          <Box
            aria-hidden
            style={{ '--activity-day-meter': meter }}
            sx={{
              height: '100%', width: '100%', borderRadius: 999,
              transformOrigin: 'left center',
              transform: 'scaleX(var(--activity-day-meter))',
              background: heaviest
                ? `linear-gradient(90deg, ${accents.red}, ${accents.amber})`
                : vsAvg > 1
                  ? `linear-gradient(90deg, ${accents.amber}cc, ${accents.amber})`
                  : meterTone,
              boxShadow: heaviest ? `0 0 8px ${accents.red}44` : 'none',
              animation: `activityDayMeter ${motionTokens.slow}ms ${motionTokens.ease} both`,
              '@keyframes activityDayMeter': {
                from: { transform: 'scaleX(0)' },
                to: { transform: 'scaleX(var(--activity-day-meter))' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
          {avgMark > 0 && avgMark < 0.995 && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute', top: -1, bottom: -1, left: `${avgMark * 100}%`,
                width: 2, borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
                boxShadow: theme.palette.mode === 'dark' ? '0 0 4px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
