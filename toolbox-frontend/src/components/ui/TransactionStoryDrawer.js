import React from 'react';
import { Avatar, Box, Chip, Divider, Drawer, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { money } from './money';
import { accents } from '../../theme/tokens';

/**
 * Transaction Story Drawer — one premium detail surface, reused everywhere a
 * transaction (or a projected event) can be inspected: the ledger, the Cash
 * Flow River, the attention rail, the inbox, charts and splits.
 *
 * It takes a normalized `story` (build one with buildStory* below) so every
 * caller feeds the same shape and gets the same panel: identity, a big tinted
 * amount, the facts, recurring pattern, split status, similar purchases, notes,
 * and a row of actions. A right-anchored drawer on desktop, a bottom sheet on
 * phones. Nothing here is invented — a field only shows when the caller has it.
 */
export default function TransactionStoryDrawer({ open, story, onClose }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  if (!story) return null;

  const tone = story.tone || (story.isIncome ? accents.mint : (story.categoryColor || accents.blue));
  const initial = (story.categoryName || story.title || '?').charAt(0).toUpperCase();
  const dateObj = story.date ? (story.date instanceof Date ? story.date : new Date(story.date)) : null;

  return (
    <Drawer
      anchor={isPhone ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isPhone ? '100%' : 420, maxWidth: '100vw',
          maxHeight: isPhone ? '92vh' : '100vh',
          borderRadius: isPhone ? '22px 22px 0 0' : 0,
          backgroundImage: 'none', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {isPhone && <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: 'divider', mx: 'auto', mt: 1.5 }} />}

      {/* Identity hero */}
      <Box sx={{
        position: 'relative', px: 3, pt: 3, pb: 2.5, flexShrink: 0,
        background: `linear-gradient(165deg, ${tone}2c, transparent 78%)`,
      }}>
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ position: 'absolute', top: 12, right: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          {story.upcoming && (
            <Chip icon={<ScheduleRoundedIcon />} label="Upcoming" size="small"
              sx={{ bgcolor: `${accents.violet}22`, color: accents.violet, fontWeight: 600 }} />
          )}
          {story.recurringLabel && (
            <Chip icon={<AutorenewRoundedIcon />} label={story.recurringLabel} size="small"
              sx={{ bgcolor: `${tone}22`, color: tone, fontWeight: 600 }} />
          )}
        </Stack>
        <Avatar sx={{ width: 54, height: 54, mb: 1.5, fontSize: '1.4rem', fontWeight: 700, bgcolor: `${tone}2a`, color: tone }}>
          {initial}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.2 }}>{story.title}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.03em', color: tone, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          {story.isIncome ? '+' : ''}{money(story.amount)}
        </Typography>
        {story.categoryName && (
          <Chip label={story.categoryName} size="small"
            sx={{ mt: 1, bgcolor: story.categoryColor || tone, color: '#fff', fontWeight: 600 }} />
        )}
      </Box>

      {/* Scrollable body */}
      <Box sx={{ px: 3, py: 2.5, overflowY: 'auto', flex: 1 }}>
        <Stack spacing={1.5}>
          {dateObj && (
            <Fact icon={<EventRoundedIcon />} label={story.upcoming ? 'Due' : 'When'}
              value={dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
          <Fact icon={<CategoryRoundedIcon />} label="Type" value={story.isIncome ? 'Income' : 'Expense'} />
          {story.paymentMethod && <Fact icon={<PaymentRoundedIcon />} label="Paid with" value={story.paymentMethod} />}
          {story.location && <Fact icon={<PlaceRoundedIcon />} label="Where" value={story.location} />}
          {story.splitStatus && <Fact icon={<CallSplitRoundedIcon />} label="Split" value={story.splitStatus} />}
        </Stack>

        {story.tags?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
              {story.tags.map(t => (
                <Chip key={t.id ?? t.name} label={t.name} size="small"
                  sx={{ bgcolor: `${t.color || accents.blue}26`, color: t.color || accents.blue, fontWeight: 600 }} />
              ))}
            </Box>
          </Box>
        )}

        {story.note && (
          <Box sx={{ mt: 2, p: 1.75, borderRadius: 3, backgroundColor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Notes</Typography>
            <Typography variant="body2" color="text.secondary">{story.note}</Typography>
          </Box>
        )}

        {story.context && (
          <Box sx={{ mt: 2, p: 1.75, borderRadius: 3, backgroundColor: 'action.hover' }}>
            <Typography variant="body2" color="text.secondary">{story.context}</Typography>
          </Box>
        )}

        {/* Similar purchases — real rows the caller derived from the same category */}
        {story.similar?.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Similar purchases
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              {story.similar.map((s, i) => (
                <Box key={i} display="flex" justifyContent="space-between" alignItems="center" sx={{ py: 0.75, borderBottom: i < story.similar.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{s.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(s.amount)}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Actions */}
        {story.actions?.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              {story.actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <Box
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => a.onClick?.(story)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.onClick?.(story); } }}
                    sx={{
                      flex: '1 1 40%', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                      px: 1.5, py: 1.1, borderRadius: 2.5, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                      border: '1px solid', borderColor: a.tone ? `${a.tone}66` : 'divider',
                      color: a.tone || 'text.primary',
                      transition: 'background-color 0.2s ease',
                      '&:hover': { backgroundColor: a.tone ? `${a.tone}14` : 'action.hover' },
                      '&:focus-visible': { outline: `2px solid ${a.tone || theme.palette.primary.main}`, outlineOffset: 2 },
                    }}
                  >
                    {Icon && <Icon sx={{ fontSize: 18 }} />}
                    {a.label}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  );
}

function Fact({ icon, label, value }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5}>
      <Box sx={{ color: 'text.disabled', display: 'flex' }}>{React.cloneElement(icon, { sx: { fontSize: 18 } })}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, textTransform: label === 'Type' ? 'capitalize' : 'none' }} noWrap>{value}</Typography>
      </Box>
    </Box>
  );
}

const CADENCE_LABEL = { daily: 'Repeats daily', weekly: 'Repeats weekly', monthly: 'Repeats monthly', yearly: 'Repeats yearly' };

/**
 * Build a story from a Cash Flow River / projection event.
 * event: { type, amount, description, category, source, cadence?, date }
 */
export function buildStoryFromEvent(event, date) {
  if (!event) return null;
  return {
    title: event.description || (event.type === 'income' ? 'Income' : 'Payment'),
    amount: event.amount,
    isIncome: event.type === 'income',
    categoryName: event.category || null,
    date: date || event.date || null,
    upcoming: true,
    recurringLabel: event.source === 'recurring' ? (CADENCE_LABEL[event.cadence] || 'Recurring') : null,
  };
}

/**
 * Build a story from a full ledger expense. `all` (optional) is the loaded list,
 * used to derive real "similar purchases" and a one-line month context.
 */
export function buildStoryFromExpense(expense, all = []) {
  if (!expense) return null;
  const isIncome = expense.transaction_type === 'income' || expense.type === 'income';
  const cat = expense.category;
  const catId = cat?.id;

  const sameCat = catId
    ? all.filter(e => e.id !== expense.id && e.category?.id === catId).slice(0, 4)
      .map(e => ({ description: e.description, amount: e.amount, date: e.date }))
    : [];

  let context = null;
  if (catId) {
    const total = all.filter(e => e.category?.id === catId).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (total > 0) {
      const share = Math.round((Number(expense.amount) / total) * 100);
      context = `This is ${share}% of your ${cat.name} spending in view (${money(total)} total).`;
    }
  }

  return {
    title: expense.description,
    amount: expense.amount,
    isIncome,
    categoryName: cat?.name || null,
    categoryColor: cat?.color || null,
    date: expense.date,
    paymentMethod: expense.payment_method || null,
    location: expense.location || null,
    tags: expense.tags || [],
    note: expense.notes || expense.note || null,
    similar: sameCat,
    context,
  };
}
