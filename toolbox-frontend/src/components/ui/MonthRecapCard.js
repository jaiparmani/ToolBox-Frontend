import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import { accents, type } from '../../theme/tokens';
import { dashCardSx } from './DashSurface';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);
const DISMISS_KEY = 'toolbox:recap-dismissed';

/**
 * A brief look back at the month that just ended — total spent, where most of
 * it went, the single heaviest day, and the longest stretch without a single
 * expense. Every figure comes straight from that month's own monthly_report
 * (already share-only, via net_spending), nothing computed here that isn't
 * already sitting in the response.
 *
 * Shown only in the first week of a new month (while "last month" is still
 * the relevant past, not ancient history) and dismissible per month — the
 * dismissal is remembered by year-month so next month's recap isn't
 * pre-dismissed by this one.
 */
export function shouldShowRecap({ dayOfMonth, lastReport, dismissedKey }) {
  if (!lastReport || !(Number(lastReport.total_amount) > 0)) return false;
  if (dayOfMonth > 7) return false;
  try {
    const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
    if (dismissed.includes(dismissedKey)) return false;
  } catch { /* private mode or corrupt value — show it rather than fail closed */ }
  return true;
}

function dismissRecap(dismissedKey) {
  try {
    const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
    if (!dismissed.includes(dismissedKey)) {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed, dismissedKey].slice(-12)));
    }
  } catch { /* private mode — dismissal just won't stick, not worth failing over */ }
}

/** Longest run of consecutive days with no recorded spend, across the whole month. */
function longestQuietStreak(dailyTotals, year, month, daysInMonth) {
  const active = new Set((dailyTotals || []).filter((d) => Number(d.total) > 0).map((d) => d.date));
  let longest = 0;
  let current = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (active.has(key)) current = 0;
    else { current += 1; longest = Math.max(longest, current); }
  }
  return longest;
}

export default function MonthRecapCard({ lastReport, monthName, onDismiss }) {
  const reduce = useReducedMotion();
  if (!lastReport || !(Number(lastReport.total_amount) > 0)) return null;

  const { year, month, daily_totals: dailyTotals = [], category_totals: categoryTotals = [], total_amount: total, total_count: count } = lastReport;
  const daysInMonth = new Date(year, month, 0).getDate();
  const topCategory = categoryTotals[0] || null;
  const busiest = dailyTotals.reduce((m, d) => (Number(d.total) > (m ? Number(m.total) : -1) ? d : m), null);
  const streak = longestQuietStreak(dailyTotals, year, month, daysInMonth);
  const dismissedKey = `${year}-${String(month).padStart(2, '0')}`;

  const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const stats = [
    { label: 'Total spent', value: money(total), sub: `${count} transaction${count === 1 ? '' : 's'}` },
    topCategory && { label: 'Top category', value: topCategory.category__name || 'Uncategorised', sub: moneySmart(topCategory.total) },
    busiest && { label: 'Heaviest day', value: fmtDay(busiest.date), sub: moneySmart(busiest.total) },
    streak > 0 && { label: 'Quietest stretch', value: `${streak} day${streak === 1 ? '' : 's'}`, sub: 'no spend at all' },
  ].filter(Boolean);

  return (
    <Box
      component={reduce ? 'div' : framerMotion.div}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="group"
      aria-label={`${monthName} recap: ${money(total)} spent across ${count} transactions.`}
      sx={{ ...dashCardSx, position: 'relative' }}
    >
      <IconButton
        size="small"
        aria-label="Dismiss recap"
        onClick={() => { dismissRecap(dismissedKey); onDismiss?.(); }}
        sx={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, color: 'text.disabled' }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Eyebrow>{monthName} recap</Eyebrow>
      <Typography sx={{ ...num, fontSize: { xs: 24, sm: 28 }, fontWeight: 650, letterSpacing: '-0.03em', mt: 0.5, mb: 2 }}>
        {money(total)}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}>
        {stats.slice(1).map((s, i) => (
          <Box key={i} sx={{ minWidth: 100 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</Typography>
            <Typography sx={{ ...num, fontSize: 11.5, color: GREEN }}>{s.sub}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
