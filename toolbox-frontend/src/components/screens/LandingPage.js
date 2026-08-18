import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenseSummary } from '../rest/expenseTrackerApis';
import { getMetricsSummary } from '../rest/healthApis';

const FEATURES = [
  {
    to: '/expense-tracker',
    icon: BarChartIcon,
    title: 'Expenses',
    description: 'Track spending, income, and see where it all goes.',
    color: '#0071e3',
  },
  {
    to: '/health-tracker',
    icon: FavoriteIcon,
    title: 'Health Tracker',
    description: 'Log weight, water, sleep, and steps in one place.',
    color: '#ff375f',
  },
  {
    to: '/hobby-tracker',
    icon: LayersIcon,
    title: 'Habit Tracker',
    description: 'Build streaks and keep your routines on track.',
    color: '#30d158',
  },
  {
    to: '/reports',
    icon: AssessmentIcon,
    title: 'Reports',
    description: 'Category breakdowns and monthly trends at a glance.',
    color: '#bf5af2',
  },
  {
    to: '/array-sum',
    icon: FunctionsIcon,
    title: 'Array Sum Demo',
    description: 'A small utility tool for quick number crunching.',
    color: '#ff9f0a',
  },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
    },
    {
      label: 'Net balance',
      value: expenseSummary ? `₹${expenseSummary.netBalance.toFixed(2)}` : '—',
    },
    {
      label: 'Latest weight',
      value: weight?.latest_value != null ? `${weight.latest_value} ${weight.unit}` : '—',
    },
    {
      label: 'Water this week',
      value: water?.week_total != null ? `${water.week_total} ${water.unit}` : '—',
    },
  ];

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          textAlign: 'center',
          py: { xs: 6, sm: 10 },
          px: 2,
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2.25rem', sm: '3.5rem' },
            mb: 1.5,
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

      {/* Live stats */}
      <Grid container spacing={2} sx={{ mb: 6 }}>
        {stats.map((stat) => (
          <Grid item xs={6} lg={3} key={stat.label}>
            <Card variant="outlined" sx={{ borderColor: 'divider', border: '1px solid' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Feature grid */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Explore
      </Typography>
      <Grid container spacing={3}>
        {FEATURES.map(({ to, icon: Icon, title, description, color }) => (
          <Grid item xs={12} lg={4} key={to}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                },
              }}
            >
              <CardActionArea onClick={() => navigate(to)} sx={{ height: '100%', p: 1 }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '14px',
                      backgroundColor: `${color}1a`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Icon sx={{ color, fontSize: 26 }} />
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
