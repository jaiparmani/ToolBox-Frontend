import React from 'react';
import { Box, Slider, Typography } from '@mui/material';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import { accents, motion, radius, type } from '../../theme/tokens';
import { money } from './money';
import { yourShareOf } from '../rest/expenseTrackerApis';

const isIncomeOf = (e) => e.transaction_type === 'income' || e.type === 'income';
const BUCKETS = 20;

/**
 * The amount filter, as a range you can feel the shape of — not two blind
 * text boxes. The bars behind the track are a real histogram of what's
 * actually loaded (`yourShareOf` on every non-income row in the current
 * scope), so dragging the handles has a landscape to drag across: you can see
 * where your spending clusters before you narrow to it. No bar exists that
 * isn't backing a real count.
 *
 * The track's own bounds are the data's own min/max — not an arbitrary
 * ₹0–₹1,00,000 scale that wastes most of the travel on empty space. Renders
 * nothing when there's no spend to shape a range from.
 */
export default function AmountRangeSlider({ expenses = [], min, max, onChange }) {
  const reduce = useReducedMotion();

  const { bounds, histogram } = React.useMemo(() => {
    const amounts = expenses
      .filter((e) => !isIncomeOf(e))
      .map((e) => yourShareOf(e))
      .filter((v) => v > 0);
    if (amounts.length === 0) return { bounds: null, histogram: [] };
    const hi = Math.max(...amounts);
    const bucketSize = hi / BUCKETS || 1;
    const buckets = new Array(BUCKETS).fill(0);
    amounts.forEach((a) => {
      const idx = Math.min(BUCKETS - 1, Math.floor(a / bucketSize));
      buckets[idx] += 1;
    });
    const peak = Math.max(...buckets, 1);
    return { bounds: { min: 0, max: Math.ceil(hi) }, histogram: buckets.map((c) => c / peak) };
  }, [expenses]);

  const external = React.useMemo(() => {
    if (!bounds) return [0, 0];
    return [
      min !== '' && min != null ? Math.max(bounds.min, Number(min)) : bounds.min,
      max !== '' && max != null ? Math.min(bounds.max, Number(max)) : bounds.max,
    ];
  }, [min, max, bounds]);

  const [local, setLocal] = React.useState(external);
  // Re-sync when a filter chip clears this range (or scope reloads the data)
  // from outside the slider itself.
  React.useEffect(() => { setLocal(external); }, [external]);

  if (!bounds || bounds.max <= 0) return null;

  const handleCommit = (_, next) => {
    onChange(
      next[0] <= bounds.min ? '' : String(Math.round(next[0])),
      next[1] >= bounds.max ? '' : String(Math.round(next[1])),
    );
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', mb: 1.5 }}>
        Amount
      </Typography>

      <Box sx={{ px: 0.5 }}>
        {/* real distribution of what's loaded — the shape you're dragging across */}
        <Box aria-hidden sx={{ height: 28, display: 'flex', alignItems: 'flex-end', gap: '2px', mb: 0.75 }}>
          {histogram.map((h, i) => (
            <Box
              key={i}
              component={reduce ? 'div' : framerMotion.div}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, delay: i * 0.012 }}
              sx={{
                flex: 1, minWidth: 0, height: `${Math.max(8, h * 100)}%`,
                borderRadius: '2px 2px 0 0', bgcolor: accents.mint, opacity: 0.28,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </Box>

        <Slider
          value={local}
          min={bounds.min}
          max={bounds.max}
          disableSwap
          onChange={(_, next) => setLocal(next)}
          onChangeCommitted={handleCommit}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => money(v)}
          getAriaLabel={(i) => (i === 0 ? 'Minimum amount' : 'Maximum amount')}
          sx={{
            color: accents.mint, height: 4, p: 0, display: 'block', width: '100%',
            '& .MuiSlider-rail': { opacity: 0.18 },
            '& .MuiSlider-track': { border: 'none' },
            '& .MuiSlider-thumb': {
              width: 18, height: 18, bgcolor: 'background.paper', border: `2px solid ${accents.mint}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              transition: `transform ${motion.fast}ms ${motion.ease}, box-shadow ${motion.fast}ms ${motion.ease}`,
              '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${accents.mint}1f` },
              '&.Mui-active': { transform: 'scale(1.25)', boxShadow: `0 0 0 10px ${accents.mint}22` },
            },
            '& .MuiSlider-valueLabel': {
              fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums',
              fontSize: 11, fontWeight: 650,
              bgcolor: 'text.primary', color: 'background.paper', borderRadius: `${radius.sm}px`,
              '&::before': { display: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              '& .MuiSlider-thumb': { transition: 'none' },
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25, px: 0.5 }}>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{money(bounds.min)}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{money(bounds.max)}+</Typography>
      </Box>
    </Box>
  );
}
