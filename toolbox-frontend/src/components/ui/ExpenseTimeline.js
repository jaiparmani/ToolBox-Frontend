import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SwipeAction from './SwipeAction';
import { money } from './money';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { accents, type } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const NEUTRAL_DOT = '#8A8A8E';

const isIncomeOf = (e) => e.transaction_type === 'income' || e.type === 'income';
// What counts on the ledger: income at full value, an expense at your own share
// (the split-adjusted amount), so day totals match the netted "spent".
const ledgerAmt = (e) => (isIncomeOf(e) ? Math.abs(Number(e.amount) || 0) : yourShareOf(e));
const fullAmt = (e) => Math.abs(Number(e.amount) || 0);
const dayKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

/** "Today" / "Yesterday" / "Wed, 3 Sep" for a day-group header. */
function dayLabel(key) {
  if (!key) return 'Undated';
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Undated';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Row secondary line: category, falling back to the transaction kind. */
const subtitleOf = (e) => e.category?.name || (isIncomeOf(e) ? 'Income' : 'Expense');

function ExpenseRow({ expense, prominent, onEdit, onDelete, onOpen }) {
  const [menu, setMenu] = React.useState(null);
  const income = isIncomeOf(expense);
  const dot = expense.category?.color || (income ? accents.green : NEUTRAL_DOT);
  const amountColor = income ? accents.green : accents.red;

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 0.75, sm: 1 }, py: 1.15,
        borderRadius: 2, cursor: onOpen ? 'pointer' : 'default',
        transition: 'background-color 140ms ease',
        '&:hover': { bgcolor: 'action.hover' },
        '&:hover .exp-more': { opacity: 1 },
      }}
      onClick={() => onOpen?.(expense)}
    >
      {/* category color dot — the one spot of category identity */}
      <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, bgcolor: dot }} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.primary', letterSpacing: '-0.005em' }} noWrap>
          {expense.description || subtitleOf(expense)}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.15 }} noWrap>
          {subtitleOf(expense)}{!income && expense.isSplit ? ` · split of ${money(fullAmt(expense))}` : ''}
        </Typography>
      </Box>

      <Typography sx={{
        ...num, flexShrink: 0, color: amountColor,
        fontWeight: prominent ? 650 : 600,
        fontSize: prominent ? { xs: '1.02rem', sm: '1.1rem' } : { xs: '0.9rem', sm: '0.95rem' },
      }}>
        {income ? '+' : '−'}{money(ledgerAmt(expense))}
      </Typography>

      <IconButton
        size="small" className="exp-more"
        onClick={(e) => { e.stopPropagation(); setMenu(e.currentTarget); }}
        aria-label={`Actions for ${expense.description || 'expense'}`}
        sx={{ width: 32, height: 32, flexShrink: 0, color: 'text.disabled', opacity: { xs: 1, md: 0.35 }, transition: 'opacity 140ms ease' }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { setMenu(null); onEdit?.(expense); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setMenu(null); onDelete?.(expense.id); }} sx={{ color: accents.red }}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: accents.red }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

/**
 * The Activity stream as a chronological timeline grouped by day.
 *
 * Each day is a section with a quiet header carrying its net total; under it,
 * flat hairline-separated rows — a category dot, the merchant, and the amount
 * in tabular figures (red out, green in). Larger amounts get a whisper more
 * weight so the eye finds them. Row tap opens the detail; the overflow menu and
 * the existing swipe-to-delete are preserved.
 */
export default function ExpenseTimeline({ expenses = [], onEdit, onDelete, onDeleteDirect, onOpen }) {
  const { groups, threshold } = React.useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      const key = dayKey(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    const keys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    const amts = expenses
      .filter((e) => !isIncomeOf(e))
      .map((e) => ledgerAmt(e));
    const avg = amts.length ? amts.reduce((s, v) => s + v, 0) / amts.length : 0;
    return {
      groups: keys.map((k) => {
        const rows = map.get(k);
        const net = rows.reduce((s, e) => s + (isIncomeOf(e) ? 1 : -1) * ledgerAmt(e), 0);
        // The day's largest single expense (your share), for a whisper of context
        // in the header — income rows don't count as "spend".
        let topSpend = 0;
        for (const e of rows) {
          if (!isIncomeOf(e)) topSpend = Math.max(topSpend, ledgerAmt(e));
        }
        return { key: k, rows, net, count: rows.length, topSpend };
      }),
      threshold: amts.length > 3 ? avg * 2 : Infinity,
    };
  }, [expenses]);

  return (
    <Box>
      {groups.map((g) => (
        <Box key={g.key || 'undated'} sx={{ mb: 2.5, '&:last-of-type': { mb: 0 } }}>
          {/* day header — sticks under the app bar so the current day stays
              labelled while its rows scroll past */}
          <Box
            sx={{
              position: 'sticky', top: { xs: 54, md: 60 }, zIndex: 2,
              bgcolor: 'background.default', pt: 0.5, pb: 0.75, px: { xs: 0.75, sm: 1 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled' }}>
                {dayLabel(g.key)}
              </Typography>
              <Typography sx={{ ...num, fontSize: 12, fontWeight: 550, color: 'text.secondary' }}>
                {g.net >= 0 ? '+' : '−'}{money(Math.abs(g.net))}
              </Typography>
            </Box>
            {/* transaction count + the day's biggest expense, kept quiet */}
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.2 }} noWrap>
              {g.count} {g.count === 1 ? 'transaction' : 'transactions'}
              {g.topSpend > 0 ? ` · max ${money(g.topSpend)}` : ''}
            </Typography>
          </Box>

          {/* rows */}
          <Box sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'background.paper',
            '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
          }}>
            {g.rows.map((expense) => (
              <SwipeAction
                key={expense.id}
                onAction={() => onDeleteDirect?.(expense.id)}
                onSecondaryAction={() => onEdit?.(expense)}
                color={accents.red}
                secondaryColor={accents.blue}
                icon={<DeleteOutlineIcon sx={{ color: '#fff' }} />}
                secondaryIcon={<EditRoundedIcon sx={{ color: '#fff' }} />}
                label="Delete"
                secondaryLabel="Edit"
                borderRadius={0}
              >
                <ExpenseRow
                  expense={expense}
                  prominent={!isIncomeOf(expense) && ledgerAmt(expense) >= threshold}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              </SwipeAction>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
