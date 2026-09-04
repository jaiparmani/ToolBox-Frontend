import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { accents, type, motion, radius, color } from '../../theme/tokens';

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
      {/* segmented pill — taller touch targets, distinct active state */}
      <Box
        role="tablist"
        aria-label="Date scope"
        sx={{
          display: 'inline-flex', p: '3px', borderRadius: radius.pill,
          border: '1px solid', borderColor: 'divider',
          bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
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
                position: 'relative',
                px: { xs: 1.5, sm: 2 }, py: { xs: 0.85, sm: 0.85 },
                borderRadius: radius.pill, cursor: 'pointer',
                fontSize: { xs: 12.5, sm: 13 }, fontWeight: active ? 650 : 500,
                letterSpacing: '-0.01em', whiteSpace: 'nowrap', userSelect: 'none',
                color: active ? 'text.primary' : 'text.secondary',
                bgcolor: active ? 'background.paper' : 'transparent',
                boxShadow: active
                  ? (t) => t.palette.mode === 'dark'
                    ? '0 1px 3px rgba(0,0,0,0.4)'
                    : '0 1px 3px rgba(0,0,0,0.08)'
                  : 'none',
                transition: `color ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}, box-shadow ${motion.fast}ms ${motion.ease}`,
                '&:hover': { color: 'text.primary' },
                '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
                /* thin accent underline on the active segment */
                '&::after': active ? {
                  content: '""', position: 'absolute',
                  bottom: 4, left: '25%', right: '25%', height: 2,
                  borderRadius: 1, bgcolor: accents.blue,
                  opacity: 0.7,
                } : {},
              }}
            >
              {seg.label}
            </Box>
          );
        })}
      </Box>

      {/* month stepper — wraps gracefully on narrow screens */}
      {inMonth && (
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.25,
            border: '1px solid', borderColor: 'divider', borderRadius: radius.pill,
            bgcolor: 'background.paper', pl: 0.5, pr: 0.5,
            flexShrink: 0, minWidth: 0,
          }}
        >
          <IconButton
            size="small"
            onClick={() => stepMonth(-1)}
            aria-label="Previous month"
            sx={{ width: 32, height: 32 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ ...num, fontSize: 13, fontWeight: 600, minWidth: 76, textAlign: 'center', color: 'text.primary' }}>
            {MONTHS[scope.month]} {scope.year}
          </Typography>
          <IconButton
            size="small"
            onClick={() => stepMonth(1)}
            disabled={atCurrentMonth}
            aria-label="Next month"
            sx={{ width: 32, height: 32 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
