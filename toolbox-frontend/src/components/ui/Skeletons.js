import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

/**
 * Placeholders shaped like the content they stand in for.
 *
 * The page used to show stale numbers and then jump when fresh ones landed,
 * which reads as a glitch. Holding the right shape while loading keeps the
 * layout still.
 */

export const SummarySkeleton = () => (
  <Stack direction="row" spacing={1.5} sx={{ overflow: 'hidden' }}>
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} variant="rounded" height={84} sx={{ flex: 1, minWidth: 120, borderRadius: 3 }} />
    ))}
  </Stack>
);

/**
 * Shaped like ExpenseTimeline, not like a generic list: a quiet day header over
 * hairline-separated rows carrying a 9px category dot, a description and its
 * sub-line, and a right-aligned amount. The real rows land in exactly these
 * positions, so the swap from loading to loaded doesn't reflow — the same
 * spatial-consistency rule the rest of this page follows (Apple Design §7).
 *
 * Widths taper down the list so it reads as a stream rather than a repeating
 * pattern, and the pulse is dropped under prefers-reduced-motion (§14).
 */
const stillWhenReduced = {
  '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' }, animation: 'none' },
};

export const ExpenseListSkeleton = ({ rows = 5 }) => (
  <Box>
    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 0.75, sm: 1 }, pb: 1 }}>
      <Skeleton width={72} height={12} sx={stillWhenReduced} />
      <Skeleton width={54} height={12} sx={stillWhenReduced} />
    </Box>
    <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1.5} sx={{ px: { xs: 0.75, sm: 1 }, py: 1.15 }}>
          <Skeleton variant="circular" width={9} height={9} sx={{ flexShrink: 0, ...stillWhenReduced }} />
          <Box flex={1} minWidth={0}>
            <Skeleton width={`${58 - (i % 4) * 8}%`} height={14} sx={stillWhenReduced} />
            <Skeleton width={`${30 - (i % 3) * 5}%`} height={11} sx={stillWhenReduced} />
          </Box>
          <Skeleton width={64} height={16} sx={{ flexShrink: 0, ...stillWhenReduced }} />
        </Box>
      ))}
    </Box>
  </Box>
);

export const BalanceSkeleton = () => (
  <Stack spacing={1.5}>
    <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
    <Skeleton variant="rounded" height={72} sx={{ borderRadius: 3 }} />
  </Stack>
);
