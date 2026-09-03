import React from 'react';
import { Box, Typography } from '@mui/material';
import { money } from './money';
import { accents, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } };

function daysUntil(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
function dueLabel(n, iso) {
  if (n <= 0) return 'due today';
  if (n === 1) return 'tomorrow';
  if (n < 7) return `in ${n} days`;
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * What's coming — the committed spend a person needs to see BEFORE it lands.
 * Reads the user's recurring rules (bills/subscriptions) and shows the next few
 * expense charges by their computed next_date, plus the total due in the next 30
 * days. Every figure is a real rule amount; nothing is projected or invented.
 * Renders nothing when there are no upcoming bills.
 */
export default function DashUpcomingBills({ rules = [] }) {
  const { items, soon } = React.useMemo(() => {
    const list = (rules || [])
      .filter((r) => r.transaction_type === 'expense' && r.is_active !== false && r.next_date)
      .map((r) => ({
        id: r.id,
        name: r.description || r.category_name || 'Bill',
        sub: r.category_name || (r.cadence ? `${r.cadence}` : ''),
        amount: Math.abs(Number(r.amount) || 0),
        date: r.next_date,
        days: daysUntil(r.next_date),
      }))
      .sort((a, b) => a.days - b.days);
    const soonTotal = list.filter((x) => x.days <= 30).reduce((s, x) => s + x.amount, 0);
    return { items: list.slice(0, 5), soon: soonTotal };
  }, [rules]);

  if (!items.length) return null;

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Upcoming bills</Typography>
        {soon > 0 && (
          <Typography sx={{ ...num, fontSize: 12, color: 'text.secondary' }}>{money(soon)} · next 30d</Typography>
        )}
      </Box>
      {items.map((b, i, arr) => {
        const urgent = b.days <= 3;
        return (
          <Box key={b.id ?? i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.85,
            borderBottom: i === arr.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 12.75, fontWeight: 550, color: 'text.primary' }} noWrap>{b.name}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 500, color: urgent ? accents.amber : 'text.disabled' }} noWrap>
                {dueLabel(b.days, b.date)}{b.sub ? ` · ${b.sub}` : ''}
              </Typography>
            </Box>
            <Typography sx={{ ...num, fontSize: 13, fontWeight: 600 }}>{money(b.amount)}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
