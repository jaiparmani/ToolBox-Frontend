import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { chart } from '../../theme/tokens';
import { money, moneySmart } from './money';

/**
 * Daily spend across a month, as a compact bar row.
 *
 * Form: change over a fixed set of days → bars, one per day. Not a line,
 * because days with no spend are real zeros worth seeing as gaps, not
 * interpolated over. One hue (magnitude is the whole story); the busiest day
 * is labelled directly and the rest carry their figure in the tooltip.
 */
export default function TrendBars({ data, title = 'Daily spend' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hue = isDark ? chart.sequential.dark : chart.sequential.light;
  const track = isDark ? chart.gridline.dark : chart.gridline.light;

  const days = (data || []).map(d => ({ date: d.date, value: Number(d.total) || 0 }));
  if (!days.length) return null;
  const peak = Math.max(...days.map(d => d.value), 1);
  const peakDay = days.reduce((a, b) => (b.value > a.value ? b : a), days[0]);

  return (
    <Box>
      <Box display="flex" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          peak {moneySmart(peakDay.value)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 96 }}>
        {days.map((d) => {
          const h = Math.max((d.value / peak) * 100, d.value > 0 ? 6 : 2);
          const label = new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return (
            <Tooltip key={d.date} title={`${label}: ${money(d.value)}`} placement="top" arrow>
              <Box
                sx={{
                  flex: 1, minWidth: 4, height: `${h}%`, borderRadius: '4px 4px 2px 2px',
                  backgroundColor: d.value > 0 ? hue : track,
                  opacity: d.value > 0 ? 1 : 0.5,
                  transformOrigin: 'bottom',
                  animation: 'growUp 520ms cubic-bezier(0.32,0.72,0,1) both',
                  '@keyframes growUp': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  transition: 'background-color 0.2s ease',
                  cursor: 'default',
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
