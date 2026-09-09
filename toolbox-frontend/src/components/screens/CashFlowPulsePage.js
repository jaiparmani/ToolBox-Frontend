/**
 * CashFlow Pulse — the viewport into the constellation.
 *
 * There is no page chrome. No header, no metric cards, no taxonomy strip.
 * Every readout lives inside the WebGL world: category names billboard above
 * their gravity wells, month totals orbit the central sun, and the focused
 * transaction's receipt is a canvas-texture plane anchored in space.
 *
 * The only DOM this file renders on top of the canvas is a single-line
 * control legend that fades out once the user has interacted — plus the
 * loading and empty states, which need real text.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { getExpenses, getExpenseSummary } from '../rest/expenseTrackerApis';
import { EmptyState } from '../ui';
import FinancialConstellation from '../ui/FinancialConstellation';
import { accents } from '../../theme/tokens';

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';

export default function CashFlowPulsePage() {
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [touched, setTouched] = useState(false);

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

  // Normalize raw transactions — the constellation positions each one individually.
  const transactions = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .filter(e => (e.type || 'expense') !== 'income')
      .map(e => ({
        id: e.id,
        amount: Math.abs(Number(e.amount) || 0),
        date: typeof e.date === 'string' ? e.date.slice(0, 10)
          : e.date instanceof Date ? e.date.toISOString().slice(0, 10) : '',
        type: 'expense',
        description: e.description || e.note || e.title || '',
        category: e.category || { name: 'Uncategorized' },
      }))
      .filter(e => e.amount > 0 && e.date);
  }, [expenses]);

  const hasData = transactions.length > 0;

  return (
    <Box sx={{
      position: 'relative',
      bgcolor: '#04050a',
      // Break out of the shell's padding — the void should reach the edges.
      mx: { xs: -1, sm: -2, md: -3 }, mt: -2, mb: -3,
      minHeight: 'calc(100vh - 56px)',
      overflow: 'hidden',
    }}>
      {loading ? (
        <ConstellationBoot />
      ) : hasData ? (
        <Box
          sx={{ position: 'relative', height: 'calc(100vh - 56px)' }}
          onPointerDown={() => setTouched(true)}
          onWheel={() => setTouched(true)}
        >
          <FinancialConstellation
            transactions={transactions}
            net={summary?.netBalance ?? 0}
            income={summary?.totalIncome ?? 0}
            height="100%"
          />

          {/* The only chrome: a control legend that retreats once you've engaged. */}
          <Box sx={{
            position: 'absolute', bottom: 18, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
            opacity: touched ? 0.16 : 0.5,
            transition: 'opacity 900ms cubic-bezier(0.32,0.72,0,1)',
          }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.34em',
              color: 'rgba(180,200,235,0.9)', textTransform: 'uppercase',
            }}>
              drag · orbit &nbsp;|&nbsp; scroll · dolly &nbsp;|&nbsp; move · attract &nbsp;|&nbsp; 1–7 · focus well &nbsp;|&nbsp; r · reset
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 10 }}>
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title="The void is empty"
            description="Log spending this month and your constellation will form — every transaction becomes a star, every category a gravity well, every subscription a line between them."
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * Boot sequence — a quiet monospace readout while the month is fetched.
 * Deliberately not a spinner; the instrument should feel like it is
 * calibrating, not loading.
 */
function ConstellationBoot() {
  const lines = useMemo(() => ([
    'INITIALIZING FIELD',
    'RESOLVING GRAVITY WELLS',
    'PLOTTING TRANSACTIONS',
  ]), []);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % lines.length), 900);
    return () => clearInterval(id);
  }, [lines.length]);
  return (
    <Box sx={{
      height: 'calc(100vh - 56px)', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#04050a',
    }}>
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(100,210,255,0.05), transparent 60%)',
      }} />
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Box sx={{
          width: 44, height: 44, mx: 'auto', mb: 3,
          border: `1px solid ${accents.cyan}`, borderRadius: '50%',
          opacity: 0.35,
          animation: 'breathe 2.4s ease-in-out infinite',
          '@keyframes breathe': {
            '0%, 100%': { transform: 'scale(0.82)', opacity: 0.2 },
            '50%': { transform: 'scale(1)', opacity: 0.5 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
        <Typography sx={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em',
          color: accents.cyan, opacity: 0.65, textTransform: 'uppercase',
        }}>
          {lines[step]}
        </Typography>
      </Box>
    </Box>
  );
}
