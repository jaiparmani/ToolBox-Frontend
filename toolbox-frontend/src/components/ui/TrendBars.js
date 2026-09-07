import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { chart, radius } from '../../theme/tokens';
import { money, moneySmart } from './money';
import BarGrow from './BarGrow';
import { srOnly } from './StatusBadge';

/**
 * Daily spend across a month, as a compact bar row.
 *
 * Form: change over a fixed set of days → bars, one per day. Not a line,
 * because days with no spend are real zeros worth seeing as gaps, not
 * interpolated over. One hue (magnitude is the whole story); the busiest day is
 * marked directly and the rest carry their figure in the tooltip.
 *
 * What changed:
 *
 * - **Growth comes from `BarGrow`.** This file used to hand-roll a `growUp`
 *   keyframe with its own 520ms and its own inlined bezier — a second motion
 *   feel sitting next to the one every other bar chart uses. It now shares the
 *   kit's spring, its stagger, and its `once: true` viewport rule, so a row of
 *   bars lands like a wave here exactly as it does elsewhere.
 * - **The figures have a text path.** The values lived only inside a hover
 *   tooltip: unreachable on a phone, invisible to a screen reader, and gone
 *   entirely for anyone not using a mouse. The row is now a labelled `img` with
 *   a summary, backed by a visually-hidden list of every day and its exact
 *   amount — the brief's rule that no number may exist only inside motion.
 * - **The peak is marked, not just mentioned.** The header always said "peak
 *   ₹X" while every bar looked identical; the tallest bar now carries the full
 *   hue and the rest sit back, so the sentence and the picture agree.
 */
export default function TrendBars({
  data,
  title = 'Daily spend',
  formatValue = moneySmart,
  formatFull = money,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hue = isDark ? chart.sequential.dark : chart.sequential.light;
  const track = isDark ? chart.gridline.dark : chart.gridline.light;

  const days = (data || []).map((d) => ({ date: d.date, value: Number(d.total) || 0 }));
  // No data is not an empty chart; it is no chart. The caller's own empty state
  // carries on instead of a row of nothing implying a row of zeros.
  if (!days.length) return null;

  const peak = Math.max(...days.map((d) => d.value), 1);
  const peakDay = days.reduce((a, b) => (b.value > a.value ? b : a), days[0]);
  const active = days.filter((d) => d.value > 0).length;

  const labelFor = (date) => {
    const d = new Date(date);
    return Number.isNaN(d.getTime())
      ? String(date)
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const summary = `${title}: ${days.length} days, ${active} with activity, peaking at ${formatFull(peakDay.value)} on ${labelFor(peakDay.date)}.`;

  return (
    <Box>
      <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.01em' }}>
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
        >
          peak {formatValue(peakDay.value)}
        </Typography>
      </Box>

      <Box
        role="img"
        aria-label={summary}
        sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 96 }}
      >
        {days.map((d, i) => {
          const isPeak = d.date === peakDay.date && d.value > 0;
          const h = Math.max((d.value / peak) * 100, d.value > 0 ? 6 : 2);
          return (
            <Tooltip key={d.date} title={`${labelFor(d.date)}: ${formatFull(d.value)}`} placement="top" arrow>
              {/* Tooltip needs a ref-holding child; BarGrow is a plain function
                  component, so the hit target is this column and the bar grows
                  inside it. The column is full height, so the tooltip is
                  reachable anywhere above a short bar too. */}
              <Box
                sx={{
                  flex: 1, minWidth: 4, height: '100%',
                  display: 'flex', alignItems: 'flex-end', cursor: 'default',
                }}
              >
                <BarGrow
                  heightPct={h}
                  index={i}
                  aria-hidden
                  sx={{
                    width: '100%',
                    borderRadius: `${radius.sm / 2}px ${radius.sm / 2}px 2px 2px`,
                    backgroundColor: d.value > 0 ? hue : track,
                    // The peak reads at full strength; the rest sit back a step
                    // so the tallest bar is where the eye lands first.
                    opacity: d.value > 0 ? (isPeak ? 1 : 0.72) : 0.5,
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Every figure in the picture, in text, for anyone who can't hover. */}
      <Box component="ul" sx={{ ...srOnly, m: 0, p: 0 }}>
        {days.map((d) => (
          <li key={d.date}>{labelFor(d.date)}: {formatFull(d.value)}</li>
        ))}
      </Box>
    </Box>
  );
}
