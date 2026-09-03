import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, IconButton, Paper, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import { useAuth } from '../../contexts/AuthContext';
import { getExpenses, getMonthlyReport } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import CursorGlow from '../motion/CursorGlow';
import { ExpenseListSkeleton, SummarySkeleton } from '../ui/Skeletons';
import { PageHeader, ChartContainer, EmptyState } from '../ui';

import InsightsMonthTrend from '../insights/InsightsMonthTrend';
import InsightsCategoryDelta from '../insights/InsightsCategoryDelta';
import InsightsDailyRhythm from '../insights/InsightsDailyRhythm';
import InsightsBiggestExpenses from '../insights/InsightsBiggestExpenses';
import InsightsWeekdayPattern from '../insights/InsightsWeekdayPattern';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

/**
 * Insights — an expense-focused read on one month, always in the context of the
 * months around it. Everything is data-true: monthly totals from the reports
 * API, per-category moves computed from two adjacent months, the daily rhythm
 * and biggest line items from the month's own expenses. Flat hairline surfaces,
 * one green accent; semantic red only where money leaves.
 */
export default function ReportsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [reports, setReports] = useState([]);   // last 6 monthly reports, oldest→selected
  const [expenses, setExpenses] = useState([]); // selected month's expense rows
  const [loading, setLoading] = useState(true);

  // The trailing 6-month window ending at the selected month.
  const windowMonths = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i, y = year;
      while (m < 1) { m += 12; y -= 1; }
      out.push({ year: y, month: m });
    }
    return out;
  }, [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${pad(month)}-01`;
    const to = `${year}-${pad(month)}-${daysInMonth(year, month)}`;

    const reportCalls = windowMonths.map((w) =>
      getMonthlyReport(w.year, w.month).catch(() => null));
    const expenseCall = getExpenses({
      dateFrom: from, dateTo: to, transactionType: 'expense',
      ordering: '-amount', pageSize: 500,
    }).catch(() => null);

    const [reportResults, expenseResult] = await Promise.all([
      Promise.all(reportCalls),
      expenseCall,
    ]);

    setReports(reportResults);
    setExpenses(expenseResult?.results || []);
    setLoading(false);
  }, [year, month, windowMonths]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };
  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  const selectedReport = reports[reports.length - 1] || null;
  const prevReport = reports[reports.length - 2] || null;

  const monthSeries = useMemo(() =>
    windowMonths.map((w, i) => ({
      key: `${w.year}-${w.month}`,
      label: `${MONTHS[w.month - 1]} ${w.year}`,
      short: SHORT[w.month - 1],
      value: parseFloat(reports[i]?.total_amount ?? 0),
      isSelected: i === windowMonths.length - 1,
    })),
    [windowMonths, reports]);

  const total = parseFloat(selectedReport?.total_amount ?? 0);
  const count = selectedReport?.total_count ?? 0;
  const dailyTotals = selectedReport?.daily_totals || [];
  const categoryTotals = selectedReport?.category_totals || [];

  // Average per day: over days elapsed for the current month, whole month otherwise.
  const daysBasis = isThisMonth ? today.getDate() : daysInMonth(year, month);
  const avgPerDay = daysBasis > 0 ? total / daysBasis : 0;
  const avgPerTxn = count > 0 ? total / count : 0;

  const hasData = total > 0 || count > 0 || categoryTotals.length > 0;

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

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6, position: 'relative' }}>
      <CursorGlow />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Month navigator */}
        <Reveal>
          <PageHeader
            icon={AssessmentIcon}
            title={MONTHS[month - 1]}
            subtitle={String(year)}
            actions={
              <Stack direction="row" spacing={0.5}>
                <IconButton onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton onClick={() => changeMonth(1)} disabled={isThisMonth} aria-label="Next month">
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            }
          />
        </Reveal>

        {loading ? (
          <Stack spacing={2.5}>
            <Box><SummarySkeleton /></Box>
            <ChartContainer><ExpenseListSkeleton rows={4} /></ChartContainer>
            <ChartContainer><ExpenseListSkeleton rows={5} /></ChartContainer>
          </Stack>
        ) : !hasData ? (
          <Reveal index={1}>
            <ChartContainer>
              <EmptyState
                icon={ReceiptLongIcon}
                title={`No spending recorded for ${MONTHS[month - 1]} yet.`}
                description="Add an expense, or step back to a month with activity."
              />
            </ChartContainer>
          </Reveal>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
            {/* 1. Hero — spend trend across months */}
            <Reveal index={1}>
              <InsightsMonthTrend months={monthSeries} count={count} />
            </Reveal>

            {/* 2. Where it went — categories with per-category MoM delta */}
            {categoryTotals.length > 0 && (
              <Reveal index={2}>
                <InsightsCategoryDelta current={categoryTotals} previous={prevReport?.category_totals || []} />
              </Reveal>
            )}

            {/* 3. When it left — the daily and weekday rhythm, paired on wider
                screens so the two "timing" reads sit together as one row. */}
            {(dailyTotals.length > 0 || expenses.length > 0) && (
              <Box sx={{
                display: 'grid', gap: { xs: 2, sm: 2.5 }, alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(320px, 1fr))' },
              }}>
                {dailyTotals.length > 0 && (
                  <Reveal index={3}>
                    <InsightsDailyRhythm
                      daily={dailyTotals}
                      avgPerDay={avgPerDay}
                      avgPerTxn={avgPerTxn}
                      perDayLabel={isThisMonth ? 'Avg / day so far' : 'Avg / day'}
                    />
                  </Reveal>
                )}

                {expenses.length > 0 && (
                  <Reveal index={4}>
                    <InsightsWeekdayPattern expenses={expenses} />
                  </Reveal>
                )}
              </Box>
            )}

            {/* 4. What moved it — the biggest line items, full width to close. */}
            {expenses.length > 0 && (
              <Reveal index={5}>
                <InsightsBiggestExpenses
                  expenses={expenses}
                  onSelect={(e) => navigate(`/expense-tracker${e.category?.id ? `?category=${e.category.id}` : ''}`)}
                />
              </Reveal>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
}
