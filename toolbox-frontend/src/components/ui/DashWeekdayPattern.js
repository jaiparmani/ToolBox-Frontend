import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// JS getDay(): 0=Sun..6=Sat → index into a Monday-first row.
const MON_FIRST = [6, 0, 1, 2, 3, 4, 5];

/**
 * Which day of the week your money actually goes out on, this month.
 *
 * Pure fact: each bar is the sum of `daily_totals` (your netted share) whose
 * date falls on that weekday — no averaging, no projection. Heights are relative
 * to the heaviest weekday; the exact figure is on every bar's tooltip, in the
 * caption, and in the aria-label. Renders nothing until spending is spread
 * across enough of the week to actually be a pattern.
 */
export default function DashWeekdayPattern({ dailyTotals = [] }) {
  const { buckets, total, activeWeekdays, heaviest } = React.useMemo(() => {
    const b = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dailyTotals || []) {
      const amt = Number(d.total) || 0;
      if (amt <= 0 || !d.date) continue;
      const day = new Date(d.date).getDay();
      b[MON_FIRST[day]] += amt;
    }
    const t = b.reduce((s, v) => s + v, 0);
    const active = b.filter((v) => v > 0).length;
    let hi = -1, hiVal = -1;
    b.forEach((v, i) => { if (v > hiVal) { hiVal = v; hi = i; } });
    return { buckets: b, total: t, activeWeekdays: active, heaviest: hiVal > 0 ? { i: hi, amount: hiVal } : null };
  }, [dailyTotals]);

  // Not a pattern until spend lands on at least three different weekdays.
  if (!(total > 0) || activeWeekdays < 3 || !heaviest) return null;
  const max = Math.max(...buckets) || 1;

  return (
    <Box
      role="group"
      aria-label={`Spending by weekday this month. Heaviest on ${LABELS[heaviest.i]}, ${money(heaviest.amount)}.`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.75 }}>
        <Eyebrow>Spending by weekday</Eyebrow>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          Heaviest <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{LABELS[heaviest.i]}</Box> · <Box component="span" sx={{ ...num }}>{money(heaviest.amount)}</Box>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1.25 }, height: 96 }}>
        {buckets.map((v, i) => {
          const isMax = i === heaviest.i && v > 0;
          const h = v > 0 ? Math.max(6, (v / max) * 100) : 2;
          return (
            <Box key={i} sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
              {v > 0 && (
                <Typography sx={{ ...num, fontSize: 9.5, color: isMax ? 'text.primary' : 'text.disabled', fontWeight: isMax ? 650 : 500, lineHeight: 1 }} noWrap>
                  {moneySmart(v)}
                </Typography>
              )}
              <Box
                title={`${LABELS[i]} · ${money(v)}`}
                sx={{
                  width: '100%', height: `${h}%`, borderRadius: '5px 5px 3px 3px',
                  bgcolor: v <= 0 ? 'action.hover' : isMax ? GREEN : `${GREEN}3d`,
                  transition: 'background-color .12s ease',
                }}
              />
              <Typography sx={{ fontSize: 10.5, color: isMax ? 'text.secondary' : 'text.disabled', fontWeight: isMax ? 600 : 500, letterSpacing: '0.02em' }}>{LABELS[i]}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
