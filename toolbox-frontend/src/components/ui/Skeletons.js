import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { radius } from '../../theme/tokens';
import { STAT_CARD_SX, STAT_LABEL_SX, STAT_VALUE_SX } from './SummaryStrip';

/**
 * Placeholders shaped like the content they stand in for.
 *
 * The page used to show stale numbers and then jump when fresh ones landed,
 * which reads as a glitch. Holding the right shape while loading keeps the
 * layout still.
 *
 * Two rules every block here follows:
 *
 * 1. **Never a value.** A placeholder is always a featureless bar — never a
 *    digit, never a currency mark, never a plausible "₹0". A finance app that
 *    shows a number it does not have has told a lie, however briefly.
 * 2. **The same geometry as the real thing** (Apple Design §7). The summary
 *    placeholder is built from `SummaryStrip`'s own card box and type metrics,
 *    so its height is derived rather than guessed — it cannot drift out of sync
 *    the next time that card's padding changes.
 *
 * Each block is a `role="status"` region so a screen-reader user hears that the
 * page is loading; silence used to be the entire loading experience for them.
 * Reduced motion turns the pulse off at the source (`animation={false}`) rather
 * than trying to override MUI's keyframes from the outside.
 */

/** Shared wrapper: announces the wait, and holds the still/pulsing decision. */
function LoadingRegion({ label, children, sx, ...rest }) {
  return (
    <Box role="status" aria-busy="true" aria-label={label} sx={sx} {...rest}>
      {children}
    </Box>
  );
}

/** Stand-in for <SummaryStrip>. `count` should match the strip it replaces. */
export const SummarySkeleton = ({ count = 4 }) => {
  const reduce = useReducedMotion();
  const anim = reduce ? false : 'pulse';
  return (
    <LoadingRegion
      label="Loading headline figures"
      sx={{ display: 'flex', gap: 1.25, pb: 0.5, overflow: 'hidden' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={STAT_CARD_SX}>
          {/* Same label and value metrics, so both slots occupy the exact line
              boxes the real type will — em heights, not pixel guesses. */}
          <Box sx={STAT_LABEL_SX}>
            <Skeleton animation={anim} width={`${52 + (i % 3) * 10}%`} height="1.3em" sx={{ transform: 'none' }} />
          </Box>
          <Box sx={STAT_VALUE_SX}>
            <Skeleton animation={anim} width="70%" height="1em" sx={{ transform: 'none' }} />
          </Box>
        </Box>
      ))}
    </LoadingRegion>
  );
};

/**
 * Shaped like ExpenseTimeline, not like a generic list: a quiet day header over
 * hairline-separated rows carrying a 9px category dot, a description and its
 * sub-line, and a right-aligned amount. The real rows land in exactly these
 * positions, so the swap from loading to loaded doesn't reflow.
 *
 * Widths taper down the list so it reads as a stream rather than a repeating
 * pattern.
 */
export const ExpenseListSkeleton = ({ rows = 5 }) => {
  const reduce = useReducedMotion();
  const anim = reduce ? false : 'pulse';
  return (
    <LoadingRegion label="Loading transactions">
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 0.75, sm: 1 }, pb: 1 }}>
        <Skeleton animation={anim} width={72} height={12} />
        <Skeleton animation={anim} width={54} height={12} />
      </Box>
      <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1.5} sx={{ px: { xs: 0.75, sm: 1 }, py: 1.15 }}>
            <Skeleton animation={anim} variant="circular" width={9} height={9} sx={{ flexShrink: 0 }} />
            <Box flex={1} minWidth={0}>
              <Skeleton animation={anim} width={`${58 - (i % 4) * 8}%`} height={14} />
              <Skeleton animation={anim} width={`${30 - (i % 3) * 5}%`} height={11} />
            </Box>
            <Skeleton animation={anim} width={64} height={16} sx={{ flexShrink: 0 }} />
          </Box>
        ))}
      </Box>
    </LoadingRegion>
  );
};

/**
 * Stand-in for a balance surface: a hero figure card over a short stack of
 * person/group rows. It used to be two featureless grey slabs, which held the
 * right rectangle but told you nothing about what was coming; giving it the
 * medallion-plus-two-lines-plus-amount structure of the rows that replace it
 * means the eye is already in the right places when the data arrives.
 */
export const BalanceSkeleton = ({ rows = 2 }) => {
  const reduce = useReducedMotion();
  const anim = reduce ? false : 'pulse';
  const card = {
    borderRadius: `${radius.xl}px`, border: '1px solid', borderColor: 'divider',
    backgroundColor: 'background.paper',
  };
  return (
    <LoadingRegion label="Loading balances">
      <Stack spacing={1.25}>
        <Box sx={{ ...card, p: 2.5, textAlign: 'center' }}>
          <Skeleton animation={anim} width={110} height={12} sx={{ mx: 'auto' }} />
          <Skeleton animation={anim} width={168} height={34} sx={{ mx: 'auto', my: 0.75 }} />
          <Skeleton animation={anim} width={196} height={12} sx={{ mx: 'auto' }} />
        </Box>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} sx={{ ...card, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75 }}>
            <Skeleton animation={anim} variant="rounded" width={40} height={40} sx={{ flexShrink: 0, borderRadius: `${radius.md}px` }} />
            <Box flex={1} minWidth={0}>
              <Skeleton animation={anim} width={`${62 - i * 10}%`} height={15} />
              <Skeleton animation={anim} width={`${40 - i * 6}%`} height={11} />
            </Box>
            <Skeleton animation={anim} width={72} height={18} sx={{ flexShrink: 0 }} />
          </Box>
        ))}
      </Stack>
    </LoadingRegion>
  );
};
