import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money } from '../ui/money';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { ChartContainer } from '../ui';

const fmtDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * The month's single largest expenses — the line items that actually moved the
 * total, ranked. Each row is a flat hairline strip: what it was, which category
 * (its own colour as a dot), when, and the amount in semantic red because every
 * row here is money out.
 */
export default function InsightsBiggestExpenses({ expenses = [], onSelect }) {
  // Rank by *your* share, not the full bill, so a split you mostly lent out
  // doesn't masquerade as your biggest spend.
  const rows = [...(expenses || [])]
    .sort((a, b) => yourShareOf(b) - yourShareOf(a))
    .slice(0, 5);
  if (!rows.length) return null;

  return (
    <ChartContainer title="Biggest expenses" subtitle="The five that moved the month most">
      <Stack sx={{ mt: 0.5 }}>
        {rows.map((e, i) => (
          <Box
            key={e.id ?? i}
            onClick={onSelect ? () => onSelect(e) : undefined}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, py: 1.25,
              borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
              cursor: onSelect ? 'pointer' : 'default',
              transition: 'background-color 0.15s ease',
              ...(onSelect && { '&:hover': { bgcolor: 'action.hover' } }),
              mx: onSelect ? -1 : 0, px: onSelect ? 1 : 0, borderRadius: onSelect ? '8px' : 0,
            }}
          >
            <Typography sx={{
              fontFamily: type.displayFamily, fontWeight: 650, fontSize: '0.8rem',
              color: 'text.disabled', width: 16, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
            }}>
              {i + 1}
            </Typography>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 550 }}>
                {e.description || 'Untitled'}
              </Typography>
              <Box display="flex" alignItems="center" gap={0.7} sx={{ mt: 0.25 }}>
                {e.category && (
                  <Box aria-hidden sx={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: e.category.color || 'text.disabled',
                  }} />
                )}
                <Typography variant="caption" color="text.secondary" noWrap>
                  {e.category?.name || 'Uncategorised'} · {fmtDate(e.date)}
                  {e.isSplit ? ` · split of ${money(Math.abs(Number(e.amount) || 0))}` : ''}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{
              fontFamily: type.displayFamily, fontWeight: 650, fontSize: '0.95rem', flexShrink: 0,
              color: accents.red, fontVariantNumeric: 'tabular-nums',
            }}>
              {money(yourShareOf(e))}
            </Typography>
          </Box>
        ))}
      </Stack>
    </ChartContainer>
  );
}
