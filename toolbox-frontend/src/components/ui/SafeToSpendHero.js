import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, motion as motionTokens, type } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';
import { moneySmart } from './money';

/**
 * Safe To Spend — the one number the whole app answers. Restraint version: the
 * figure carries itself at scale, on a flat surface. No aura, glow, sheen, or
 * gradient — hierarchy is size and space; colour appears only when the number
 * is negative (semantic) or as a small runway status dot. The figure counts to
 * its true value and stays honest; the full working lives in Money Pulse below.
 *
 * One line of context earns its place: today's allowance measured against the
 * pace you actually spend at (`daily_discretionary`), because "₹800" means
 * something different on a ₹400/day habit than on a ₹2,000/day one. Both
 * figures are printed; the bar is only a second reading of them, and it does
 * not appear unless both numbers are really there.
 */
const PULSE_COLOR = {
  calm: accents.mint,
  watchful: accents.amber,
  attention: accents.red,
  opportunity: accents.cyan,
};

export default function SafeToSpendHero({ projection, pulse, loading }) {
  const status = PULSE_COLOR[pulse?.status] || accents.mint;

  if (loading) {
    return <Box sx={{ height: 200, borderRadius: 3, border: '1px solid', borderColor: 'divider', opacity: 0.5 }} />;
  }

  const safe = projection?.safe_to_spend_today;
  const has = safe != null;
  const negative = has && safe < 0;

  return (
    <Box
      sx={{
        textAlign: 'center', px: 3, py: { xs: 4, sm: 5 }, borderRadius: 3,
        border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper',
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>
        Safe to spend today
      </Typography>

      <Typography
        component="div"
        sx={{
          mt: 1.25, fontFamily: type.displayFamily, fontWeight: 700, lineHeight: 0.95,
          letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(3rem, 13vw, 5.5rem)',
          color: negative ? accents.red : 'text.primary',
        }}
      >
        {has ? <AnimatedNumber value={safe} format="money" /> : '—'}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 440, mx: 'auto' }}>
        {!has
          ? 'Add a recurring income or bill to see what today leaves you.'
          : negative
            ? "You're over for today once the bills ahead are counted."
            : `What's left after upcoming bills and your usual pace${
                projection?.next_income_date ? ` — next income ${new Date(projection.next_income_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''
              }.`}
      </Typography>

      <PaceRow safe={safe} typical={projection?.daily_discretionary} tone={negative ? accents.red : status} />

      {projection?.runway_days != null && (
        <Box sx={{ mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: 999, border: '1px solid', borderColor: 'divider' }}>
          <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: status, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {projection.runway_days <= 0 ? 'No runway at this pace' : `~${projection.runway_days} day${projection.runway_days === 1 ? '' : 's'} of runway`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/**
 * Today's allowance against your usual daily pace. The track is two days of the
 * usual pace wide, so "the same as usual" sits at the halfway mark and is
 * readable without a legend; a marker pins the pace itself. Both real figures
 * are printed either side. Nothing is drawn if either is missing.
 */
function PaceRow({ safe, typical, tone }) {
  const s = Number(safe), t = Number(typical);
  if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0) return null;
  const scale = t * 2;                                   // full track = two typical days
  const fill = Math.max(0, Math.min(1, s / scale));      // an over-spent day reads as empty
  return (
    <Box sx={{ mt: 2.5, maxWidth: 340, mx: 'auto' }}>
      <Box sx={{ position: 'relative', height: 4, borderRadius: 999, backgroundColor: 'action.hover', overflow: 'visible' }}>
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%', width: `${fill * 100}%`, backgroundColor: tone, borderRadius: 999,
            transformOrigin: 'left',
            animation: `paceGrow ${motionTokens.slow}ms ${motionTokens.ease} both`,
            '@keyframes paceGrow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }} />
        </Box>
        {/* the pace mark: exactly one typical day */}
        <Box aria-hidden sx={{
          position: 'absolute', left: '50%', top: -3, width: '1px', height: 10,
          backgroundColor: 'text.disabled',
        }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          {s >= t ? 'above' : 'below'} your usual pace
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          usually {moneySmart(t)}/day
        </Typography>
      </Box>
    </Box>
  );
}
