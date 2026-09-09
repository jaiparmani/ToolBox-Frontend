import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import { motion, radius, type } from '../../theme/tokens';
import usePressSpring from './usePressSpring';
import { money } from './money';

/**
 * One ranked row: a colour, a name, a real figure, and a bar for its share.
 *
 * The Activity page had three different ways of listing "a thing with an
 * amount" (category cards, tag cards, split cards) and none of them showed the
 * amount's *share*, so nothing on those tabs answered "is this a lot?".
 * This is the single row the Insights and Labels tabs both use, so a category
 * looks and behaves the same wherever you meet it (Apple Design §7, §16.4).
 *
 * Data-true: `pct` is only ever drawn, never announced as a figure the caller
 * didn't supply, and the exact rupee amount sits beside the bar rather than
 * only inside it.
 *
 * Fallbacks: reduced-motion draws the bar at full length with no stagger;
 * a missing amount drops the figure and the bar rather than rendering a zero.
 */
export default function ActivityBarRow({
  color,
  label,
  sublabel,
  amount,
  pct,
  index = 0,
  onSelect,
  actions,
  selectHint,
  dense,
}) {
  const reduce = useReducedMotion();
  const press = usePressSpring({ pressScale: 0.99, disabled: !onSelect });
  const hasAmount = amount != null && Number.isFinite(Number(amount));
  const share = Math.max(0, Math.min(100, Number(pct) || 0));
  const showBar = hasAmount && share > 0;

  const body = (
    <>
      <Box
        aria-hidden
        sx={{
          width: dense ? 8 : 10, height: dense ? 8 : 10, borderRadius: '3px',
          flexShrink: 0, bgcolor: color, boxShadow: `0 0 0 3px ${color}1f`,
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{ fontSize: dense ? 13 : 14, fontWeight: 600, letterSpacing: '-0.01em' }}
          noWrap
        >
          {label}
        </Typography>
        {sublabel ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
            {sublabel}
          </Typography>
        ) : null}
      </Box>
      {hasAmount ? (
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            sx={{
              fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em', fontSize: dense ? 13.5 : 15, fontWeight: 600,
            }}
          >
            {money(amount)}
          </Typography>
          {pct != null && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
              {share < 1 ? '<1' : Math.round(share)}%
            </Typography>
          )}
        </Box>
      ) : null}
    </>
  );

  return (
    <Box sx={{ py: dense ? 0.9 : 1.15 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          ref={onSelect ? press.ref : undefined}
          {...(onSelect ? press.bindEvents : {})}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={onSelect ? `${label}${hasAmount ? `, ${money(amount)}` : ''}${selectHint ? `. ${selectHint}` : ''}` : undefined}
          onClick={onSelect}
          onKeyDown={onSelect ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(e); }
          } : undefined}
          sx={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1, py: 0.6, mx: -1, borderRadius: `${radius.md}px`,
            cursor: onSelect ? 'pointer' : 'default',
            transition: `background-color ${motion.fast}ms ${motion.ease}`,
            ...(onSelect && {
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 1 },
            }),
          }}
        >
          {body}
        </Box>
        {actions ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>{actions}</Box>
        ) : null}
      </Box>

      {showBar && (
        <Box
          aria-hidden
          sx={{
            mt: 0.7, height: 4, borderRadius: 999, overflow: 'hidden',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
          }}
        >
          <Box
            component={framerMotion.div}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={reduce
              ? { duration: 0 }
              : { type: 'spring', stiffness: 190, damping: 24, delay: Math.min(index * 0.04, 0.4) }}
            style={{ transformOrigin: 'left center' }}
            sx={{
              height: '100%', width: `${Math.max(share, 1.5)}%`, borderRadius: 999,
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              boxShadow: share > 40 ? `0 0 8px ${color}44` : 'none',
            }}
          />
        </Box>
      )}
    </Box>
  );
}
