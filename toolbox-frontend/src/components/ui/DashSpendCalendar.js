import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// JS getDay(): 0=Sun..6=Sat → column in a Monday-first grid.
const MON_FIRST = [6, 0, 1, 2, 3, 4, 5];
const pad = (n) => String(n).padStart(2, '0');
const alphaHex = (a) => pad(Math.max(0, Math.min(255, Math.round(a * 255))).toString(16));

/**
 * A quiet month heatmap of the days money actually went out.
 *
 * Pure fact: each cell is one calendar day, tinted by that day's netted spend
 * (`daily_totals`) relative to the heaviest day — no averaging, no projection.
 * Date keys are built locally (YYYY-MM-DD) to match the report's own keys, so
 * nothing shifts across timezones. The exact figure for every spending day is on
 * its tooltip, in the header readout, and in a visually-hidden list; future days
 * carry no data and render as empty placeholders. Renders nothing until spend has
 * landed on enough days to read as a pattern.
 */
export default function DashSpendCalendar({ dailyTotals = [] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const { weeks, max, active, heaviest, monthLabel } = React.useMemo(() => {
    const map = new Map((dailyTotals || []).map((d) => [d.date, Number(d.total) || 0]));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstCol = MON_FIRST[new Date(year, month, 1).getDay()];
    const cells = [];
    for (let i = 0; i < firstCol; i++) cells.push(null);
    let mx = 0, act = 0, hi = null;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      const amt = map.get(key) || 0;
      if (amt > 0) { act += 1; if (amt > mx) { mx = amt; hi = { day: d, amount: amt }; } }
      cells.push({ day: d, amt, future: d > today });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const wk = [];
    for (let i = 0; i < cells.length; i += 7) wk.push(cells.slice(i, i + 7));
    return {
      weeks: wk, max: mx, active: act, heaviest: hi,
      monthLabel: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long' }),
    };
  }, [dailyTotals, year, month, today]);

  // Not a pattern until money has moved on at least four separate days.
  if (active < 4 || !heaviest || max <= 0) return null;

  const heaviestDate = new Date(year, month, heaviest.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <Box
      role="group"
      aria-label={`Daily spend across ${monthLabel}. Money went out on ${active} days; heaviest was ${heaviestDate} at ${money(heaviest.amount)}.`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5, gap: 1 }}>
        <Eyebrow>Daily spend</Eyebrow>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
          Heaviest <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{heaviestDate}</Box> · <Box component="span" sx={{ ...num }}>{money(heaviest.amount)}</Box>
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }} aria-hidden>
        {WD.map((w, i) => (
          <Typography key={i} sx={{ textAlign: 'center', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: 'text.disabled' }}>{w}</Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }} aria-hidden>
        {weeks.flat().map((c, i) => {
          if (!c) return <Box key={i} sx={{ aspectRatio: '1 / 1' }} />;
          const isToday = c.day === today;
          const on = c.amt > 0;
          // Perceptual floor so a small spend day still reads above an empty one.
          const t = on ? 0.22 + 0.78 * Math.sqrt(c.amt / max) : 0;
          return (
            <Box
              key={i}
              title={`${c.day} ${monthLabel.slice(0, 3)} · ${on ? money(c.amt) : (c.future ? 'upcoming' : 'nothing spent')}`}
              sx={{
                aspectRatio: '1 / 1', borderRadius: '5px', display: 'grid', placeItems: 'center',
                bgcolor: on ? `${GREEN}${alphaHex(t)}` : (c.future ? 'transparent' : 'action.hover'),
                border: isToday ? '1.5px solid' : (c.future ? '1px dashed' : '1px solid transparent'),
                borderColor: isToday ? GREEN : (c.future ? 'divider' : 'transparent'),
                transition: 'background-color .12s ease',
              }}
            >
              <Typography sx={{
                ...num, fontSize: 10, lineHeight: 1, fontWeight: isToday ? 700 : 500,
                color: on ? (t > 0.55 ? '#04150e' : 'text.primary') : (c.future ? 'text.disabled' : 'text.secondary'),
                opacity: c.future ? 0.55 : 1,
              }}>{c.day}</Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          <Box component="span" sx={{ ...num, color: 'text.secondary', fontWeight: 600 }}>{active}</Box> active {active === 1 ? 'day' : 'days'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} aria-hidden>
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>less</Typography>
          {[0.22, 0.45, 0.68, 1].map((t, i) => (
            <Box key={i} sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: `${GREEN}${alphaHex(t)}` }} />
          ))}
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>more</Typography>
        </Box>
      </Box>

      {/* text path to every real figure, for assistive tech */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -0.125, p: 0 }}>
        {weeks.flat().filter((c) => c && c.amt > 0).map((c) => (
          <li key={c.day}>{c.day} {monthLabel}: {moneySmart(c.amt)}</li>
        ))}
      </Box>
    </Box>
  );
}
