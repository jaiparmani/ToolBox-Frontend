import React from 'react';
import { Box, Typography } from '@mui/material';
import { money } from './money';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const BAR = '#35c98a';
const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } };
const isIncome = (e) => e.transaction_type === 'income' || e.type === 'income';

/**
 * Where the money actually goes, by name — the merchant/description view the
 * category donut can't give. Groups this month's expenses by description,
 * summing YOUR share (split-adjusted), and ranks the top five with a magnitude
 * bar and how many times each recurred. Pure data: every figure is a real sum,
 * reachable in the row. Renders nothing until there are at least two distinct
 * merchants, so it never shows a one-item "ranking".
 */
export default function DashTopMerchants({ expenses = [] }) {
  const rows = React.useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      if (isIncome(e)) continue;
      const amt = yourShareOf(e);
      if (amt <= 0) continue;
      const key = ((e.description || e.category?.name || 'Other').trim()) || 'Other';
      const cur = map.get(key) || { name: key, amount: 0, count: 0, color: e.category?.color };
      cur.amount += amt;
      cur.count += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [expenses]);

  if (rows.length < 2) return null;
  const max = rows[0].amount || 1;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>Top merchants</Typography>
      {rows.map((r) => (
        <Box key={r.name} sx={{ py: 0.7 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: r.color || 'text.disabled' }} />
            <Typography sx={{ flex: 1, fontSize: 12.75, fontWeight: 550, color: 'text.primary' }} noWrap>{r.name}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{r.count}×</Typography>
            <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600 }}>{money(r.amount)}</Typography>
          </Box>
          <Box aria-hidden sx={{ height: 3, borderRadius: 999, bgcolor: 'action.hover', mt: 0.5, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.max(3, (r.amount / max) * 100)}%`, bgcolor: BAR, borderRadius: 999 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
