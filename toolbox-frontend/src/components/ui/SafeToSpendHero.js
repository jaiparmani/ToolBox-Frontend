import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { accents, type } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';

/**
 * Safe To Spend Hero — the one number the whole app answers, at the scale it
 * deserves and lit like a reactor. A huge figure in the display face over a
 * slow rotating aura and a pulsing glow tinted by the current Money Pulse
 * state, with a band of light sweeping the surface.
 *
 * Honest by construction: "safe to spend today" is what's left after the bills
 * ahead and your usual pace, derived from recorded activity — the caption says
 * so and the full working lives in the MoneyPulse panel below. Reduced motion
 * stills the aura, glow, and sweep; the figure stays exactly true.
 */
const PULSE_COLOR = {
  calm: accents.mint,
  watchful: accents.amber,
  attention: accents.red,
  opportunity: accents.cyan,
};

export default function SafeToSpendHero({ projection, pulse, loading }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const color = PULSE_COLOR[pulse?.status] || accents.mint;

  if (loading) {
    return <Box sx={{ height: 220, borderRadius: 5, border: '1px solid', borderColor: 'divider', opacity: 0.5 }} />;
  }

  const safe = projection?.safe_to_spend_today;
  const has = safe != null;
  const negative = has && safe < 0;
  const displayColor = negative ? accents.red : theme.palette.text.primary;
  const glow = negative ? accents.red : color;
  const anim = (v) => (reduce ? 'none' : v);

  return (
    <Box
      sx={{
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        px: 3, py: { xs: 4.5, sm: 5.5 }, borderRadius: 5,
        border: '1px solid', borderColor: `${color}3d`,
        background: (t) => t.palette.mode === 'dark'
          ? `radial-gradient(130% 100% at 50% -10%, ${color}22, rgba(16,16,22,0.6) 62%)`
          : `radial-gradient(130% 100% at 50% -10%, ${color}1c, #ffffff 64%)`,
        boxShadow: `inset 0 1px 0 ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)'}, 0 24px 60px -34px ${color}88`,
        '@keyframes reactorSpin': { to: { transform: 'translate(-50%, -50%) rotate(360deg)' } },
        '@keyframes heroPulse': { '0%,100%': { opacity: 0.5, transform: 'translateX(-50%) scale(1)' }, '50%': { opacity: 0.85, transform: 'translateX(-50%) scale(1.12)' } },
        '@keyframes heroSheen': { '0%': { transform: 'translateX(-160%) rotate(12deg)' }, '55%,100%': { transform: 'translateX(320%) rotate(12deg)' } },
      }}
    >
      {/* Slow rotating reactor aura */}
      <Box aria-hidden sx={{
        position: 'absolute', top: '38%', left: '50%', width: 460, height: 460, borderRadius: '50%', pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        background: `conic-gradient(from 0deg, transparent 0%, ${color}55 22%, transparent 44%, ${color}33 70%, transparent 92%)`,
        filter: 'blur(34px)', opacity: 0.7,
        animation: anim('reactorSpin 22s linear infinite'),
      }} />
      {/* Pulsing central glow */}
      <Box aria-hidden sx={{
        position: 'absolute', top: '-28%', left: '50%', transform: 'translateX(-50%)',
        width: 340, height: 340, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${glow}33, transparent 66%)`, filter: 'blur(22px)',
        animation: anim('heroPulse 4s ease-in-out infinite'),
      }} />
      {/* Travelling sheen */}
      {!reduce && (
        <Box aria-hidden sx={{
          position: 'absolute', top: -40, bottom: -40, left: 0, width: '38%', pointerEvents: 'none',
          background: `linear-gradient(100deg, transparent, ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)'}, transparent)`,
          animation: 'heroSheen 9s ease-in-out 1.5s infinite',
        }} />
      )}

      <Typography variant="overline" sx={{ position: 'relative', fontWeight: 750, letterSpacing: '0.16em', color, fontFamily: type.displayFamily }}>
        Safe to spend today
      </Typography>

      <Typography
        component="div"
        sx={{
          position: 'relative', mt: 1, fontFamily: type.displayFamily, fontWeight: 700, lineHeight: 0.92,
          letterSpacing: '-0.045em', fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(3.4rem, 16vw, 6.4rem)', color: displayColor,
          textShadow: `0 0 44px ${glow}${theme.palette.mode === 'dark' ? '66' : '3a'}`,
        }}
      >
        {has ? <AnimatedNumber value={safe} format="money" /> : '—'}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ position: 'relative', mt: 1.5, maxWidth: 420, mx: 'auto' }}>
        {!has
          ? 'Add a recurring income or bill to see what today leaves you.'
          : negative
            ? "You're over for today once the bills ahead are counted."
            : `What's left after upcoming bills and your usual pace${
                projection?.next_income_date ? ` — next income ${new Date(projection.next_income_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''
              }.`}
      </Typography>

      {projection?.runway_days != null && (
        <Box sx={{ position: 'relative', mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: 999, border: '1px solid', borderColor: `${color}44`, backgroundColor: `${color}12` }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {projection.runway_days <= 0 ? 'No runway at this pace' : `~${projection.runway_days} day${projection.runway_days === 1 ? '' : 's'} of runway`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
