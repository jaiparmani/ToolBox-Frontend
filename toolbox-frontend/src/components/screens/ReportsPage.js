import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Card, Container, IconButton, Paper, Stack, Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenseSummary, getMonthlyReport } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import AnimatedNumber from '../ui/AnimatedNumber';
import CategoryBreakdown from '../ui/CategoryBreakdown';
import TrendBars from '../ui/TrendBars';
import { ExpenseListSkeleton, SummarySkeleton } from '../ui/Skeletons';
import { accents } from '../../theme/tokens';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Reports, rebuilt around the two questions a month actually raises: where did
 * it go (the category breakdown) and when (the daily trend). Both are real
 * charts from the shared kit, not progress bars in a table.
 */
export default function ReportsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;
    const [s, r] = await Promise.allSettled([
      getExpenseSummary({ dateFrom: from, dateTo: to }),
      getMonthlyReport(year, month),
    ]);
    setSummary(s.status === 'fulfilled' ? s.value : null);
    setReport(r.status === 'fulfilled' ? r.value : null);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };
  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  const categories = useMemo(() =>
    (report?.category_totals || []).map(c => ({ label: c.category__name, value: parseFloat(c.total) })),
    [report]);

  if (isLoading) return null;
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" align="center">Authentication Required</Typography>
        </Paper>
      </Container>
    );
  }

  const stats = [
    { label: 'Spent', raw: summary?.totalExpenses ?? 0, icon: TrendingUpIcon, color: accents.red },
    { label: 'Income', raw: summary?.totalIncome ?? 0, icon: TrendingDownIcon, color: accents.green },
    { label: 'Net', raw: summary?.netBalance ?? 0, icon: AccountBalanceIcon, color: accents.blue },
    { label: 'Count', raw: report?.total_count ?? 0, icon: ReceiptLongIcon, color: accents.purple, plain: true },
  ];

  return (
    <>
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
        {/* Month navigator */}
        <Reveal>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: '13px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${accents.purple}, ${accents.red})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 8px 20px ${accents.purple}55`,
                }}
              >
                <AssessmentIcon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.15 }}>
                  {MONTHS[month - 1]}
                </Typography>
                <Typography variant="caption" color="text.secondary">{year}</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <IconButton onClick={() => changeMonth(-1)} aria-label="Previous month">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton onClick={() => changeMonth(1)} disabled={isThisMonth} aria-label="Next month">
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Box>
        </Reveal>

        {/* Animated stat grid */}
        <Reveal index={1}>
          {loading ? (
            <Box sx={{ mb: 2.5 }}><SummarySkeleton /></Box>
          ) : (
            <Box
              sx={{
                display: 'grid', gap: 1.25, mb: 2.5,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              }}
            >
              {stats.map((stat) => (
                <Card key={stat.label} elevation={0} sx={{ p: 1.75, borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '7px', backgroundColor: `${stat.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <stat.icon sx={{ color: stat.color, fontSize: 14 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>{stat.label}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.3rem' }, letterSpacing: '-0.02em' }}>
                    <AnimatedNumber value={stat.raw} format={stat.plain ? 'plain' : 'smart'} />
                  </Typography>
                </Card>
              ))}
            </Box>
          )}
        </Reveal>

        {/* Where it went */}
        <Reveal index={2}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            {loading ? <ExpenseListSkeleton rows={4} />
              : categories.length ? <CategoryBreakdown data={categories} title="Where it went" />
              : <Empty text="Nothing recorded this month." />}
          </Paper>
        </Reveal>

        {/* When */}
        <Reveal index={3}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            {loading ? <Box sx={{ height: 120 }} />
              : (report?.daily_totals?.length) ? <TrendBars data={report.daily_totals} />
              : <Empty text="No daily activity to chart." />}
          </Paper>
        </Reveal>
      </Container>
    </>
  );
}

function Empty({ text }) {
  return (
    <Box sx={{ py: 3, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  );
}
