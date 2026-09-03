import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

const LB = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

/**
 * This week vs the same stretch of last week — a fair, same-period read.
 *
 * Pure fact: each day's bar is that date's spend (your netted share) summed from
 * the merged current + previous month `daily_totals`, so the current week is
 * counted Mon→today and compared against Mon→same-weekday of last week — never
 * a partial week against a full one. Each column carries a faint ghost bar for
 * the same weekday last week, and the headline delta only appears when last week
 * actually had spend to compare against. Renders nothing until either week has
 * real activity.
 */
export default function DashWeekCompare({ dailyTotals = [] }) {
  const { days, thisWeek, lastWeekSame, todayLabel } = React.useMemo(() => {
    const map = new Map();
    for (const d of dailyTotals || []) {
      if (!d?.date) continue;
      const key = String(d.date).slice(0, 10);
      map.set(key, (map.get(key) || 0) + (Number(d.total) || 0));
    }
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = (today0.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
    const mon = new Date(today0); mon.setDate(today0.getDate() - dow);
    const todayKey = iso(today0);

    const out = []; let tw = 0, lw = 0;
    for (let i = 0; i < 7; i++) {
      const dt = new Date(mon); dt.setDate(mon.getDate() + i);
      const amt = map.get(iso(dt)) || 0;
      const isFuture = dt > today0;
      const isToday = iso(dt) === todayKey;
      const prev = new Date(dt); prev.setDate(dt.getDate() - 7);
      const lwAmt = map.get(iso(prev)) || 0;
      if (!isFuture) { tw += amt; lw += lwAmt; }
      out.push({ label: LB[i], amount: amt, lwAmt, isFuture, isToday });
    }
    return { days: out, thisWeek: tw, lastWeekSame: lw, todayLabel: LB[dow] };
  }, [dailyTotals]);

  if (thisWeek <= 0 && lastWeekSame <= 0) return null;

  const delta = lastWeekSame > 0 ? ((thisWeek - lastWeekSame) / lastWeekSame) * 100 : null;
  const max = Math.max(1, ...days.map((d) => Math.max(d.amount, d.lwAmt)));

  return (
    <Box
      role="group"
      aria-label={`This week you have spent ${money(thisWeek)} so far${lastWeekSame > 0 ? `, versus ${money(lastWeekSame)} over the same days last week` : ''}.`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25, gap: 1 }}>
        <Eyebrow>This week</Eyebrow>
        {delta != null && (
          <Typography sx={{ ...num, fontSize: 12, fontWeight: 650, color: delta <= 0 ? GREEN : accents.amber }} noWrap>
            {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs last week
          </Typography>
        )}
      </Box>
      <Typography sx={{ ...num, fontSize: { xs: 26, sm: 30 }, fontWeight: 640, letterSpacing: '-0.03em', lineHeight: 1.1, mb: 1.75 }}>
        {money(thisWeek)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1 }, height: 84 }}>
        {days.map((d, i) => {
          const amtPct = d.amount > 0 ? Math.max(6, (d.amount / max) * 100) : 0;
          const ghostPct = d.lwAmt > 0 ? Math.max(3, (d.lwAmt / max) * 100) : 0;
          return (
            <Box key={i} sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
              <Box sx={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {/* same weekday, last week — a faint reference */}
                {ghostPct > 0 && (
                  <Box aria-hidden title={`Last ${d.label} · ${money(d.lwAmt)}`}
                    sx={{ position: 'absolute', bottom: 0, width: '100%', height: `${ghostPct}%`, borderRadius: '4px 4px 2px 2px', bgcolor: 'action.hover' }} />
                )}
                {/* this week */}
                {amtPct > 0 && (
                  <Box title={`${d.label} · ${money(d.amount)}`}
                    sx={{ position: 'relative', zIndex: 1, width: '58%', height: `${amtPct}%`, borderRadius: '4px 4px 2px 2px',
                      bgcolor: d.isToday ? GREEN : `${GREEN}55` }} />
                )}
              </Box>
              <Typography sx={{ fontSize: 10, color: d.isToday ? 'text.secondary' : 'text.disabled', fontWeight: d.isToday ? 650 : 500, letterSpacing: '0.02em' }} noWrap>{d.label}</Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: GREEN }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>this week</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: 'action.hover' }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>last week</Typography>
          </Box>
        </Box>
        {lastWeekSame > 0 && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }} noWrap>
            <Box component="span" sx={{ ...num, color: 'text.secondary' }}>{moneySmart(lastWeekSame)}</Box> by {todayLabel}
          </Typography>
        )}
      </Box>

      {/* text path to every real figure, for assistive tech */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -0.125, p: 0 }}>
        {days.map((d, i) => (
          <li key={i}>{d.label}: {moneySmart(d.amount)} this week, {moneySmart(d.lwAmt)} last week</li>
        ))}
      </Box>
    </Box>
  );
}
