import React from 'react';
import { Box, Collapse, Stack, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { accents, state as stateTokens, motion } from '../../theme/tokens';
import { money } from './money';

/**
 * Money Pulse - the app's ambient read on where you stand right now.
 *
 * Four states from the backend, each with its own calm colour, a slow breathing
 * halo, and a plain-language line. It never says "you should" - it states what
 * the numbers show and, on tap, shows the numbers themselves. That openness is
 * deliberate: this is a read on your data, not advice, and the calculation is
 * always one tap away.
 */
const STATES = {
  calm:        { color: '#30D6A5', label: 'On track', pulse: 5.5 },
  watchful:    { color: accents.amber, label: 'Watchful', pulse: 3.8 },
  attention:   { color: accents.red, label: 'Attention', pulse: 2.6 },
  opportunity: { color: accents.cyan, label: 'Opportunity', pulse: 4.6 },
};

export default function MoneyPulse({ pulse, loading }) {
  const theme = useTheme();
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
        background: `radial-gradient(120% 100% at 0% 0%, ${s.color}22, transparent 60%)`,
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {/* breathing orb */}
          <Box sx={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: s.color, opacity: 0.28,
              animation: `pulseHalo ${s.pulse}s ease-in-out infinite`,
              '@keyframes pulseHalo': { '0%,100%': { transform: 'scale(0.72)', opacity: 0.18 }, '50%': { transform: 'scale(1.15)', opacity: 0.4 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }} />
            <Box sx={{ position: 'absolute', inset: '10px', borderRadius: '50%', backgroundColor: s.color, boxShadow: `0 0 16px ${s.color}88` }} />
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

function Row({ label, value }) {
  return (
    <Box display="flex" justifyContent="space-between" gap={2}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}
