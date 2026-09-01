import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { accents, motion, type } from '../../theme/tokens';
import { money } from '../ui/money';
import { ChartContainer } from '../ui';

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Which weekdays the money actually leaves on. Aggregates the month's expenses
 * into the seven weekday buckets (Mon-first), so a weekend-heavy or a payday
 * pattern shows up as a shape. Single accent — the heaviest day is the solid
 * mint bar, the rest dimmed; the busiest day is called out in words.
 */
export default function InsightsWeekdayPattern({ expenses = [] }) {
  const totals = React.useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
    (expenses || []).forEach((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      if (Number.isNaN(d.getTime())) return;
      const idx = (d.getDay() + 6) % 7; // JS Sun=0 -> Mon-first
      buckets[idx] += Number(e.amount) || 0;
    });
    return buckets;
  }, [expenses]);

  const peak = Math.max(...totals, 0);
  if (peak <= 0) return null;

  const busiestIdx = totals.indexOf(peak);

  return (
    <ChartContainer title="By day of week" subtitle={`Heaviest on ${LABELS[busiestIdx]}`}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1.25 }, height: 84, mt: 0.5 }}>
        {totals.map((v, i) => {
          const h = Math.max((v / peak) * 100, v > 0 ? 6 : 2);
          return (
            <Tooltip key={LABELS[i]} title={`${LABELS[i]}: ${money(v)}`} placement="top" arrow>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <Box sx={{
                    width: '100%', height: `${h}%`, borderRadius: '5px 5px 2px 2px',
                    backgroundColor: accents.mint, opacity: i === busiestIdx ? 1 : 0.24,
                    transformOrigin: 'bottom',
                    animation: `insWeekGrow ${motion.slow}ms ${motion.ease} both`,
                    animationDelay: `${i * 40}ms`,
                    '@keyframes insWeekGrow': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }} />
                </Box>
                <Typography sx={{
                  fontSize: 10.5, fontWeight: i === busiestIdx ? 650 : 500,
                  color: i === busiestIdx ? 'text.primary' : 'text.disabled',
                  fontFamily: type.displayFamily,
                }}>
                  {LABELS[i]}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </ChartContainer>
  );
}
