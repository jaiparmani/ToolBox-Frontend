import React from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { accents, motion } from '../../theme/tokens';
import { money, moneySmart } from './money';

/**
 * Money Pulse - the app's ambient read on where you stand right now.
 *
 * Four states from the backend, each with its own calm colour, a breathing
 * halo, and a plain-language line. It never says "you should" - it states what
 * the numbers show and, on tap, shows the numbers themselves. That openness is
 * deliberate: this is a read on your data, not advice, and the calculation is
 * always one tap away.
 *
 * Urgency is carried by how far the halo swells, not by how fast it beats: a
 * shared, slow period (8s ≈ 0.125Hz) keeps every state clear of the ~0.2Hz band
 * that makes a looping background oscillation uncomfortable to sit next to,
 * while amplitude still separates "on track" from "attention" at a glance.
 *
 * The one figure the card used to bury is now on its face: this week's spend
 * against last week's, both printed, straight from the same inputs the
 * calculation panel lists.
 */
const BREATH_SECONDS = 8;
const STATES = {
  calm:        { color: accents.mint,  label: 'On track',    swell: 0.10 },
  watchful:    { color: accents.amber, label: 'Watchful',    swell: 0.20 },
  attention:   { color: accents.red,   label: 'Attention',   swell: 0.30 },
  opportunity: { color: accents.cyan,  label: 'Opportunity', swell: 0.15 },
};

export default function MoneyPulse({ pulse, loading }) {
  const [open, setOpen] = React.useState(false);

  if (loading) {
    return <Box sx={{ height: 132, borderRadius: 4, border: '1px solid', borderColor: 'divider' }} />;
  }
  if (!pulse) return null;

  const s = STATES[pulse.status] || STATES.calm;
  const inputs = pulse.inputs || {};

  return (
    <Box
      sx={{
        position: 'relative', borderRadius: 4, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        // ambient tint of the state colour, no hard fill
        background: `radial-gradient(120% 100% at 0% 0%, ${alpha(s.color, 0.13)}, transparent 60%)`,
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {/* breathing orb */}
          <Box sx={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: s.color, opacity: 0.28,
              animation: `pulseHalo ${BREATH_SECONDS}s ease-in-out infinite`,
              '@keyframes pulseHalo': {
                '0%,100%': { transform: `scale(${(1 - s.swell).toFixed(2)})`, opacity: 0.18 },
                '50%': { transform: `scale(${(1 + s.swell).toFixed(2)})`, opacity: 0.4 },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', transform: 'scale(1)' },
            }} />
            <Box sx={{ position: 'absolute', inset: '10px', borderRadius: '50%', backgroundColor: s.color, boxShadow: `0 0 16px ${alpha(s.color, 0.53)}` }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color }}>
              {s.label}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.2 }}>{pulse.headline}</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {pulse.detail}
        </Typography>

        <WeekCompare last={inputs.last_7_days_spend} prior={inputs.prior_7_days_spend} tone={s.color} />

        {/* the calculation, one tap away - never hidden */}
        <Box
          onClick={() => setOpen(o => !o)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.25, cursor: 'pointer', color: 'text.secondary', width: 'fit-content' }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>How this is worked out</Typography>
          <ExpandMoreIcon sx={{ fontSize: 16, transform: open ? 'rotate(180deg)' : 'none', transition: `transform ${motion.normal}ms ${motion.ease}` }} />
        </Box>
        <Collapse in={open}>
          <Stack spacing={0.5} sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Row label="Balance now (recorded)" value={money(inputs.current_balance)} />
            <Row label="Typical daily spend" value={`${money(inputs.daily_discretionary)}/day`} />
            <Row label="Last 7 days vs prior" value={`${money(inputs.last_7_days_spend)} vs ${money(inputs.prior_7_days_spend)}`} />
            {inputs.upcoming_income > 0 && <Row label="Income expected" value={`${money(inputs.upcoming_income)}${inputs.next_income_date ? ` by ${inputs.next_income_date}` : ''}`} />}
            {inputs.upcoming_bills > 0 && <Row label="Bills coming up" value={money(inputs.upcoming_bills)} />}
            {inputs.runway_days != null && <Row label="Projected runway" value={`${inputs.runway_days} days`} />}
            <Typography variant="caption" color="text.disabled" sx={{ pt: 0.5 }}>
              Estimated from your recorded activity — not a forecast of your real bank balance.
            </Typography>
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
}

/**
 * This week against last week — the comparison the headline is usually making,
 * drawn instead of only asserted. Both bars are scaled against the larger of
 * the two real figures, and both figures are printed, so the picture adds a
 * reading rather than replacing one. Renders nothing when either week is
 * missing: no bar without a number behind it.
 */
function WeekCompare({ last, prior, tone }) {
  const a = Number(last), b = Number(prior);
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a <= 0 && b <= 0)) return null;
  const peak = Math.max(a, b, 1);
  const delta = b > 0 ? Math.round(((a - b) / b) * 100) : null;
  const up = a > b;
  const bar = (v, colour, label, amount) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 62, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{
          height: '100%', width: `${Math.max((v / peak) * 100, 2)}%`, borderRadius: 999,
          backgroundColor: colour, transformOrigin: 'left',
          animation: `weekGrow ${motion.slow}ms ${motion.ease} both`,
          '@keyframes weekGrow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 58, textAlign: 'right', flexShrink: 0 }}>
        {moneySmart(amount)}
      </Typography>
    </Box>
  );
  return (
    <Stack spacing={0.6} sx={{ mt: 1.75 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Last 7 days vs the 7 before</Typography>
        {delta != null && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: up ? accents.amber : accents.mint }}>
            {up ? '+' : ''}{delta}%
          </Typography>
        )}
      </Box>
      {bar(a, tone, 'this week', a)}
      {bar(b, 'text.disabled', 'week before', b)}
    </Stack>
  );
}

function Row({ label, value }) {
  return (
    <Box display="flex" justifyContent="space-between" gap={2}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}
