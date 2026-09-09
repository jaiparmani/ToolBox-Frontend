import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { useMoney } from '../../contexts/MoneyContext';
import { getExpenses, getExpenseSummary } from '../rest/expenseTrackerApis';
import { PageHeader, EmptyState } from '../ui';
import CashFlowPulse from '../ui/CashFlowPulse';
import Reveal from '../ui/Reveal';
import { moneySmart } from '../ui/money';
import { accents } from '../../theme/tokens';

/**
 * CashFlow Pulse — your month's spending rhythm as a living heartbeat.
 *
 * Fetches this month's transactions, groups them by day with category splits,
 * and passes the daily shape to the canvas visualization. Every number is
 * derived from real API data — no fabrication.
 */
export default function CashFlowPulsePage() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const { projection, pulse } = useMoney();
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const month = today.toISOString().slice(0, 8) + '01';
    const todayStr = today.toISOString().slice(0, 10);

    Promise.all([
      getExpenses({ dateFrom: month, dateTo: todayStr, pageSize: 500, ordering: 'date' })
        .then(data => data.results || []),
      getExpenseSummary({ dateFrom: month, dateTo: todayStr }),
    ])
      .then(([txns, sum]) => { setExpenses(txns); setSummary(sum); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build daily aggregates with category splits
  const { days, categories } = useMemo(() => {
    if (!expenses) return { days: [], categories: [] };

    const dayMap = new Map();
    const catSet = new Map();

    expenses.forEach(e => {
      if (e.type === 'income') return;
      const amt = Math.abs(Number(e.amount) || 0);
      if (amt <= 0) return;

      const dateStr = e.date instanceof Date ? e.date.toISOString().slice(0, 10)
        : typeof e.date === 'string' ? e.date.slice(0, 10) : null;
      if (!dateStr) return;

      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { total: 0, count: 0, catAmounts: new Map() });
      }
      const day = dayMap.get(dateStr);
      day.total += amt;
      day.count += 1;

      const catName = e.category?.name || 'Uncategorized';
      const catColor = e.category?.color || null;
      day.catAmounts.set(catName, (day.catAmounts.get(catName) || 0) + amt);
      if (!catSet.has(catName)) catSet.set(catName, catColor);
    });

    // Fill every day of the month, even zero-spend days
    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth();
    const dayCount = today.getDate();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const result = [];
    for (let d = 1; d <= dayCount; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const dayInfo = dayMap.get(dateStr) || { total: 0, count: 0, catAmounts: new Map() };

      const cats = [];
      dayInfo.catAmounts.forEach((amount, name) => {
        cats.push({ name, amount });
      });
      cats.sort((a, b) => b.amount - a.amount);

      result.push({
        date: dateStr,
        label: `${d}`,
        dateLabel: `${dayNames[dateObj.getDay()]} ${monthNames[month]} ${d}`,
        total: dayInfo.total,
        count: dayInfo.count,
        cats,
      });
    }

    return { days: result, categories: Array.from(catSet.keys()) };
  }, [expenses]);

  const hasData = days.length > 0 && (summary || expenses);

  const stats = useMemo(() => {
    if (!summary) return null;
    const totalIncome = summary.totalIncome || 0;
    const totalSpent = summary.totalExpenses || 0;
    const net = summary.netBalance || 0;
    const heaviestDay = days.length > 0 ? Math.max(...days.map(d => d.total)) : 0;
    const avgDay = days.length > 0 ? days.reduce((s, d) => s + d.total, 0) / days.length : 0;
    const activeDays = days.filter(d => d.total > 0).length;
    return { totalIncome, totalSpent, net, heaviestDay, avgDay, activeDays };
  }, [summary, days]);

  return (
    <Box sx={{ pb: 4 }}>
      <Reveal>
        <PageHeader
          icon={FavoriteBorderRoundedIcon}
          title="CashFlow Pulse"
          subtitle="Your spending rhythm — every beat a real day"
        />
      </Reveal>

      <Reveal index={1}>
        {loading ? (
          <PulseSkeleton compact={compact} dark={dark} />
        ) : hasData ? (
          <CashFlowPulse
            days={days}
            categories={categories}
            net={summary?.netBalance || 0}
            income={summary?.totalIncome || 0}
            projection={projection}
            pulse={pulse}
          />
        ) : (
          <PulseEmpty dark={dark} />
        )}
      </Reveal>

      {hasData && stats && (
        <Reveal index={2}>
          <Box sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}>
            <StatCard label="Total Spent" value={moneySmart(stats.totalSpent)} color={accents.violet} dark={dark} />
            <StatCard label="Daily Average" value={moneySmart(stats.avgDay)} color={accents.cyan} dark={dark} />
            <StatCard label="Heaviest Day" value={moneySmart(stats.heaviestDay)} color={accents.red} dark={dark} />
            <StatCard label="Active Days" value={`${stats.activeDays} / ${days.length}`} color={accents.blue} dark={dark} />
            <StatCard label="Income" value={moneySmart(stats.totalIncome)} color={accents.mint} dark={dark} />
            <StatCard label="Net" value={moneySmart(stats.net)} color={stats.net >= 0 ? accents.mint : accents.red} dark={dark} />
          </Box>
        </Reveal>
      )}
    </Box>
  );
}

function StatCard({ label, value, color, dark }) {
  return (
    <Box sx={{
      px: 2, py: 1.75, borderRadius: 3,
      border: '1px solid', borderColor: 'divider',
      bgcolor: dark ? 'rgba(20,20,26,0.6)' : 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      position: 'relative', overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.45,
      }} />
      <Typography sx={{
        fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'text.secondary', mb: 0.5,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: '1.15rem', fontWeight: 750, fontVariantNumeric: 'tabular-nums',
        color, letterSpacing: '-0.02em',
      }}>
        {value}
      </Typography>
    </Box>
  );
}

function PulseSkeleton({ compact, dark }) {
  const h = compact ? 340 : 420;
  return (
    <Box sx={{
      position: 'relative', height: h, borderRadius: 5, overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      background: dark
        ? 'radial-gradient(120% 100% at 50% 30%, #16182400 0%, #0b0c12 100%)'
        : 'radial-gradient(120% 100% at 50% 30%, #eef1f800 0%, #dfe4f0 100%)',
    }}>
      {/* Waveform placeholder */}
      <Box sx={{
        position: 'absolute', top: '45%', left: '10%', right: '10%', height: 2,
        bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      }} />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((left, i) => (
        <Skeleton key={i} variant="circular" width={8} height={8} sx={{
          position: 'absolute', top: `${38 + Math.sin(i * 1.8) * 8}%`, left: `${left * 100}%`,
          bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        }} />
      ))}
      {/* Shimmer */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: dark
          ? 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)'
          : 'linear-gradient(110deg, transparent 30%, rgba(0,0,0,0.02) 50%, transparent 70%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s ease-in-out infinite',
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }} />
    </Box>
  );
}

function PulseEmpty({ dark }) {
  return (
    <Box sx={{
      position: 'relative', borderRadius: 5, overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      background: dark
        ? 'radial-gradient(120% 100% at 50% 30%, #16182400 0%, #0b0c12 100%)'
        : 'radial-gradient(120% 100% at 50% 30%, #eef1f800 0%, #dfe4f0 100%)',
    }}>
      <EmptyState
        icon={FavoriteBorderRoundedIcon}
        title="No heartbeat yet"
        description="Log some spending this month and watch your cash-flow pulse come alive — every day becomes a beat in the waveform."
      />
    </Box>
  );
}
