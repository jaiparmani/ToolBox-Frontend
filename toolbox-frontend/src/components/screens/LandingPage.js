import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import OpacityIcon from '@mui/icons-material/Opacity';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenseSummary } from '../rest/expenseTrackerApis';
import { getMetricsSummary } from '../rest/healthApis';

const FEATURES = [
  {
    to: '/expense-tracker',
    icon: BarChartIcon,
    title: 'Expenses',
    description: 'Track spending, income, and see where it all goes.',
    gradient: 'linear-gradient(135deg, #0A84FF, #64D2FF)',
    glow: 'rgba(10,132,255,0.45)',
  },
  {
    to: '/health-tracker',
    icon: FavoriteIcon,
    title: 'Health Tracker',
    description: 'Log weight, water, sleep, and steps in one place.',
    gradient: 'linear-gradient(135deg, #FF375F, #FF9F0A)',
    glow: 'rgba(255,55,95,0.45)',
  },
  {
    to: '/hobby-tracker',
    icon: LayersIcon,
    title: 'Habit Tracker',
    description: 'Build streaks and keep your routines on track.',
    gradient: 'linear-gradient(135deg, #30D158, #64D2FF)',
    glow: 'rgba(48,209,88,0.45)',
  },
  {
    to: '/reports',
    icon: AssessmentIcon,
    title: 'Reports',
    description: 'Category breakdowns and monthly trends at a glance.',
    gradient: 'linear-gradient(135deg, #BF5AF2, #FF375F)',
    glow: 'rgba(191,90,242,0.45)',
  },
  {
    to: '/array-sum',
    icon: FunctionsIcon,
    title: 'Array Sum Demo',
    description: 'A small utility tool for quick number crunching.',
    gradient: 'linear-gradient(135deg, #FF9F0A, #FFD60A)',
    glow: 'rgba(255,159,10,0.45)',
  },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const fadeInUp = {
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(24px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    getExpenseSummary({ dateFrom: today, dateTo: today })
      .then(setExpenseSummary)
      .catch(() => setExpenseSummary(null));
    getMetricsSummary()
      .then(setHealthSummary)
      .catch(() => setHealthSummary(null));
  }, []);

  const displayName = user?.username || user?.email || 'there';
  const weight = healthSummary?.weight;
  const water = healthSummary?.water;

  const stats = [
    {
      label: "Today's spending",
      value: expenseSummary ? `₹${expenseSummary.totalExpenses.toFixed(2)}` : '—',
      icon: TrendingDownIcon,
      color: '#FF453A',
    },
    {
      label: 'Net balance',
      value: expenseSummary ? `₹${expenseSummary.netBalance.toFixed(2)}` : '—',
      icon: AccountBalanceIcon,
      color: '#0A84FF',
    },
    {
      label: 'Latest weight',
      value: weight?.latest_value != null ? `${weight.latest_value} ${weight.unit}` : '—',
      icon: MonitorWeightIcon,
      color: '#FF375F',
    },
    {
      label: 'Water this week',
      value: water?.week_total != null ? `${water.week_total} ${water.unit}` : '—',
      icon: OpacityIcon,
      color: '#64D2FF',
    },
  ];

  return (
    <Box>
      {/* Hero with gradient-mesh backdrop */}
      <Box
        sx={{
          position: 'relative',
          textAlign: 'center',
          py: { xs: 7, sm: 12 },
          px: 2,
          mb: 2,
          borderRadius: '28px',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 15% 20%, rgba(10,132,255,0.35), transparent 42%),
              radial-gradient(circle at 85% 15%, rgba(191,90,242,0.28), transparent 45%),
              radial-gradient(circle at 50% 100%, rgba(255,55,95,0.22), transparent 55%)
            `,
            opacity: (theme) => (theme.palette.mode === 'dark' ? 1 : 0.6),
          },
        }}
      >
        <Box sx={{ position: 'relative', ...fadeInUp, animation: 'fadeInUp 0.7s ease-out' }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2.25rem', sm: '3.75rem' },
              mb: 1.5,
              backgroundImage: 'linear-gradient(135deg, #0A84FF 10%, #BF5AF2 55%, #FF375F 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {getGreeting()}, {displayName}.
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              maxWidth: 560,
              mx: 'auto',
            }}
          >
            Everything in your toolbox, in one clean view.
          </Typography>
        </Box>
      </Box>

      {/* Live stats - glass cards */}
      <Grid container spacing={2} sx={{ mb: 6 }}>
        {stats.map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <Grid item xs={6} lg={3} key={stat.label}>
              <Card
                elevation={0}
                sx={{
                  ...fadeInUp,
                  animation: `fadeInUp 0.7s ease-out ${0.1 + i * 0.06}s both`,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  transition: 'transform 0.25s ease, border-color 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    borderColor: stat.color,
                  },
                }}
              >
                <CardContent sx={{ py: 2.5 }}>
                  <StatIcon sx={{ color: stat.color, fontSize: 20, mb: 1 }} />
                  <Typography variant="h5" sx={{ mb: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Feature grid */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Explore
      </Typography>
      <Grid container spacing={3}>
        {FEATURES.map(({ to, icon: Icon, title, description, gradient, glow }, i) => (
          <Grid item xs={12} lg={4} key={to}>
            <Card
              elevation={0}
              sx={{
                ...fadeInUp,
                animation: `fadeInUp 0.7s ease-out ${0.2 + i * 0.08}s both`,
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  borderColor: 'transparent',
                  boxShadow: `0 20px 40px ${glow}`,
                },
              }}
            >
              <CardActionArea onClick={() => navigate(to)} sx={{ height: '100%', p: 1 }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '16px',
                      background: gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: `0 8px 20px ${glow}`,
                    }}
                  >
                    <Icon sx={{ color: '#fff', fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
