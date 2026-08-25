import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HandshakeIcon from '@mui/icons-material/Handshake';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenseSummary, getSplitBalances, getMoneyPulse, getProjection } from '../rest/expenseTrackerApis';
import OwedHero from '../ui/OwedHero';
import Reveal from '../ui/Reveal';
import { SummarySkeleton } from '../ui/Skeletons';
import {
  Panel, MetricCard, EmptyState, SectionHeader,
  FinancialWeather, SafeToSpendHero, MoneyPulse, CashFlowRiver, AttentionLayer,
} from '../ui';
import { accents } from '../../theme/tokens';
import { money } from '../ui/money';

/**
 * The dashboard, reimagined as a Money OS.
 *
 * It reads top-to-bottom as a single answer to "where do I stand": the climate
 * (Financial Weather), the one number that matters (Safe to spend), why
 * (Money Pulse), what's coming (Cash Flow River), what needs you (Attention),
 * and who you stand with (the balance ring). Everything below is a quiet index.
 */

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const FEATURES = [
  { to: '/expense-tracker', icon: BarChartIcon, title: 'Activity', hint: 'Every transaction', color: accents.blue },
  { to: '/splits', icon: CallSplitIcon, title: 'Shared', hint: 'Who owes whom', color: accents.amber },
  { to: '/health-tracker', icon: FavoriteIcon, title: 'Health', hint: 'Weight, water, sleep', color: accents.red },
  { to: '/reports', icon: AssessmentIcon, title: 'Insights', hint: 'Trends & breakdowns', color: accents.purple },
  { to: '/hobby-tracker', icon: LayersIcon, title: 'Habits', hint: 'Streaks & routines', color: accents.green },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [splits, setSplits] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 8) + '01';
    Promise.allSettled([
      getExpenseSummary({ dateFrom: month, dateTo: today }),
      getSplitBalances(),
      getMoneyPulse(),
      getProjection(30),
    ]).then(([e, s, pl, pr]) => {
      if (e.status === 'fulfilled') setExpense(e.value);
      if (s.status === 'fulfilled') setSplits(s.value);
      if (pl.status === 'fulfilled') setPulse(pl.value);
      if (pr.status === 'fulfilled') setProjection(pr.value);
      setLoading(false);
    });
  }, []);

  const displayName = user?.username || 'there';

  // Same merge the splits page uses: one net figure per person, either direction.
  const people = useMemo(() => {
    if (!splits) return [];
    const byName = new Map();
    splits.balances.forEach(b => byName.set(b.name.toLowerCase(), {
      id: `p${b.personId}`, personId: b.personId, name: b.name, net: b.owed,
    }));
    splits.youOwe.forEach(d => {
      const key = d.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) existing.net -= d.owed;
      else byName.set(key, { id: `u${d.userId}`, name: d.name, net: -d.owed });
    });
    return [...byName.values()]
      .filter(p => p.net !== 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [splits]);

  const net = splits?.net || 0;

  // The attention layer, derived from data the dashboard already holds. Every
  // item is a real condition with a real number — nothing is invented.
  const attention = useMemo(() => {
    const items = [];
    const inp = pulse?.inputs || {};

    if (projection?.runway_days != null && projection.runway_days <= 7) {
      items.push({
        id: 'runway', icon: BoltRoundedIcon, tone: accents.red,
        title: `Runway is short — ~${projection.runway_days} day${projection.runway_days === 1 ? '' : 's'}`,
        detail: 'At your recent pace and bills ahead', onClick: () => navigate('/reports'),
      });
    }
    if (inp.prior_7_days_spend > 0 && inp.last_7_days_spend > inp.prior_7_days_spend * 1.25) {
      const pct = Math.round(((inp.last_7_days_spend - inp.prior_7_days_spend) / inp.prior_7_days_spend) * 100);
      items.push({
        id: 'unusual', icon: TrendingUpRoundedIcon, tone: accents.amber,
        title: `Spending up ${pct}% this week`,
        detail: `${money(inp.last_7_days_spend)} vs ${money(inp.prior_7_days_spend)} prior`,
        onClick: () => navigate('/expense-tracker'),
      });
    }
    if (projection?.upcoming_bills > 0) {
      items.push({
        id: 'bills', icon: ReceiptLongRoundedIcon, tone: accents.violet,
        title: `${money(projection.upcoming_bills)} in bills ahead`,
        detail: projection.next_income_date ? `Next income ${new Date(projection.next_income_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'In the next 30 days',
        onClick: () => navigate('/reports'),
      });
    }
    if (people.length > 0) {
      items.push({
        id: 'settle', icon: HandshakeRoundedIcon, tone: accents.blue,
        title: `${people.length} open settlement${people.length === 1 ? '' : 's'}`,
        detail: net >= 0 ? `You're owed ${money(Math.abs(net))} overall` : `You owe ${money(Math.abs(net))} overall`,
        onClick: () => navigate('/inbox'),
      });
    }
    return items;
  }, [pulse, projection, people, net, navigate]);

  const stats = [
    { label: 'Spent this month', raw: expense?.totalExpenses ?? 0, icon: TrendingUpIcon, color: accents.red },
    { label: 'Net balance', raw: expense?.netBalance ?? 0, icon: AccountBalanceIcon, color: accents.blue },
  ];

  const hasProjection = projection && projection.series && projection.series.length > 1;

  return (
    <Box sx={{ pb: { xs: 4, md: 2 } }}>
      {/* Greeting + climate */}
      <Reveal>
        <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: { xs: 1, sm: 2 }, mb: 2 }}>
          <Typography
            sx={{
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02,
              fontSize: { xs: '1.9rem', sm: '2.5rem' },
              backgroundImage: `linear-gradient(120deg, ${accents.blue} 10%, ${accents.violet} 55%, ${accents.red} 100%)`,
              backgroundClip: 'text', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}
          >
            {getGreeting()}, {displayName}.
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <FinancialWeather projection={projection} pulse={pulse} loading={loading} onClick={() => navigate('/reports')} />
          </Box>
        </Box>
      </Reveal>

      {/* The hero: Safe to spend today */}
      {(hasProjection || loading) && (
        <Reveal index={1}>
          <Box sx={{ mb: 2.5 }}>
            <SafeToSpendHero projection={projection} pulse={pulse} loading={loading && !projection} />
          </Box>
        </Reveal>
      )}

      {/* Money Pulse — the why, with the working one tap away */}
      {(pulse || loading) && (
        <Reveal index={2}>
          <Box sx={{ mb: 2.5 }}>
            <MoneyPulse pulse={pulse} loading={loading && !pulse} />
          </Box>
        </Reveal>
      )}

      {/* Cash Flow River — what's coming, scrubbable */}
      {hasProjection && (
        <Reveal index={3}>
          <Panel sx={{ mb: 2.5, p: { xs: 2, sm: 2.5 } }}>
            <CashFlowRiver projection={projection} />
          </Panel>
        </Reveal>
      )}

      {/* Attention layer */}
      {(attention.length > 0 || (!loading && hasProjection)) && (
        <Reveal index={4}>
          <Box sx={{ mb: 2.5 }}>
            <AttentionLayer items={attention} loading={loading} />
          </Box>
        </Reveal>
      )}

      {/* Who you stand with */}
      <Reveal index={5}>
        <Box sx={{ mb: 2.5 }}>
          {loading ? (
            <Box sx={{ height: 300, borderRadius: 5, border: '1px solid', borderColor: 'divider' }} />
          ) : people.length === 0 ? (
            <Panel interactive onClick={() => navigate('/splits')}>
              <EmptyState
                icon={HandshakeIcon}
                title="All square"
                description="Split a bill and the people you share with show up here."
                dense
              />
            </Panel>
          ) : (
            <OwedHero
              people={people}
              totalOwed={splits?.totalOwedToYou || 0}
              totalYouOwe={splits?.totalYouOwe || 0}
              net={net}
              onOpen={() => navigate('/splits')}
            />
          )}
        </Box>
      </Reveal>

      {/* Month context — two quiet facts, not a card wall */}
      <Reveal index={6}>
        {loading ? (
          <Box sx={{ mb: 2.5 }}><SummarySkeleton /></Box>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
            {stats.map((stat) => (
              <MetricCard
                key={stat.label}
                icon={stat.icon}
                color={stat.color}
                label={stat.label}
                amount={stat.raw}
                sx={{ flex: 1 }}
              />
            ))}
          </Stack>
        )}
      </Reveal>

      {/* Quiet index of everything else */}
      <Reveal index={7}>
        <SectionHeader title="Jump to" sx={{ px: 0.5 }} />
      </Reveal>
      <Box
        sx={{
          display: 'grid', gap: 1.25,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
        }}
      >
        {FEATURES.map((f, i) => (
          <Reveal key={f.to} index={8 + i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider',
                backgroundColor: 'transparent',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', borderColor: f.color },
              }}
            >
              <CardActionArea onClick={() => navigate(f.to)} sx={{ p: 2, height: '100%' }}>
                <Box
                  sx={{
                    width: 42, height: 42, borderRadius: '13px', mb: 1.5,
                    background: `linear-gradient(135deg, ${f.color}, ${f.color}bb)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 16px ${f.color}55`,
                  }}
                >
                  <f.icon sx={{ color: '#fff', fontSize: 22 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{f.title}</Typography>
                <Typography variant="caption" color="text.secondary">{f.hint}</Typography>
              </CardActionArea>
            </Card>
          </Reveal>
        ))}
      </Box>
    </Box>
  );
}
