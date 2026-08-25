import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { accents } from '../../theme/tokens';
import { money } from './money';
import AnimatedNumber from './AnimatedNumber';

/**
 * Safe To Spend Hero — the one number the whole app is built to answer, at the
 * scale it deserves. A huge editorial figure, wrapped in the ambient colour of
 * the current Money Pulse state, over a soft state-tinted glow.
 *
 * It is honest by construction: "safe to spend today" is what's left after the
 * bills ahead and your usual pace, derived from recorded activity — the caption
 * says so, and the full working lives in the MoneyPulse panel below it.
 */
const PULSE_COLOR = {
  calm: accents.mint,
  watchful: accents.amber,
  attention: accents.red,
  opportunity: accents.cyan,
};

export default function SafeToSpendHero({ projection, pulse, loading }) {
  const theme = useTheme();
  const color = PULSE_COLOR[pulse?.status] || accents.mint;

  if (loading) {
    return <Box sx={{ height: 200, borderRadius: 5, border: '1px solid', borderColor: 'divider', opacity: 0.5 }} />;
  }

  const safe = projection?.safe_to_spend_today;
  const has = safe != null;
  const negative = has && safe < 0;
  const displayColor = negative ? accents.red : theme.palette.text.primary;

  return (
    <Box
      sx={{
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        px: 3, py: { xs: 4, sm: 5 }, borderRadius: 5,
        border: '1px solid', borderColor: `${color}33`,
        background: `radial-gradient(120% 90% at 50% -10%, ${color}1f, transparent 60%)`,
      }}
    >
      {/* ambient glow behind the number */}
      <Box aria-hidden sx={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}22, transparent 68%)`,
        filter: 'blur(20px)',
      }} />

      <Typography
        variant="overline"
        sx={{ position: 'relative', fontWeight: 750, letterSpacing: '0.14em', color }}
      >
        Safe to spend today
      </Typography>

      <Typography
        component="div"
        sx={{
          position: 'relative', mt: 1, fontWeight: 800, lineHeight: 0.95,
          letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(3.2rem, 15vw, 6rem)', color: displayColor,
        }}
      >
        {has ? <AnimatedNumber value={safe} format="money" /> : '—'}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ position: 'relative', mt: 1.5, maxWidth: 420, mx: 'auto' }}
      >
        {!has
          ? 'Add a recurring income or bill to see what today leaves you.'
          : negative
            ? "You're over for today once the bills ahead are counted."
            : `What's left after upcoming bills and your usual pace${
                projection?.next_income_date ? ` — next income ${new Date(projection.next_income_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''
              }.`}
      </Typography>

      {projection?.runway_days != null && (
        <Box sx={{ position: 'relative', mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: 999, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {projection.runway_days <= 0 ? 'No runway at this pace' : `~${projection.runway_days} day${projection.runway_days === 1 ? '' : 's'} of runway`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
