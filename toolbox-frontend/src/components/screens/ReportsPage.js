import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, LinearProgress, Alert
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  AccountBalance as BalanceIcon, Receipt as ReceiptIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

import { getExpenseSummary, getMonthlyReport } from '../rest/expenseTrackerApis';
import NavbarComponent from '../NavbarComponent';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const { isAuthenticated } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();

      const [summaryData, reportData] = await Promise.all([
        getExpenseSummary({
          dateFrom: `${year}-${monthStr}-01`,
          dateTo: `${year}-${monthStr}-${lastDay}`
        }),
        getMonthlyReport(year, month)
      ]);

      setSummary(summaryData);
      setReport(reportData);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const categoryTotals = report?.category_totals || [];
  const dailyTotals = report?.daily_totals || [];
  const totalAmount = parseFloat(report?.total_amount || 0);

  return (
    <>
      <NavbarComponent />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: '14px',
                background: 'linear-gradient(135deg, #BF5AF2, #FF375F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(191,90,242,0.4)',
              }}
            >
              <AssessmentIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h4" component="h1">Reports</Typography>
              <Typography variant="body2" color="text.secondary">
                Spending breakdown by category and day
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: 160, textAlign: 'center' }}>
              {MONTH_NAMES[month - 1]} {year}
            </Typography>
            <IconButton onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: 'Total Expenses', value: `₹${(summary?.totalExpenses ?? 0).toFixed(2)}`, icon: TrendingDown, color: '#FF453A' },
            { label: 'Total Income', value: `₹${(summary?.totalIncome ?? 0).toFixed(2)}`, icon: TrendingUp, color: '#30D158' },
            { label: 'Net Balance', value: `₹${(summary?.netBalance ?? 0).toFixed(2)}`, icon: BalanceIcon, color: '#0A84FF' },
            { label: 'Transactions', value: report?.total_count ?? 0, icon: ReceiptIcon, color: '#BF5AF2' },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  '&:hover': { transform: 'translateY(-3px)', borderColor: stat.color },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{stat.label}</Typography>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5">{stat.value}</Typography>
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: '11px',
                        backgroundColor: `${stat.color}1f`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <stat.icon sx={{ color: stat.color, fontSize: 20 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Typography variant="h6" gutterBottom>By Category</Typography>
              {categoryTotals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No expenses this month.</Typography>
              ) : (
                categoryTotals.map((cat) => {
                  const pct = totalAmount > 0 ? (parseFloat(cat.total) / totalAmount) * 100 : 0;
                  return (
                    <Box key={cat.category__name} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Chip
                          label={cat.category__name}
                          size="small"
                          sx={{ backgroundColor: cat.category__color, color: '#fff' }}
                        />
                        <Typography variant="body2">
                          ₹{parseFloat(cat.total).toFixed(2)} ({cat.count})
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8, borderRadius: 4,
                          '& .MuiLinearProgress-bar': { backgroundColor: cat.category__color }
                        }}
                      />
                    </Box>
                  );
                })
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Typography variant="h6" gutterBottom>Daily Totals</Typography>
              {dailyTotals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No expenses this month.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Transactions</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyTotals.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>{day.date}</TableCell>
                          <TableCell align="right">{day.count}</TableCell>
                          <TableCell align="right">₹{parseFloat(day.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
