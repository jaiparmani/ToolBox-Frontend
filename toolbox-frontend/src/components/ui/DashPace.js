import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

/**
 * Spending pace — where this month lands if the current daily rate holds.
 *
 * Every figure is real: `spent` is month-to-date, the projection is simply
 * spent ÷ elapsed-days × days-in-month (a straight-line pace, clearly labelled
 * as a projection, never presented as fact). It only renders once enough of the
 * month has passed to be honest (gated by the parent), and the reference tick is
 * last month's *actual* total. No projection is invented for a 2-day-old month.
 */
export default function DashPace({ spent = 0, dayOfMonth, daysInMonth, lastMonthTotal = 0, monthName = '' }) {
  // Honesty gate: need a real stretch of the month behind us and real spend.
  if (!(spent > 0) || !dayOfMonth || dayOfMonth < 8 || !daysInMonth || dayOfMonth >= daysInMonth) return null;

  const projected = (spent / dayOfMonth) * daysInMonth;
  const remaining = Math.max(0, projected - spent);
  const hasLast = lastMonthTotal > 0;
  const deltaPct = hasLast ? ((projected - lastMonthTotal) / lastMonthTotal) * 100 : null;

  const scaleMax = Math.max(projected, lastMonthTotal, spent) * 1.06 || 1;
  const pct = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`;

  return (
    <Box
      role="group"
      aria-label={`Projected to spend ${money(projected)} by the end of ${monthName} at the current pace. ${money(spent)} spent so far over ${dayOfMonth} of ${daysInMonth} days.${hasLast ? ` Last month you spent ${money(lastMonthTotal)}.` : ''}`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Eyebrow>On pace for</Eyebrow>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ ...num, fontSize: { xs: 26, sm: 30 }, fontWeight: 640, letterSpacing: '-0.03em', lineHeight: 1 }}>{money(projected)}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>projected · {monthName}</Typography>
          </Box>
        </Box>
        {deltaPct != null && (
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ ...num, fontSize: 13, fontWeight: 650, color: deltaPct <= 0 ? GREEN : accents.amber, lineHeight: 1 }}>
              {deltaPct <= 0 ? '↓' : '↑'} {Math.abs(deltaPct).toFixed(0)}%
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.35 }}>vs last month</Typography>
          </Box>
        )}
      </Box>

      {/* pace bar — solid = spent, translucent = projected remainder, tick = last month */}
      <Box sx={{ position: 'relative', mt: 2, mb: hasLast ? 2.25 : 0.5 }}>
        <Box sx={{ position: 'relative', height: 10, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(projected), bgcolor: `${GREEN}30` }} />
          <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(spent), bgcolor: GREEN, borderRadius: 999 }} />
        </Box>
        {hasLast && (
          <Box aria-hidden sx={{ position: 'absolute', top: -4, bottom: -4, left: pct(lastMonthTotal), width: '1.5px', bgcolor: 'text.disabled' }}>
            <Typography sx={{ position: 'absolute', top: -15, left: 0, transform: (lastMonthTotal / scaleMax) > 0.7 ? 'translateX(-100%)' : 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 9.5, color: 'text.disabled', letterSpacing: '0.02em' }}>
              last mo {money(lastMonthTotal)}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: hasLast ? 0 : 1 }}>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          <Box component="span" sx={{ ...num, color: 'text.primary', fontWeight: 600 }}>{money(spent)}</Box> spent · day {dayOfMonth} of {daysInMonth}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
          {money(remaining)} more at this rate
        </Typography>
      </Box>
    </Box>
  );
}
