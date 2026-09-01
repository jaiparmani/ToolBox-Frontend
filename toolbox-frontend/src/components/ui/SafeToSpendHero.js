import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';

/**
 * Safe To Spend — the one number the whole app answers. Restraint version: the
 * figure carries itself at scale, on a flat surface. No aura, glow, sheen, or
 * gradient — hierarchy is size and space; colour appears only when the number
 * is negative (semantic) or as a small runway status dot. The figure counts to
 * its true value and stays honest; the full working lives in Money Pulse below.
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
