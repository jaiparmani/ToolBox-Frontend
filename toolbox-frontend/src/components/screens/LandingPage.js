import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenseSummary, getSplitBalances, getMoneyPulse, getProjection } from '../rest/expenseTrackerApis';
import OwedHero from '../ui/OwedHero';
import MoneyPulse from '../ui/MoneyPulse';
import CashFlowRiver from '../ui/CashFlowRiver';
import AnimatedNumber from '../ui/AnimatedNumber';
import Reveal from '../ui/Reveal';
import { SummarySkeleton } from '../ui/Skeletons';
import { money } from '../ui/money';
import { accents } from '../../theme/tokens';

/**
 * The front door.
 *
 * The app is about people and money flows, so the dashboard leads with the
 * one picture that says how you stand with everyone - the constellation -
 * rather than a wall of feature tiles. The tiles are still there, but below
 * the thing you actually opened the app to check.
 */

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const FEATURES = [
  { to: '/expense-tracker', icon: BarChartIcon, title: 'Expenses', hint: 'Track spending', color: accents.blue },
  { to: '/splits', icon: CallSplitIcon, title: 'Splits', hint: 'Who owes whom', color: accents.amber },
  { to: '/health-tracker', icon: FavoriteIcon, title: 'Health', hint: 'Weight, water, sleep', color: accents.red },
  { to: '/reports', icon: AssessmentIcon, title: 'Reports', hint: 'Trends & breakdowns', color: accents.purple },
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
  const netPositive = net >= 0;

  const stats = [
    { label: 'This month', raw: expense?.totalExpenses ?? 0, icon: TrendingUpIcon, color: accents.red },
    { label: 'Net balance', raw: expense?.netBalance ?? 0, icon: AccountBalanceIcon, color: accents.blue },
  ];

  return (
    <Box sx={{ pb: { xs: 4, md: 2 } }}>
      {/* Greeting */}
      <Reveal>
        <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: { xs: 1, sm: 2 }, mb: 2.5 }}>
          <Typography
            sx={{
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05,
              fontSize: { xs: '2rem', sm: '2.75rem' },
              backgroundImage: `linear-gradient(120deg, ${accents.blue} 10%, ${accents.purple} 60%, ${accents.red} 100%)`,
              backgroundClip: 'text', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', color: 'transparent',
            }}
          >
            {getGreeting()}, {displayName}.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Here's where your money stands today.
          </Typography>
        </Box>
      </Reveal>

      {/* Money Pulse - the ambient 'where do I stand' read */}
      {(pulse || loading) && (
        <Reveal index={1}>
          <Box sx={{ mb: 2.5 }}>
            <MoneyPulse pulse={pulse} loading={loading && !pulse} />
          </Box>
        </Reveal>
      )}

      {/* Cash Flow River - what's coming, scrubbable */}
      {projection && projection.series && projection.series.length > 1 && (
        <Reveal index={2}>
          <Box
            sx={{
              mb: 2.5, p: { xs: 2, sm: 2.5 }, borderRadius: 5,
              border: '1px solid', borderColor: 'divider',
            }}
          >
            <CashFlowRiver projection={projection} />
          </Box>
        </Reveal>
      )}

      {/* The headline: a compact balance ring, not the full constellation */}
      <Reveal index={3}>
        <Box sx={{ mb: 2.5 }}>
          {loading ? (
            <Box sx={{ height: 300, borderRadius: 5, border: '1px solid', borderColor: 'divider' }} />
          ) : people.length === 0 ? (
            <Box
              onClick={() => navigate('/splits')}
              sx={{ p: 4, borderRadius: 5, textAlign: 'center', cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>All square</Typography>
              <Typography variant="body2" color="text.secondary">
                Split a bill and the people you share with show up here.
              </Typography>
            </Box>
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

      {/* Money at a glance */}
      <Reveal index={2}>
        {loading ? (
          <Box sx={{ mb: 2.5 }}><SummarySkeleton /></Box>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
            {stats.map((stat) => (
              <Card
                key={stat.label}
                elevation={0}
                sx={{ flex: 1, p: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
              >
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                      backgroundColor: `${stat.color}1f`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <stat.icon sx={{ color: stat.color, fontSize: 15 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap>{stat.label}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.3rem', sm: '1.6rem' }, letterSpacing: '-0.02em' }}>
                  <AnimatedNumber value={stat.raw} format="smart" />
                </Typography>
              </Card>
            ))}
          </Stack>
        )}
      </Reveal>

      {/* Everything else */}
      <Reveal index={3}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.25, px: 0.5 }}>
          Jump to
        </Typography>
      </Reveal>
      <Box
        sx={{
          display: 'grid', gap: 1.25,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
        }}
      >
        {FEATURES.map((f, i) => (
          <Reveal key={f.to} index={4 + i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider',
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
