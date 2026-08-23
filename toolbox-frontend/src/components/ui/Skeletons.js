import React from 'react';
import { Box, Card, Skeleton, Stack } from '@mui/material';

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

export const ExpenseListSkeleton = ({ rows = 5 }) => (
  <Stack spacing={1}>
    {Array.from({ length: rows }).map((_, i) => (
      <Card key={i} elevation={0} sx={{ p: 1.75, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box flex={1}>
            <Skeleton width="55%" height={20} />
            <Skeleton width="30%" height={16} />
          </Box>
          <Skeleton width={70} height={24} />
        </Box>
      </Card>
    ))}
  </Stack>
);

export const BalanceSkeleton = () => (
  <Stack spacing={1.5}>
    <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
    <Skeleton variant="rounded" height={72} sx={{ borderRadius: 3 }} />
  </Stack>
);
