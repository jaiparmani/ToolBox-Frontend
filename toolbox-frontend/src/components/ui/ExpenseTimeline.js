import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import SwipeAction from './SwipeAction';
import ActivityDayHeader from './ActivityDayHeader';
import ActivityDayRail from './ActivityDayRail';
import { money } from './money';
import { yourShareOf } from '../rest/expenseTrackerApis';
import { accents, motion as motionTokens, type } from '../../theme/tokens';

/**
 * Apple Design §15: tracking is size-specific, never one value for every size.
 * The big amounts on a prominent row are tightened hardest; the ordinary row
 * amount less so; the small captions get a touch of positive tracking to stay
 * legible. Leading tightens as the figure grows.
 */
const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums' };
const NEUTRAL_DOT = '#8A8A8E';

/**
 * A short staggered lift as the stream arrives, so a page of rows reads as a
 * list being dealt out top-down rather than a block appearing. The delay is
 * capped so row 40 of a 50-row page doesn't sit invisible for two seconds, and
 * the whole thing is dropped under prefers-reduced-motion (Apple Design §14).
 * Transform + opacity only, and it's a one-shot on mount — nothing here is
 * recomputed while scrolling.
 */
const STAGGER_STEP = 26;
const STAGGER_CAP = 420;
const dealIn = (index) => ({
  animation: `timelineDealIn ${motionTokens.slow}ms ${motionTokens.ease} both`,
  animationDelay: `${Math.min(index * STAGGER_STEP, STAGGER_CAP)}ms`,
  '@keyframes timelineDealIn': {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

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
const subtitleOf = (e) => {
  // A share billed by somebody else is not your record to explain by category -
  // what matters is whose bill it was.
  if (e.isSharedWithMe) return e.paidBy ? `shared by ${e.paidBy}` : 'shared with you';
  return e.category?.name || (isIncomeOf(e) ? 'Income' : 'Expense');
};

/**
 * One transaction.
 *
 * The old row opened with a 9px category dot — identity, but no magnitude, so
 * a ₹40 coffee and a ₹9,000 flight looked identical until you read both
 * numbers. It is now a spine: a track tinted with the category's own colour
 * (so identity survives at any size) filled to `this amount ÷ the largest
 * single amount that day`. One honest scale per day, drawn with a transform,
 * and every figure it encodes is already on screen as text — this row's amount,
 * and the day's `max ₹…` in the header above it.
 */
function ExpenseRow({ expense, prominent, share = 0, onEdit, onDelete, onOpen }) {
  const [menu, setMenu] = React.useState(null);
  const income = isIncomeOf(expense);
  const dot = expense.category?.color || (income ? accents.green : NEUTRAL_DOT);
  const amountColor = income ? accents.green : accents.red;
  const tags = expense.tags || [];
  // The category is the identity of this row's subtitle line; tags are
  // context. On a phone the two are fighting over ~190px, so the pill row
  // gives up a slot there rather than ever crushing the category to an
  // unreadable sliver (the bug this guards against — a bare "…" with a
  // fully-legible tag sitting right next to it).
  const theme = useTheme();
  const compactTags = useMediaQuery(theme.breakpoints.down('sm'));
  const maxTags = compactTags ? 1 : 2;

  return (
    <Box
      sx={{
        // On a phone the gutters are the scarce resource, not the row: the
        // description and the amount both want that width, and the overflow
        // button carries ~6px of its own inset inside a 32px box, so the row's
        // right padding can come off without the icon touching the edge.
        // Height is untouched — the row stays a comfortable ~55px target.
        display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 },
        pl: { xs: 0.75, sm: 1 }, pr: { xs: 0.25, sm: 1 }, py: 1.15,
        borderRadius: 2, cursor: onOpen ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&:hover': { bgcolor: 'action.hover' },
        // Apple Design §1: the row answers on pointer-DOWN, not on release.
        // A cell highlight rather than a scale, because the row is already a
        // swipe surface (SwipeAction owns its transform) — and `:active` is
        // free, instant, and cancels itself if the press becomes a swipe.
        '&:active': { bgcolor: 'action.selected', transition: 'none' },
        '&:hover .exp-more': { opacity: 1 },
      }}
      onClick={() => onOpen?.(expense)}
    >
      {/* category spine — colour is identity, height is this transaction's
          share of the day's largest. */}
      <Box
        aria-hidden
        sx={{
          position: 'relative', width: 3.5, height: 28, borderRadius: 999, flexShrink: 0,
          overflow: 'hidden', bgcolor: `${dot}2e`,
        }}
      >
        <Box
          style={{ '--activity-row-share': Math.max(share, 0.02) }}
          sx={{
            position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, borderRadius: 999,
            bgcolor: dot, transformOrigin: 'bottom center',
            transform: 'scaleY(var(--activity-row-share))',
            animation: `activityRowShare ${motionTokens.slow}ms ${motionTokens.ease} both`,
            '@keyframes activityRowShare': {
              from: { transform: 'scaleY(0)' },
              to: { transform: 'scaleY(var(--activity-row-share))' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.primary', letterSpacing: '-0.005em' }} noWrap>
          {expense.description || subtitleOf(expense)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.15, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 11, letterSpacing: '0.005em', color: 'text.disabled',
              // A guaranteed floor: tags get whatever's left over, never the
              // other way around. Without this, `flex: 0 1 auto` + the tags'
              // `flexShrink: 0` let the pills claim the row and squeeze the
              // category down to a bare ellipsis.
              flex: '1 1 auto', minWidth: 60,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {subtitleOf(expense)}{!income && expense.isSplit ? ` · split of ${money(fullAmt(expense))}` : ''}
          </Typography>
          {tags.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
              {tags.slice(0, maxTags).map((tag) => (
                <Box
                  key={tag.id}
                  sx={{
                    px: 0.6, py: 0.05, borderRadius: 999, fontSize: 9.5, fontWeight: 600,
                    letterSpacing: '0.01em', whiteSpace: 'nowrap',
                    bgcolor: `${tag.color || NEUTRAL_DOT}22`, color: tag.color || 'text.secondary',
                  }}
                >
                  {tag.name}
                </Box>
              ))}
              {tags.length > maxTags && (
                <Typography sx={{ fontSize: 9.5, color: 'text.disabled', flexShrink: 0 }}>+{tags.length - maxTags}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Typography sx={{
        ...num, flexShrink: 0, color: amountColor,
        fontWeight: prominent ? 650 : 600,
        // §15: the bigger the figure, the tighter the fit and the leading.
        letterSpacing: prominent ? '-0.03em' : '-0.018em',
        lineHeight: prominent ? 1.1 : 1.2,
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
        {/* Someone else's bill. You can open it in Shared, but editing or
            deleting it here would be acting on a record you do not own. */}
        {expense.isSharedWithMe ? (
          <MenuItem onClick={() => { setMenu(null); onOpen?.(expense); }}>
            <ListItemIcon><CallSplitRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Open in Shared</ListItemText>
          </MenuItem>
        ) : (
          <>
            <MenuItem onClick={() => { setMenu(null); onEdit?.(expense); }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); onDelete?.(expense.id); }} sx={{ color: accents.red }}>
              <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: accents.red }} /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}

/**
 * The Activity stream as a chronological timeline grouped by day.
 *
 * What changed, and what pays for it:
 *
 * - Each day header (`ActivityDayHeader`) carries the day's real net, and its
 *   bottom edge is a meter of that day's spend against the heaviest day
 *   currently shown, with a tick at the average active day. The header only
 *   materialises as a translucent layer once it actually pins over content, and
 *   what used to be a hard divider is a scroll-edge fade (Apple Design §12).
 * - Every row's leading spine is that transaction's share of the day's largest,
 *   so magnitude is visible before any number is read.
 * - `ActivityDayRail` puts the whole period's shape in one column you can grab
 *   and drag to fly the list day by day (§2/§8/§9).
 *
 * Every one of those is a sum over the rows already loaded for the current
 * scope — no extra fetch, no figure that isn't also written out somewhere.
 */
export default function ExpenseTimeline({ expenses = [], onEdit, onDelete, onDeleteDirect, onOpen }) {
  const { groups, threshold, maxDaySpend, avgDaySpend } = React.useMemo(() => {
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

    const built = keys.map((k) => {
      const rows = map.get(k);
      const net = rows.reduce((s, e) => s + (isIncomeOf(e) ? 1 : -1) * ledgerAmt(e), 0);
      // The day's largest single expense (your share) for the header, its total
      // spend for the meter and the rail, and the largest single amount of any
      // kind as the scale the row spines are drawn against.
      let topSpend = 0;
      let spend = 0;
      let rowMax = 0;
      for (const e of rows) {
        const amt = ledgerAmt(e);
        if (!isIncomeOf(e)) { topSpend = Math.max(topSpend, amt); spend += amt; }
        rowMax = Math.max(rowMax, amt);
      }
      return { key: k, label: dayLabel(k), rows, net, count: rows.length, topSpend, spend, rowMax };
    });

    const spendingDays = built.filter((g) => g.spend > 0);
    const totalSpend = spendingDays.reduce((s, g) => s + g.spend, 0);

    return {
      groups: built,
      threshold: amts.length > 3 ? avg * 2 : Infinity,
      maxDaySpend: spendingDays.reduce((m, g) => Math.max(m, g.spend), 0),
      avgDaySpend: spendingDays.length ? totalSpend / spendingDays.length : 0,
    };
  }, [expenses]);

  // Day headers register themselves here so the rail can scroll to one.
  const nodes = React.useRef(new Map());
  const registerDay = React.useCallback((key, node) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  }, []);

  const jumpToDay = React.useCallback((key, smooth) => {
    const node = nodes.current.get(key);
    if (!node || typeof window === 'undefined') return;
    // Land the header just below the app bar rather than under it.
    const offset = window.matchMedia?.('(min-width: 900px)').matches ? 60 : 54;
    const top = node.getBoundingClientRect().top + window.scrollY - offset - 10;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const railDays = React.useMemo(
    () => groups.map((g) => ({ key: g.key, label: g.label, spend: g.spend, count: g.count })),
    [groups],
  );

  // One running index across every group so the stagger reads as a single
  // top-to-bottom sweep down the page rather than restarting at each day.
  let dealIndex = -1;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { sm: 1.25, md: 1.5 } }}>
      {/* The period's shape, and the one grabbable thing outside a row. Hidden
          on a phone, where the gutters are the scarce resource and the rows
          already carry a real gesture of their own. */}
      <ActivityDayRail
        days={railDays}
        maxDaySpend={maxDaySpend}
        onJump={jumpToDay}
        sx={{ display: { xs: 'none', sm: 'block' } }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {groups.map((g) => (
          <Box key={g.key || 'undated'} sx={{ mb: 2.5, '&:last-of-type': { mb: 0 } }}>
            <ActivityDayHeader
              dayKey={g.key}
              label={g.label}
              net={g.net}
              count={g.count}
              topSpend={g.topSpend}
              spend={g.spend}
              maxDaySpend={maxDaySpend}
              avgDaySpend={avgDaySpend}
              onRegister={registerDay}
              sx={dealIn(++dealIndex)}
            />

            {/* rows */}
            <Box sx={{
              border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'background.paper',
              '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
            }}>
              {g.rows.map((expense) => (
                <SwipeAction
                  key={expense.id}
                  onAction={expense.isSharedWithMe ? undefined : () => onDeleteDirect?.(expense.id)}
                  onSecondaryAction={expense.isSharedWithMe ? undefined : () => onEdit?.(expense)}
                  color={accents.red}
                  secondaryColor={accents.blue}
                  icon={<DeleteOutlineIcon sx={{ color: '#fff' }} />}
                  secondaryIcon={<EditRoundedIcon sx={{ color: '#fff' }} />}
                  label="Delete"
                  secondaryLabel="Edit"
                  borderRadius={0}
                  sx={dealIn(++dealIndex)}
                >
                  <ExpenseRow
                    expense={expense}
                    prominent={!isIncomeOf(expense) && ledgerAmt(expense) >= threshold}
                    share={g.rowMax > 0 ? ledgerAmt(expense) / g.rowMax : 0}
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
    </Box>
  );
}
