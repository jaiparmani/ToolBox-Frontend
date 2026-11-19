import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Skeleton } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import BoltIcon from '@mui/icons-material/Bolt';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../contexts/AuthContext';
import { authUtils } from '../rest/authUtils';
import { accents, radius } from '../../theme/tokens';
import { money } from './money';
import StreakCounter from './StreakCounter';

// Dynamic base URL — mirrors the pattern in expenseTrackerApis.js
const getApiBase = () => {
  const h = window.location.hostname;
  const isLocal =
    h === 'localhost' || h === '127.0.0.1' ||
    h.startsWith('192.168.') || h.startsWith('10.') || h.endsWith('.local');
  return isLocal
    ? 'http://localhost:8000/api/expenses'
    : 'https://toolbox.pythonanywhere.com/api/expenses';
};

const toDateStr = (d) => d.toISOString().slice(0, 10);

function getTimeOfDay(h) {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const PERIOD_META = {
  morning:   { Icon: WbSunnyIcon,    color: accents.amber,  greeting: 'Good morning' },
  afternoon: { Icon: BoltIcon,       color: accents.cyan,   greeting: 'Good afternoon' },
  evening:   { Icon: NightsStayIcon, color: accents.violet, greeting: 'Good evening' },
  night:     { Icon: StarIcon,       color: accents.blue,   greeting: 'Good night' },
};

/**
 * PersonalisedHomeCard
 *
 * A time-of-day aware greeting card that sits at the top of the Expenses tab.
 * It fetches today's transactions and a 30-day summary independently so it
 * never blocks the rest of the page.
 *
 * Props:
 *   onQuickAdd  — () => void   called when the "Quick add" CTA is tapped
 */
export default function PersonalisedHomeCard({ onQuickAdd }) {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    todayTotal: 0,
    todayCount: 0,
    topCategory: null,
    dailyAvg: 0,
  });

  const firstName = user?.firstName || user?.username || '';
  const hour   = new Date().getHours();
  const period = getTimeOfDay(hour);
  const { Icon, color: iconColor, greeting } = PERIOD_META[period];
  const fullGreeting = firstName ? `${greeting}, ${firstName}` : greeting;

  // Fetch today + 30-day data in parallel; silently degrade on error.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const base    = getApiBase();
        const headers = { 'Content-Type': 'application/json', ...authUtils.authHeader() };
        const today   = toDateStr(new Date());
        const ago30   = toDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

        const [todayRes, summaryRes] = await Promise.all([
          fetch(`${base}/expenses/?date_from=${today}&date_to=${today}&page_size=100`, { headers }),
          fetch(`${base}/expenses/summary/?date_from=${ago30}&date_to=${today}`, { headers }),
        ]);

        if (cancelled) return;

        const [todayData, summaryData] = await Promise.all([
          todayRes.ok   ? todayRes.json()   : Promise.resolve({ results: [] }),
          summaryRes.ok ? summaryRes.json() : Promise.resolve({ total_expenses: 0 }),
        ]);

        if (cancelled) return;

        // Only count expenses (not income) toward the daily figure.
        const todayExpenses = (todayData.results || []).filter(
          (e) => e.transaction_type !== 'income',
        );
        const todayTotal = todayExpenses.reduce(
          (sum, e) => sum + parseFloat(e.amount || 0), 0,
        );
        const todayCount = todayExpenses.length;

        // Top category by spend today.
        const catMap = {};
        todayExpenses.forEach((e) => {
          if (e.category?.name) {
            catMap[e.category.name] =
              (catMap[e.category.name] || 0) + parseFloat(e.amount || 0);
          }
        });
        const topCategory =
          Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        // Simple 30-day daily average from the summary.
        const total30  = parseFloat(summaryData.total_expenses || 0);
        const dailyAvg = total30 / 30;

        if (!cancelled) {
          setState({ loading: false, todayTotal, todayCount, topCategory, dailyAvg });
        }
      } catch {
        if (!cancelled) {
          setState({ loading: false, todayTotal: 0, todayCount: 0, topCategory: null, dailyAvg: 0 });
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Resolve per-period body content ---
  let bodyContent  = null;
  let showQuickAdd = false;

  if (!state.loading) {
    const { todayTotal, todayCount, topCategory, dailyAvg } = state;

    if (period === 'morning') {
      showQuickAdd = true;
      bodyContent = todayCount === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
          Nothing logged yet — what was your morning chai?
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
          {money(todayTotal)} logged today across{' '}
          {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'}
        </Typography>
      );
    } else if (period === 'afternoon') {
      showQuickAdd = true;
      const runningHigh = dailyAvg > 0 && todayTotal > dailyAvg * 1.2;
      bodyContent = (
        <Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {money(todayTotal)} spent today
          </Typography>
          {runningHigh && (
            <Typography sx={{ fontSize: 12, color: accents.amber, mt: 0.35 }}>
              Running a bit high today
            </Typography>
          )}
        </Box>
      );
    } else if (period === 'evening') {
      showQuickAdd = todayCount < 3;
      bodyContent = (
        <Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            You&apos;ve logged {todayCount}{' '}
            {todayCount === 1 ? 'transaction' : 'transactions'} today — {money(todayTotal)} total.
          </Typography>
          {todayCount < 3 && (
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.35 }}>
              Anything missing?
            </Typography>
          )}
          {topCategory && (
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.35 }}>
              Most spent on: {topCategory}
            </Typography>
          )}
        </Box>
      );
    } else {
      // night — summary only, no CTA
      showQuickAdd = false;
      const dateLabel = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      bodyContent = (
        <Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {money(todayTotal)} &middot;{' '}
            {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.35 }}>
            Day complete — {dateLabel}
          </Typography>
        </Box>
      );
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: { xs: 2, sm: 2.5 },
        borderRadius: `${radius.lg}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
        {/* Left: greeting + body */}
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1}>
            <Icon sx={{ fontSize: 18, color: iconColor, flexShrink: 0 }} />
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 500,
                color: 'text.primary',
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {fullGreeting}
            </Typography>
          </Box>

          {state.loading ? (
            <Box sx={{ mt: 0.75 }}>
              <Skeleton variant="text" width="58%" sx={{ fontSize: 13 }} />
              <Skeleton variant="text" width="38%" sx={{ fontSize: 12 }} />
            </Box>
          ) : bodyContent}

          {/* Streak counter — rendered below body text, before the CTA */}
          <StreakCounter />
        </Box>

        {/* Right: Quick add CTA — only during morning/afternoon/evening when relevant */}
        {showQuickAdd && onQuickAdd && (
          <Button
            size="small"
            variant="outlined"
            onClick={onQuickAdd}
            sx={{
              alignSelf: 'center',
              flexShrink: 0,
              borderRadius: radius.pill,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12,
              px: 1.5,
              py: 0.5,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: accents.mint, color: accents.mint },
            }}
          >
            Quick add
          </Button>
        )}
      </Box>
    </Paper>
  );
}
