import React from 'react';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { accents, motion as motionTokens } from '../../theme/tokens';
import { askAffordability } from '../rest/expenseTrackerApis';
import { money } from './money';

/**
 * The money command bar — ask a plain question ("can I afford a ₹200 dinner
 * Friday?") and get an answer computed from the real projection, not the model.
 * The verdict animates in; every figure shown traces to the user's data. Works
 * even without AI configured (the backend falls back to a regex parse).
 *
 * All motion is gated on prefers-reduced-motion.
 */
const PROMPTS = [
  'Can I afford a ₹500 dinner Friday?',
  'Can I spend 2000 this weekend?',
  'Can I afford 1500 tomorrow?',
];

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function MoneyCommandBar({ sx }) {
  const theme = useTheme();
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [placeholder] = React.useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await askAffordability(question));
    } catch (e) {
      setError(e.message || "I couldn't work that out.");
    } finally {
      setLoading(false);
    }
  };

  const tone = result ? (result.affordable ? accents.mint : accents.red) : accents.violet;

  return (
    <Box sx={sx}>
      {/* Input */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.25, borderRadius: 3,
          border: '1px solid', borderColor: loading ? `${accents.violet}88` : 'divider',
          backgroundImage: `radial-gradient(120% 160% at 0% 0%, ${accents.violet}14, transparent 60%)`,
          transition: `border-color ${motionTokens.normal}ms ${motionTokens.ease}`,
        }}
      >
        <AutoAwesomeRoundedIcon sx={{
          color: accents.violet, fontSize: 20, flexShrink: 0,
          ...(loading && !reduce ? { animation: 'cbSpin 1.1s linear infinite', '@keyframes cbSpin': { to: { transform: 'rotate(360deg)' } } } : {}),
        }} />
        <InputBase
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
          placeholder={placeholder}
          fullWidth
          aria-label="Ask whether you can afford something"
          sx={{ fontSize: '1rem', fontWeight: 500 }}
        />
        <Box
          role="button"
          aria-label="Ask"
          onClick={ask}
          sx={{
            flexShrink: 0, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: q.trim() ? accents.violet : 'action.disabledBackground',
            color: q.trim() ? '#fff' : 'text.disabled',
            transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
          }}
        >
          <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
      </Box>

      {/* Result / error */}
      {(result || error) && (
        <Box
          sx={{
            mt: 1.25, p: 2, borderRadius: 3, position: 'relative', overflow: 'hidden',
            border: '1px solid', borderColor: `${error ? accents.amber : tone}55`,
            background: `linear-gradient(120deg, ${error ? accents.amber : tone}18, transparent 78%)`,
            ...(reduce ? {} : {
              animation: `cbReveal ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
              '@keyframes cbReveal': { from: { opacity: 0, transform: 'translateY(10px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
            }),
          }}
        >
          {error ? (
            <Typography variant="body2" color="text.secondary">{error}</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              {result.affordable
                ? <CheckCircleRoundedIcon sx={{ color: tone, fontSize: 30, flexShrink: 0 }} />
                : <CancelRoundedIcon sx={{ color: tone, fontSize: 30, flexShrink: 0 }} />}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 750, fontSize: '1.15rem', color: tone, lineHeight: 1.15 }}>
                  {result.affordable ? 'Yes, you can.' : 'Not comfortably.'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Spending <b>{money(result.amount)}</b>{result.is_today ? ' today' : ` on ${fmtDate(result.date)}`}
                  {result.affordable
                    ? ` leaves ${money(result.projected_low_after.balance)} at your projected low (${fmtDate(result.projected_low_after.date)}).`
                    : ` would dip you to ${money(result.projected_low_after.balance)} by ${fmtDate(result.projected_low_after.date)}.`}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
                  Computed from your projected balance — not a forecast of your real bank account.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
