import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { accents, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' };
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Turn a scope descriptor into the {dateFrom, dateTo} the existing fetch wants.
 * Dates are formatted in local time so a month boundary isn't dragged across by
 * a UTC offset. 'all' clears the range, restoring the un-scoped list.
 */
export function scopeRange(scope) {
  if (!scope || scope.mode === 'all') return { dateFrom: '', dateTo: '' };
  if (scope.mode === 'last30') {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }
  // month
  const from = new Date(scope.year, scope.month, 1);
  const to = new Date(scope.year, scope.month + 1, 0);
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

/** A scope descriptor for the month containing today. */
export function currentMonthScope() {
  const now = new Date();
  return { mode: 'month', year: now.getFullYear(), month: now.getMonth() };
}

const SEGMENTS = [
  { id: 'month', label: 'This month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'all', label: 'All' },
];

/**
 * Restrained scope control: a monochrome segmented pill (This month / Last 30 /
 * All) with month prev/next stepping when a month is in view. Selecting a
 * segment or stepping a month calls onScope with a fresh descriptor; the page
 * maps it through scopeRange into the same date filter the list already reads,
 * so the SPENT/INCOME/BALANCE header and the timeline move together.
 */
export default function ActivityScopeBar({ scope, onScope }) {
  const inMonth = scope?.mode === 'month';
  const now = new Date();
  const atCurrentMonth = inMonth && scope.year === now.getFullYear() && scope.month === now.getMonth();

  const pick = (id) => {
    if (id === 'month') onScope(currentMonthScope());
    else if (id === 'last30') onScope({ mode: 'last30' });
    else onScope({ mode: 'all' });
  };

  const stepMonth = (delta) => {
    const d = new Date(scope.year, scope.month + delta, 1);
    onScope({ mode: 'month', year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
      {/* segmented pill */}
      <Box
        role="tablist"
        aria-label="Date scope"
        sx={{
          display: 'inline-flex', p: '3px', borderRadius: 999,
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}
      >
        {SEGMENTS.map((seg) => {
          const active = seg.id === scope?.mode;
          return (
            <Box
              key={seg.id}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              onClick={() => pick(seg.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(seg.id); } }}
              sx={{
                px: { xs: 1.25, sm: 1.75 }, py: 0.6, borderRadius: 999, cursor: 'pointer',
                fontSize: 12.5, fontWeight: active ? 650 : 500,
                letterSpacing: '-0.01em', whiteSpace: 'nowrap', userSelect: 'none',
                color: active ? 'text.primary' : 'text.secondary',
                bgcolor: active ? 'action.selected' : 'transparent',
                transition: 'color 140ms ease, background-color 140ms ease',
                '&:hover': { color: 'text.primary' },
                '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
              }}
            >
              {seg.label}
            </Box>
          );
        })}
      </Box>

      {/* month stepper — only meaningful when a month is in view */}
      {inMonth && (
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.25,
            border: '1px solid', borderColor: 'divider', borderRadius: 999,
            bgcolor: 'background.paper', pl: 0.25, pr: 0.25,
          }}
        >
          <IconButton size="small" onClick={() => stepMonth(-1)} aria-label="Previous month" sx={{ width: 30, height: 30 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600, minWidth: 74, textAlign: 'center', color: 'text.primary' }}>
            {MONTHS[scope.month]} {scope.year}
          </Typography>
          <IconButton
            size="small"
            onClick={() => stepMonth(1)}
            disabled={atCurrentMonth}
            aria-label="Next month"
            sx={{ width: 30, height: 30 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
