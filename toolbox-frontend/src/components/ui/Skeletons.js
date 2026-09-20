import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { radius } from '../../theme/tokens';
import { STAT_CARD_SX, STAT_LABEL_SX, STAT_VALUE_SX } from './SummaryStrip';

/**
 * Placeholders shaped like the content they stand in for.
 *
 * Two rules every block here follows:
 * 1. **Never a value.** A placeholder is always a featureless bar.
 * 2. **Same geometry as the real thing** (Apple Design §7).
 *
 * Each skeleton staggers its children in with a framer-motion spring so
 * the page assembles visibly rather than popping in all at once.
 * Under prefers-reduced-motion the stagger is skipped and items appear instantly.
 */

function LoadingRegion({ label, children, sx, ...rest }) {
  return (
    <Box role="status" aria-busy="true" aria-label={label} sx={sx} {...rest}>
      {children}
    </Box>
  );
}

// Shared stagger variants
const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 360, damping: 32, mass: 0.8, opacity: { duration: 0.2 } },
  },
};

function useAnim() {
  const reduce = useReducedMotion();
  return { anim: reduce ? false : 'pulse', reduce };
}

export const SummarySkeleton = ({ count = 4 }) => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion
      label="Loading headline figures"
      sx={{ display: 'flex', gap: 1.25, pb: 0.5, overflow: 'hidden' }}
    >
      <motion.div
        variants={CONTAINER}
        initial={reduce ? 'show' : 'hidden'}
        animate="show"
        style={{ display: 'flex', gap: 10, flex: 1 }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <motion.div key={i} variants={ITEM} style={{ flex: 1 }}>
            <Box sx={STAT_CARD_SX}>
              <Box sx={STAT_LABEL_SX}>
                <Skeleton animation={anim} width={`${52 + (i % 3) * 10}%`} height="1.3em" sx={{ transform: 'none' }} />
              </Box>
              <Box sx={STAT_VALUE_SX}>
                <Skeleton animation={anim} width="70%" height="1em" sx={{ transform: 'none' }} />
              </Box>
            </Box>
          </motion.div>
        ))}
      </motion.div>
    </LoadingRegion>
  );
};

export const ExpenseListSkeleton = ({ rows = 5 }) => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion label="Loading transactions">
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 0.75, sm: 1 }, pb: 1 }}>
        <Skeleton animation={anim} width={72} height={12} />
        <Skeleton animation={anim} width={54} height={12} />
      </Box>
      <motion.div
        variants={CONTAINER}
        initial={reduce ? 'show' : 'hidden'}
        animate="show"
        style={{ borderTop: '1px solid transparent' }}
      >
        <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
          {Array.from({ length: rows }).map((_, i) => (
            <motion.div key={i} variants={ITEM}>
              <Box display="flex" alignItems="center" gap={1.5} sx={{ px: { xs: 0.75, sm: 1 }, py: 1.15 }}>
                <Skeleton animation={anim} variant="circular" width={9} height={9} sx={{ flexShrink: 0 }} />
                <Box flex={1} minWidth={0}>
                  <Skeleton animation={anim} width={`${58 - (i % 4) * 8}%`} height={14} />
                  <Skeleton animation={anim} width={`${30 - (i % 3) * 5}%`} height={11} />
                </Box>
                <Skeleton animation={anim} width={64} height={16} sx={{ flexShrink: 0 }} />
              </Box>
            </motion.div>
          ))}
        </Box>
      </motion.div>
    </LoadingRegion>
  );
};

export const BalanceSkeleton = ({ rows = 2 }) => {
  const { anim, reduce } = useAnim();
  const card = {
    borderRadius: `${radius.xl}px`, border: '1px solid', borderColor: 'divider',
    backgroundColor: 'background.paper',
  };
  return (
    <LoadingRegion label="Loading balances">
      <motion.div
        variants={CONTAINER}
        initial={reduce ? 'show' : 'hidden'}
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <motion.div variants={ITEM}>
          <Box sx={{ ...card, p: 2.5, textAlign: 'center' }}>
            <Skeleton animation={anim} width={110} height={12} sx={{ mx: 'auto' }} />
            <Skeleton animation={anim} width={168} height={34} sx={{ mx: 'auto', my: 0.75 }} />
            <Skeleton animation={anim} width={196} height={12} sx={{ mx: 'auto' }} />
          </Box>
        </motion.div>
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div key={i} variants={ITEM}>
            <Box sx={{ ...card, display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75 }}>
              <Skeleton animation={anim} variant="rounded" width={40} height={40} sx={{ flexShrink: 0, borderRadius: `${radius.md}px` }} />
              <Box flex={1} minWidth={0}>
                <Skeleton animation={anim} width={`${62 - i * 10}%`} height={15} />
                <Skeleton animation={anim} width={`${40 - i * 6}%`} height={11} />
              </Box>
              <Skeleton animation={anim} width={72} height={18} sx={{ flexShrink: 0 }} />
            </Box>
          </motion.div>
        ))}
      </motion.div>
    </LoadingRegion>
  );
};

export const ProfileSkeleton = () => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion label="Loading profile">
      <motion.div variants={CONTAINER} initial={reduce ? 'show' : 'hidden'} animate="show">
        <motion.div variants={ITEM}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Skeleton animation={anim} variant="circular" width={72} height={72} />
            <Box sx={{ flex: 1 }}>
              <Skeleton animation={anim} width="45%" height={24} sx={{ mb: 0.75, transform: 'none' }} />
              <Skeleton animation={anim} width="65%" height={14} sx={{ transform: 'none' }} />
            </Box>
          </Box>
        </motion.div>
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i} variants={ITEM}>
            <Box sx={{ mb: 1.5 }}>
              <Skeleton animation={anim} width="30%" height={12} sx={{ mb: 0.5, transform: 'none' }} />
              <Skeleton animation={anim} width="100%" height={44} sx={{ borderRadius: 2, transform: 'none' }} />
            </Box>
          </motion.div>
        ))}
      </motion.div>
    </LoadingRegion>
  );
};

export const RecurringSkeleton = ({ rows = 4 }) => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion label="Loading recurring items">
      <motion.div
        variants={CONTAINER}
        initial={reduce ? 'show' : 'hidden'}
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div key={i} variants={ITEM}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
            }}>
              <Skeleton animation={anim} variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton animation={anim} width={`${55 + (i % 3) * 12}%`} height={14} sx={{ mb: 0.5, transform: 'none' }} />
                <Skeleton animation={anim} width={`${35 + (i % 2) * 15}%`} height={11} sx={{ transform: 'none' }} />
              </Box>
              <Skeleton animation={anim} width={56} height={20} sx={{ borderRadius: 1, transform: 'none' }} />
            </Box>
          </motion.div>
        ))}
      </motion.div>
    </LoadingRegion>
  );
};

export const ApiKeysSkeleton = ({ rows = 3 }) => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion label="Loading API keys">
      <motion.div variants={CONTAINER} initial={reduce ? 'show' : 'hidden'} animate="show">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div key={i} variants={ITEM}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
            }}>
              <Box>
                <Skeleton animation={anim} width={`${100 + i * 20}px`} height={14} sx={{ mb: 0.5, transform: 'none' }} />
                <Skeleton animation={anim} width={180} height={11} sx={{ transform: 'none' }} />
              </Box>
              <Skeleton animation={anim} width={64} height={30} sx={{ borderRadius: 1, transform: 'none' }} />
            </Box>
          </motion.div>
        ))}
      </motion.div>
    </LoadingRegion>
  );
};

export const StorySkeleton = () => {
  const { anim, reduce } = useAnim();
  return (
    <LoadingRegion label="Loading today's story">
      <motion.div variants={CONTAINER} initial={reduce ? 'show' : 'hidden'} animate="show">
        <motion.div variants={ITEM}>
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Skeleton animation={anim} width={140} height={14} sx={{ mx: 'auto', mb: 1, transform: 'none' }} />
            <Skeleton animation={anim} width={200} height={36} sx={{ mx: 'auto', mb: 2.5, transform: 'none', borderRadius: 2 }} />
            <Skeleton animation={anim} width={100} height={12} sx={{ mx: 'auto', mb: 0.75, transform: 'none' }} />
            <Skeleton animation={anim} width={260} height={72} sx={{ mx: 'auto', mb: 1, transform: 'none', borderRadius: 2 }} />
            <Skeleton animation={anim} width={180} height={14} sx={{ mx: 'auto', transform: 'none' }} />
          </Box>
        </motion.div>
        <motion.div variants={ITEM}>
          <Box sx={{ display: 'flex', gap: 1.5, px: 2, mb: 3 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ flex: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Skeleton animation={anim} width="50%" height={11} sx={{ mb: 0.75, transform: 'none' }} />
                <Skeleton animation={anim} width="70%" height={20} sx={{ transform: 'none' }} />
              </Box>
            ))}
          </Box>
        </motion.div>
        <motion.div variants={ITEM}>
          <Box sx={{ px: 2, mb: 3 }}>
            <svg width="100%" height={120} style={{ display: 'block' }}>
              <defs>
                <linearGradient id="storyChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M0,100 C60,95 100,70 160,60 S260,40 320,35 S420,25 480,20 S560,18 620,16 L620,120 L0,120 Z"
                fill="url(#storyChartFill)" />
              <path d="M0,100 C60,95 100,70 160,60 S260,40 320,35 S420,25 480,20 S560,18 620,16"
                fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.3" />
            </svg>
          </Box>
        </motion.div>
      </motion.div>
    </LoadingRegion>
  );
};
