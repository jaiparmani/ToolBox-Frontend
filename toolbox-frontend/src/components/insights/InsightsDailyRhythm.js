import React from 'react';
import { Box, Typography } from '@mui/material';
import { type } from '../../theme/tokens';
import { money } from '../ui/money';
import { ChartContainer } from '../ui';
import TrendBars from '../ui/TrendBars';

function Stat({ label, value }) {
  return (
    <Box sx={{
      flex: 1, p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider',
      bgcolor: 'action.hover',
    }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{
        fontFamily: type.displayFamily, fontWeight: 700, letterSpacing: '-0.02em',
        fontSize: '1.25rem', mt: 0.25, fontVariantNumeric: 'tabular-nums',
      }}>
        {money(value)}
      </Typography>
    </Box>
  );
}

/**
 * The month's daily rhythm — the day-by-day bar row, sat under the two numbers
 * that describe its pace: what a typical day and a typical transaction cost.
 * Averages are true divisions of the real total (over days elapsed for the
 * current month, days in the month for a past one).
 */
export default function InsightsDailyRhythm({ daily = [], avgPerDay = 0, avgPerTxn = 0, perDayLabel = 'Avg / day' }) {
  return (
    <ChartContainer title="Daily rhythm">
      <Box sx={{ display: 'flex', gap: 1.25, mb: 2 }}>
        <Stat label={perDayLabel} value={avgPerDay} />
        <Stat label="Avg / transaction" value={avgPerTxn} />
      </Box>
      <TrendBars data={daily} />
    </ChartContainer>
  );
}
