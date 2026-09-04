import React from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { moneySmart } from './money';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { type, radius, color } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const isIncome = (e) => e.transaction_type === 'income' || e.type === 'income';
const dayKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

function Metric({ label, shortLabel, value, sub }) {
  const isMobile = useMediaQuery('(max-width:600px)');
  return (
    <Box sx={{ flex: 1, minWidth: 0, px: { xs: 1, sm: 2 }, py: { xs: 0.85, sm: 1.25 } }}>
      <Typography
        sx={{
          fontSize: { xs: 10, sm: 10.5 }, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'text.disabled', lineHeight: 1.2,
        }}
        noWrap
      >
        {isMobile && shortLabel ? shortLabel : label}
      </Typography>
      <Typography
        sx={{
          ...num,
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          fontWeight: 700,
          color: 'text.primary',
          mt: 0.2,
          lineHeight: 1.2,
        }}
        noWrap
      >
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'text.disabled', mt: 0.1, lineHeight: 1.2 }} noWrap>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

/**
 * A compact "at a glance" strip derived entirely from the rows already loaded
 * for the current scope — no extra fetch. Three restrained, tabular readings of
 * spending: how many days had any spend, the average across those active days,
 * and the single biggest expense in view. Renders nothing until there's at
 * least one expense to summarise, so an income-only or empty view stays calm.
 */
export default function ActivityGlance({ expenses = [] }) {
  const stats = React.useMemo(() => {
    const spend = expenses.filter((e) => !isIncome(e));
    if (spend.length === 0) return null;
    const days = new Set(spend.map((e) => dayKey(e.date)));
    // Your share, not the full bill — keeps the strip consistent with the
    // netted "spent" totals shown elsewhere.
    const total = spend.reduce((s, e) => s + yourShareOf(e), 0);
    const activeDays = days.size || 1;
    let biggest = spend[0];
    for (const e of spend) {
      if (yourShareOf(e) > yourShareOf(biggest)) biggest = e;
    }
    return {
      activeDays: days.size,
      avgPerDay: total / activeDays,
      biggest,
      biggestShare: yourShareOf(biggest),
    };
  }, [expenses]);

  if (!stats) return null;

  return (
    <Box
      sx={{
        display: 'flex', mb: 1.5, borderRadius: `${radius.lg}px`, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
        '& > *:not(:last-of-type)': { borderRight: '1px solid', borderColor: 'divider' },
      }}
    >
      <Metric
        label="Days with spend"
        shortLabel="Days"
        value={stats.activeDays}
        sub={stats.activeDays === 1 ? 'in view' : 'active'}
      />
      <Metric
        label="Avg / active day"
        shortLabel="Avg/day"
        value={moneySmart(stats.avgPerDay)}
      />
      <Metric
        label="Biggest"
        shortLabel="Peak"
        value={moneySmart(stats.biggestShare)}
        sub={stats.biggest.description || stats.biggest.category?.name}
      />
    </Box>
  );
}
