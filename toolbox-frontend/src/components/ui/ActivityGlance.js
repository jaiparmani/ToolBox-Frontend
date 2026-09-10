import React from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { type, radius, color, accents } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const isIncome = (e) => e.transaction_type === 'income' || e.type === 'income';
const dayKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

function MiniSparkline({ values, color: lineColor, width = 56, height = 20 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height * 0.8) - height * 0.08;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={`sg-${lineColor.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sg-${lineColor.replace(/[^a-zA-Z0-9]/g, '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height * 0.8) - height * 0.08}
        r="2"
        fill={lineColor}
      />
    </svg>
  );
}

function Metric({ label, shortLabel, value, format = 'smart', sub, accent, sparkData, index }) {
  const isMobile = useMediaQuery('(max-width:600px)');
  const reduce = useReducedMotion();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <Box
      component={reduce ? 'div' : framerMotion.div}
      initial={reduce ? undefined : { opacity: 0, y: 6 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={reduce ? undefined : { type: 'spring', stiffness: 400, damping: 30, delay: index * 0.06 }}
      sx={{
        flex: 1, minWidth: 0, px: { xs: 1.25, sm: 2 }, py: { xs: 1, sm: 1.4 },
        position: 'relative', overflow: 'hidden',
      }}
    >
      {accent && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 32, height: 2, borderRadius: 999,
            background: accent, opacity: 0.5,
            boxShadow: `0 1px 8px ${accent}`,
          }}
        />
      )}
      <Typography
        sx={{
          fontSize: { xs: 9.5, sm: 10.5 }, fontWeight: 650,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: accent || 'text.disabled', lineHeight: 1.2,
        }}
        noWrap
      >
        {isMobile && shortLabel ? shortLabel : label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, mt: 0.3, minWidth: 0 }}>
        <Typography
          component="div"
          sx={{
            ...num,
            fontSize: { xs: '1.15rem', sm: '1.35rem' },
            fontWeight: 750,
            color: 'text.primary',
            lineHeight: 1.15,
            flex: '1 1 auto',
            minWidth: 0,
          }}
          noWrap
        >
          <AnimatedNumber value={value} format={format} />
        </Typography>
        {/* Decorative, and the first thing to give up its width — the number
            clipping (rather than ellipsizing) on a phone was this sparkline's
            fixed width leaving the figure no room to shrink into. */}
        {sparkData && sparkData.length > 2 && !isMobile && (
          <Box sx={{ flexShrink: 0, mb: 0.2, opacity: 0.75 }}>
            <MiniSparkline
              values={sparkData}
              color={accent || (dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')}
              width={52}
              height={20}
            />
          </Box>
        )}
      </Box>
      {sub && (
        <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'text.disabled', mt: 0.15, lineHeight: 1.2 }} noWrap>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default function ActivityGlance({ expenses = [] }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const stats = React.useMemo(() => {
    const spend = expenses.filter((e) => !isIncome(e));
    if (spend.length === 0) return null;
    const days = new Set(spend.map((e) => dayKey(e.date)));
    const total = spend.reduce((s, e) => s + yourShareOf(e), 0);
    const activeDays = days.size || 1;
    let biggest = spend[0];
    for (const e of spend) {
      if (yourShareOf(e) > yourShareOf(biggest)) biggest = e;
    }

    const dailyMap = new Map();
    spend.forEach((e) => {
      const dk = dayKey(e.date);
      if (dk) dailyMap.set(dk, (dailyMap.get(dk) || 0) + yourShareOf(e));
    });
    const sortedDays = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const dailySpend = sortedDays.map(([, v]) => v);

    return {
      activeDays: days.size,
      avgPerDay: total / activeDays,
      biggest,
      biggestShare: yourShareOf(biggest),
      dailySpend,
    };
  }, [expenses]);

  if (!stats) return null;

  return (
    <Box
      sx={{
        display: 'flex', mb: 2, borderRadius: `${radius.lg}px`, overflow: 'hidden',
        border: '1px solid',
        borderColor: dark ? 'rgba(255,255,255,0.07)' : 'divider',
        bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
        boxShadow: dark
          ? 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.15)'
          : 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 4px rgba(0,0,0,0.04)',
        '& > *:not(:last-of-type)': {
          borderRight: '1px solid',
          borderColor: dark ? 'rgba(255,255,255,0.05)' : 'divider',
        },
      }}
    >
      <Metric
        label="Days with spend"
        shortLabel="Days"
        value={stats.activeDays}
        format="plain"
        sub={stats.activeDays === 1 ? 'in view' : 'active'}
        accent={accents.cyan}
        sparkData={stats.dailySpend}
        index={0}
      />
      <Metric
        label="Avg / active day"
        shortLabel="Avg/day"
        value={stats.avgPerDay}
        accent={accents.blue}
        sparkData={stats.dailySpend}
        index={1}
      />
      <Metric
        label="Biggest"
        shortLabel="Peak"
        value={stats.biggestShare}
        sub={stats.biggest.description || stats.biggest.category?.name}
        accent={accents.amber}
        index={2}
      />
    </Box>
  );
}
