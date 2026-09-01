import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import BubbleChartRoundedIcon from '@mui/icons-material/BubbleChartRounded';

import { useMoney } from '../../contexts/MoneyContext';
import { getExpenseSummary } from '../rest/expenseTrackerApis';
import { PageHeader, EmptyState, MoneyUniverse } from '../ui';
import Reveal from '../ui/Reveal';
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

  const hasData = !!expense && (expense.totalIncome > 0 || (expense.categoryBreakdown || []).length > 0 || Math.abs(expense.netBalance || 0) > 0);

  return (
    <Box sx={{ pb: 4 }}>
      <Reveal>
        <PageHeader
          icon={BubbleChartRoundedIcon}
          gradient={`linear-gradient(135deg, ${accents.violet}, ${accents.blue})`}
          glow={`${accents.violet}55`}
          title="Money Universe"
          subtitle="Your month as a spatial scene — every body a real figure"
        />
      </Reveal>

      <Reveal index={1}>
        {loading ? (
          <Box sx={{ height: 460, borderRadius: '16px', border: '1px solid', borderColor: 'divider', opacity: 0.4 }} />
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
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
            <EmptyState
              icon={BubbleChartRoundedIcon}
              title="Nothing to map yet this month"
              description="Log some income and spending and your month takes shape here — a star for your net position, orbited by where the money went."
            />
          </Box>
        )}
      </Reveal>

      {hasData && (
        <Typography sx={{ mt: 1.5, textAlign: 'center', fontSize: 12, color: 'text.disabled' }}>
          Hover a world to read it · bigger means it cost more · the centre is your net position
        </Typography>
      )}
    </Box>
  );
}
