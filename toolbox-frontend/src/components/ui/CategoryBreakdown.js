import React from 'react';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { chart, motion } from '../../theme/tokens';
import { money, moneySmart } from './money';

/**
 * Where the money went, as a ranked bar chart.
 *
 * Form: the question is "which categories are biggest", so this is magnitude
 * plus identity - ranked horizontal bars. Horizontal because category names
 * are words: they read straight, and a phone has vertical room to spare but
 * none sideways for rotated labels.
 *
 * Colour: one hue for every bar. Length already carries the magnitude, so
 * giving each category its own colour would imply a difference in kind that
 * isn't there - and the app's own category colours are user-chosen, so they
 * are not validated for contrast or colour-blind separation. Identity comes
 * from the label on each row instead, which is also why no legend is needed.
 *
 * Every bar is labelled directly, so the chart still works with colour
 * removed entirely.
 *
 * The tooltip carries the exact rupee figure, but a tooltip is a mouse-only
 * affordance: on a phone or with a screen reader it never opens. So each row
 * also prints its share of the total, and carries the exact, unabbreviated
 * amount in a visually-hidden span — the number always exists somewhere a
 * person can actually get to it, not only inside a hover.
 */
export default function CategoryBreakdown({ data, max = 6, title = 'Where it went' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hue = isDark ? chart.sequential.dark : chart.sequential.light;

  const rows = React.useMemo(() => {
    const sorted = [...(data || [])]
      .map(d => ({ label: d.label, value: Number(d.value) || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    if (sorted.length <= max) return sorted;
    // Anything past the cut becomes one "Other" row rather than a long tail
    // of slivers, or - worse - invented colours for a 9th and 10th series.
    const head = sorted.slice(0, max - 1);
    const tail = sorted.slice(max - 1);
    return [...head, { label: `Other (${tail.length})`, value: tail.reduce((s, d) => s + d.value, 0) }];
  }, [data, max]);

  if (!rows.length) return null;

  const peak = rows[0].value;
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Box>
      <Box display="flex" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {moneySmart(total)} total
        </Typography>
      </Box>

      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {rows.map((row, i) => {
          const share = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <Tooltip
              key={row.label}
              // The bar shows proportion; the tooltip carries the exact figure
              // so no row needs a number printed on top of it.
              title={`${row.label}: ${money(row.value)} · ${share}% of the total`}
              placement="top"
              arrow
            >
              <Box component="li" sx={{ cursor: 'default', listStyle: 'none' }}>
                <Box display="flex" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0, pr: 1, fontWeight: 500 }}>
                    {row.label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {share}%
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {moneySmart(row.value)}
                    </Typography>
                  </Box>
                  {/* The exact figure, for anyone who can't reach the tooltip. */}
                  <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                    {money(row.value)}
                  </Box>
                </Box>
                <Box
                  sx={{
                    height: 8, borderRadius: 999, overflow: 'hidden',
                    backgroundColor: isDark ? chart.gridline.dark : chart.gridline.light,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      // Scaled against the largest bar so the comparison uses
                      // the full width even when one category dominates.
                      width: `${Math.max((row.value / peak) * 100, 2)}%`,
                      borderRadius: 999,
                      backgroundColor: hue,
                      // Slight fade down the ranking keeps the eye at the top
                      // without implying six different categories of thing.
                      opacity: 1 - i * 0.1,
                      transformOrigin: 'left',
                      animation: `growBar ${motion.slow}ms ${motion.ease} both`,
                      animationDelay: `${i * 60}ms`,
                      '@keyframes growBar': {
                        from: { transform: 'scaleX(0)' },
                        to: { transform: 'scaleX(1)' },
                      },
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
