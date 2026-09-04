import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import BubbleChartRoundedIcon from '@mui/icons-material/BubbleChartRounded';

import { useMoney } from '../../contexts/MoneyContext';
import { getExpenseSummary } from '../rest/expenseTrackerApis';
import { PageHeader, EmptyState, MoneyUniverse } from '../ui';
import Reveal from '../ui/Reveal';
import { moneySmart } from '../ui/money';
import { accents } from '../../theme/tokens';

/**
 * Money Universe — the immersive, opt-in view of your month as a spatial scene:
 * a net-position star orbited by income, spending categories and bills, each
 * body sized by its real amount. Lives on its own tab now (the Home dashboard
 * is the calm command center); this is where the "data as a world" spectacle
 * belongs, for when you want to explore rather than scan.
 */
export default function MoneyUniversePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const { projection, pulse } = useMoney();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 8) + '01';
    getExpenseSummary({ dateFrom: month, dateTo: today })
      .then(setExpense)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Render the scene whenever anything's loaded — the component draws the net
  // star + any bills/income even in a quiet month; only a total absence of both
  // reads (a failed/empty account) falls back to the guidance state.
  const hasData = !!expense || !!projection;

  // Derive stat figures from expense data for the summary row.
  const stats = useMemo(() => {
    if (!expense) return null;
    const totalIncome = expense.totalIncome || 0;
    const cats = expense.categoryBreakdown || [];
    const totalSpent = cats.reduce((s, c) => s + (c.amount || 0), 0);
    const net = expense.netBalance || 0;
    const categoryCount = cats.filter(c => c.amount > 0).length;
    return { totalIncome, totalSpent, net, categoryCount };
  }, [expense]);

  return (
    <Box sx={{ pb: 4 }}>
      <Reveal>
        <PageHeader
          icon={BubbleChartRoundedIcon}
          title="Money Universe"
          subtitle="Your month as a spatial scene — every body a real figure"
        />
      </Reveal>

      <Reveal index={1}>
        {loading ? (
          <UniverseSkeleton compact={compact} dark={dark} />
        ) : hasData ? (
          <MoneyUniverse
            income={expense.totalIncome}
            categories={expense.categoryBreakdown}
            bills={projection?.upcoming_bills || 0}
            net={expense.netBalance}
            projection={projection}
            pulse={pulse}
            onSelectCategory={(name) => navigate(`/expense-tracker?category=${encodeURIComponent(name)}`)}
          />
        ) : (
          <UniverseEmpty navigate={navigate} dark={dark} />
        )}
      </Reveal>

      {/* Stat cards — key figures at a glance, derived from the same data the
          universe renders so the numbers always agree. */}
      {hasData && stats && (
        <Reveal index={2}>
          <Box sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}>
            <StatCard label="Income" value={moneySmart(stats.totalIncome)} color={accents.mint} dark={dark} />
            <StatCard label="Spent" value={moneySmart(stats.totalSpent)} color={accents.red} dark={dark} />
            <StatCard label="Net" value={moneySmart(stats.net)} color={stats.net >= 0 ? accents.mint : accents.red} dark={dark} />
            <StatCard label="Categories" value={stats.categoryCount} color={accents.violet} dark={dark} />
          </Box>
        </Reveal>
      )}
    </Box>
  );
}

/** Stat card — one figure in the row below the universe. */
function StatCard({ label, value, color, dark }) {
  return (
    <Box sx={{
      px: 2, py: 1.75,
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: dark ? 'rgba(20,20,26,0.6)' : 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Faint accent glow at top edge — the card's colour signal */}
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

/** Loading skeleton that mirrors the universe container shape with a shimmer. */
function UniverseSkeleton({ compact, dark }) {
  const h = compact ? 340 : 420;
  return (
    <Box sx={{
      position: 'relative', height: h, borderRadius: 5, overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      background: dark
        ? 'radial-gradient(120% 100% at 50% 40%, #16182400 0%, #0b0c12 100%)'
        : 'radial-gradient(120% 100% at 50% 40%, #eef1f800 0%, #dfe4f0 100%)',
    }}>
      {/* Central star placeholder */}
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', textAlign: 'center',
      }}>
        <Skeleton variant="circular" width={56} height={56} sx={{
          mx: 'auto', mb: 1,
          bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }} />
        <Skeleton variant="text" width={40} height={14} sx={{
          mx: 'auto', mb: 0.5,
          bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }} />
        <Skeleton variant="text" width={72} height={22} sx={{
          mx: 'auto',
          bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }} />
      </Box>
      {/* Orbit ring placeholders — perfect circles, hinting at the spatial structure */}
      {[80, 140, 200].map((size, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: size, height: size,
          transform: 'translate(-50%, -50%)',
          border: '1px dashed',
          borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          borderRadius: '50%',
        }} />
      ))}
      {/* Shimmer pass — a slow travelling highlight across the container */}
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
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }} />
    </Box>
  );
}

/** Empty state with a subtle constellation backdrop and a CTA. */
function UniverseEmpty({ navigate, dark }) {
  return (
    <Box sx={{
      position: 'relative', borderRadius: 5, overflow: 'hidden',
      border: '1px solid', borderColor: 'divider',
      background: dark
        ? 'radial-gradient(120% 100% at 50% 40%, #16182400 0%, #0b0c12 100%)'
        : 'radial-gradient(120% 100% at 50% 40%, #eef1f800 0%, #dfe4f0 100%)',
    }}>
      {/* Twinkling star field — the universe is waiting for data to populate it */}
      <Box sx={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        '& span': {
          position: 'absolute', borderRadius: '50%',
          bgcolor: dark ? 'rgba(255,255,255,0.35)' : 'rgba(100,120,160,0.35)',
          animation: 'twinkle 3s ease-in-out infinite alternate',
        },
        '@keyframes twinkle': {
          '0%': { opacity: 0.12, transform: 'scale(0.8)' },
          '100%': { opacity: 0.85, transform: 'scale(1)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& span': { animation: 'none', opacity: 0.35, transform: 'none' },
        },
      }}>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} style={{
            left: `${7 + (i * 47) % 86}%`,
            top: `${4 + (i * 31) % 92}%`,
            width: i % 6 === 0 ? 3 : 2,
            height: i % 6 === 0 ? 3 : 2,
            animationDelay: `${(i * 0.41) % 3}s`,
            animationDuration: `${2.5 + (i % 4) * 0.6}s`,
          }} />
        ))}
      </Box>
      {/* Faint orbit ring ghosts — shows what this space becomes with data */}
      {[90, 160, 230].map((size, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: size, height: size,
          transform: 'translate(-50%, -50%)',
          border: '1px dashed',
          borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderRadius: '50%',
        }} />
      ))}
      <EmptyState
        icon={BubbleChartRoundedIcon}
        title="Nothing to map yet"
        description="Log some income and spending and your month takes shape here — a star for your net position, orbited by where the money went."
        actionLabel="Open Expense Tracker"
        onAction={() => navigate('/expense-tracker')}
      />
    </Box>
  );
}
