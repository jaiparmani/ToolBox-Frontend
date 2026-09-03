import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { accents, motion, type } from '../../theme/tokens';
import { money, moneySmart } from '../ui/money';
import { ChartContainer } from '../ui';
import InsightsDelta from './InsightsDelta';

/**
 * Where the selected month sits against the months around it.
 *
 * The headline is the month's total spend; the bar row gives it context so a
 * spike or a quiet month reads at a glance. One accent — the selected month is
 * the solid mint bar, the rest are the same hue dimmed back, so the eye lands
 * on "this month" without a second colour. Magnitude is length; the exact
 * figure lives in each bar's tooltip.
 */
export default function InsightsMonthTrend({ months = [], count = 0 }) {
  const rows = months.map((m) => ({ ...m, value: Number(m.value) || 0 }));
  const selectedIdx = rows.findIndex((m) => m.isSelected);
  const selected = selectedIdx >= 0 ? rows[selectedIdx] : rows[rows.length - 1];
  const prev = selectedIdx > 0 ? rows[selectedIdx - 1] : null;
  const peak = Math.max(...rows.map((m) => m.value), 1);

  return (
    <ChartContainer>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.06em' }}>
          Spent in {selected?.label}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
          <Typography sx={{
            fontFamily: type.displayFamily, fontWeight: 700, letterSpacing: '-0.03em',
            fontSize: { xs: '2rem', sm: '2.3rem' }, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {money(selected?.value || 0)}
          </Typography>
          {prev && <InsightsDelta value={selected?.value} prev={prev.value} size="md" />}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {count} {count === 1 ? 'transaction' : 'transactions'}
          {prev ? ` · vs ${moneySmart(prev.value)} last month` : ''}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1, sm: 1.5 }, height: 92 }}>
        {rows.map((m, i) => {
          const h = Math.max((m.value / peak) * 100, m.value > 0 ? 6 : 2);
          return (
            <Tooltip key={m.key} title={`${m.label}: ${money(m.value)}`} placement="top" arrow>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <Box sx={{
                    width: '100%', height: `${h}%`, borderRadius: '6px 6px 3px 3px',
                    backgroundColor: accents.mint,
                    opacity: m.isSelected ? 1 : 0.24,
                    transformOrigin: 'bottom',
                    animation: `insTrendGrow ${motion.slow}ms ${motion.ease} both`,
                    animationDelay: `${i * 45}ms`,
                    '@keyframes insTrendGrow': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }} />
                </Box>
                <Typography sx={{
                  fontSize: 10.5, fontWeight: m.isSelected ? 650 : 500,
                  color: m.isSelected ? 'text.primary' : 'text.disabled', whiteSpace: 'nowrap',
                }}>
                  {m.short}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </ChartContainer>
  );
}
