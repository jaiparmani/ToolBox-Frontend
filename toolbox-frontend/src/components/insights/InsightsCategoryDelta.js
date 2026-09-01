import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { accents, motion, type } from '../../theme/tokens';
import { money, moneySmart } from '../ui/money';
import { ChartContainer } from '../ui';
import InsightsDelta from './InsightsDelta';

/**
 * Where it went — ranked categories for the month, each with its share and how
 * it moved against last month.
 *
 * Magnitude is a single-hue bar (length carries the size; a per-category colour
 * would imply a difference in kind that isn't there). Identity comes from the
 * label plus a small dot in the user's own category colour. The change chip is
 * the only semantic colour: amber when a category grew, mint when it shrank.
 */
export default function InsightsCategoryDelta({ current = [], previous = [], max = 7 }) {
  const prevByName = React.useMemo(() => {
    const map = new Map();
    (previous || []).forEach((c) => map.set(c.category__name || 'Uncategorised', Number(c.total) || 0));
    return map;
  }, [previous]);

  const rows = React.useMemo(() => {
    const mapped = (current || [])
      .map((c) => ({
        name: c.category__name || 'Uncategorised',
        color: c.category__color || null,
        value: Number(c.total) || 0,
        prev: prevByName.get(c.category__name || 'Uncategorised') || 0,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    if (mapped.length <= max) return mapped;
    const head = mapped.slice(0, max - 1);
    const tail = mapped.slice(max - 1);
    return [...head, {
      name: `Other (${tail.length})`, color: null, isOther: true,
      value: tail.reduce((s, d) => s + d.value, 0),
      prev: tail.reduce((s, d) => s + d.prev, 0),
    }];
  }, [current, prevByName, max]);

  if (!rows.length) return null;

  const peak = rows[0].value;
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <ChartContainer title="Where it went" subtitle="Share of the month, and the move vs last month">
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        {rows.map((row, i) => {
          const share = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <Box key={row.name}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 0.6 }}>
                <Box display="flex" alignItems="center" gap={0.9} sx={{ minWidth: 0 }}>
                  <Box aria-hidden sx={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: row.color || 'text.disabled',
                    opacity: row.color ? 1 : 0.5,
                  }} />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{share}%</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.75} sx={{ flexShrink: 0 }}>
                  {!row.isOther && <InsightsDelta value={row.value} prev={row.prev} />}
                  <Typography sx={{
                    fontFamily: type.displayFamily, fontWeight: 650, fontSize: '0.9rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {moneySmart(row.value)}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title={`${row.name}: ${money(row.value)} · ${share}% of the month`} placement="top" arrow>
                <Box sx={{ height: 6, borderRadius: 999, overflow: 'hidden', bgcolor: 'action.hover', cursor: 'default' }}>
                  <Box sx={{
                    height: '100%', width: `${Math.max((row.value / peak) * 100, 2)}%`,
                    borderRadius: 999, backgroundColor: accents.mint, opacity: 1 - i * 0.09,
                    transformOrigin: 'left',
                    animation: `insCatGrow ${motion.slow}ms ${motion.ease} both`,
                    animationDelay: `${i * 55}ms`,
                    '@keyframes insCatGrow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }} />
                </Box>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>
    </ChartContainer>
  );
}
