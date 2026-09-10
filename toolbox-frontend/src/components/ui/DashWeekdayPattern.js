import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { dashCardSx } from './DashSurface';
import { money, moneySmart } from './money';
import BarGrow from './BarGrow';

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

  // hovered (desktop) takes over from picked (tap-to-pin, works without a mouse)
  const [pointedIdx, setPointedIdx] = React.useState(null);
  const [pickedIdx, setPickedIdx] = React.useState(null);
  const shownIdx = pointedIdx ?? pickedIdx;

  // Not a pattern until spend lands on at least three different weekdays.
  if (!(total > 0) || activeWeekdays < 3 || !heaviest) return null;
  const max = Math.max(...buckets) || 1;
  const shownAmount = shownIdx != null ? buckets[shownIdx] : null;

  return (
    <Box
      role="group"
      aria-label={`Spending by weekday this month. Heaviest on ${LABELS[heaviest.i]}, ${money(heaviest.amount)}.`}
      sx={dashCardSx}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.75, gap: 1 }}>
        <Eyebrow>Spending by weekday</Eyebrow>
        {shownIdx != null ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{LABELS[shownIdx]}</Box> · <Box component="span" sx={{ ...num }}>{shownAmount > 0 ? money(shownAmount) : 'nothing spent'}</Box>
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
            Heaviest <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{LABELS[heaviest.i]}</Box> · <Box component="span" sx={{ ...num }}>{money(heaviest.amount)}</Box>
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1.25 } }}>
        {buckets.map((v, i) => {
          const isMax = i === heaviest.i && v > 0;
          const isPicked = pickedIdx === i;
          const h = v > 0 ? Math.max(6, (v / max) * 100) : 2;
          const toggle = () => setPickedIdx((cur) => (cur === i ? null : i));
          return (
            <Box
              key={i}
              role="button" tabIndex={0}
              aria-label={`${LABELS[i]} · ${v > 0 ? money(v) : 'nothing spent'}`}
              aria-pressed={isPicked}
              onMouseEnter={() => setPointedIdx(i)}
              onMouseLeave={() => setPointedIdx(null)}
              onFocus={() => setPointedIdx(i)}
              onBlur={() => setPointedIdx(null)}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              sx={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
                cursor: 'pointer', outline: 'none', borderRadius: '6px',
                '&:focus-visible': { boxShadow: `0 0 0 2px ${GREEN}` },
              }}
            >
              {/* fixed-height label row, independent of the bar track below, so the tallest bar's own value never gets pushed out the top */}
              <Typography sx={{ ...num, fontSize: 9.5, height: 12, lineHeight: '12px', color: isMax ? 'text.primary' : 'text.disabled', fontWeight: isMax ? 650 : 500, visibility: v > 0 ? 'visible' : 'hidden' }} noWrap>
                {moneySmart(v)}
              </Typography>
              <Box sx={{ width: '100%', height: 74, display: 'flex', alignItems: 'flex-end' }}>
                <BarGrow
                  heightPct={h} index={i}
                  title={`${LABELS[i]} · ${money(v)}`}
                  sx={{
                    width: '100%', borderRadius: '5px 5px 3px 3px',
                    bgcolor: v <= 0 ? 'action.hover' : isMax ? GREEN : `${GREEN}3d`,
                    outline: isPicked ? `1.5px solid ${GREEN}` : 'none', outlineOffset: '1px',
                    transition: 'background-color .12s ease',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 10.5, color: (isMax || isPicked) ? 'text.secondary' : 'text.disabled', fontWeight: (isMax || isPicked) ? 600 : 500, letterSpacing: '0.02em' }}>{LABELS[i]}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
