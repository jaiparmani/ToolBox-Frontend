import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

/**
 * Income vs spend — what's actually left this month.
 *
 * Reframes the dashboard from a spend-tracker to a money view. Every figure is
 * real: `income` is this month's tracked income (from the summary endpoint,
 * scoped month-to-date) and `spent` is the SAME netted-share figure the hero
 * shows — so "left" (income − spent) reconciles with the rest of the page.
 * Honesty gate: renders nothing unless real income has been logged this month,
 * because "money left" is meaningless without it. When spend outruns income the
 * remainder goes negative and turns red rather than pretending you're in the
 * black.
 */
export default function DashMonthFlow({ income = 0, spent = 0, monthName = '' }) {
  // Gate: no income tracked → no honest "money left" to show.
  if (!(income > 0)) return null;

  const left = income - spent;
  const over = left < 0;
  const spentPct = Math.max(0, Math.min(100, (spent / income) * 100));
  const leftPct = Math.max(0, 100 - spentPct);
  const keptPct = Math.round(leftPct); // savings rate this month, so far

  return (
    <Box
      role="group"
      aria-label={`This month you've earned ${money(income)} and spent ${money(spent)}, leaving ${over ? `${money(Math.abs(left))} over budget` : money(left)}.`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
        <Eyebrow>{over ? 'Over budget this month' : 'Money left this month'}</Eyebrow>
        {!over && (
          <Typography sx={{ ...num, fontSize: 11.5, color: 'text.secondary' }} noWrap>
            <Box component="span" sx={{ color: GREEN, fontWeight: 650 }}>{keptPct}%</Box> kept
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ ...num, fontSize: { xs: 28, sm: 32 }, fontWeight: 640, letterSpacing: '-0.03em', lineHeight: 1, color: over ? accents.red : GREEN }}>
          {over ? `−${money(Math.abs(left))}` : money(left)}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>of {moneySmart(income)} earned</Typography>
      </Box>

      {/* two-tone bar: monochrome = spent, mint = what's left of income */}
      <Box sx={{ position: 'relative', height: 10, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden', mt: 2 }}>
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${spentPct}%`, bgcolor: over ? accents.red : 'text.disabled' }} />
        {!over && leftPct > 0 && (
          <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${leftPct}%`, bgcolor: GREEN, borderRadius: '0 999px 999px 0' }} />
        )}
      </Box>

      {/* earned · spent · left — the three real figures, side by side */}
      <Box sx={{ display: 'flex', alignItems: 'stretch', mt: 2, pt: 1.75, borderTop: '1px solid', borderColor: 'divider' }}>
        {[
          { label: 'Earned', value: money(income), color: 'text.primary' },
          { label: 'Spent', value: money(spent), color: 'text.primary' },
          { label: over ? 'Over' : 'Left', value: over ? money(Math.abs(left)) : money(left), color: over ? accents.red : GREEN },
        ].map((s, i) => (
          <Box key={s.label} sx={{ flex: 1, minWidth: 0, px: { xs: 0.5, sm: 1 }, borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ ...num, fontSize: { xs: 14.5, sm: 16 }, fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1.1, color: s.color }} noWrap>{s.value}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em', mt: 0.4 }} noWrap>{s.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
