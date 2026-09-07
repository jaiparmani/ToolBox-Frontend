import React from 'react';
import {
  Box, Button, Collapse, IconButton, InputBase, TextField, Tooltip, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import {
  AutoAwesome as AutoAwesomeIcon,
  Add as AddIcon,
  CallSplit as CallSplitIcon,
  Person as PersonIcon,
  DoneAll as DoneAllIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { accents, flowColor, motion, radius, type } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';
import Reveal from './Reveal';
import ThinkingHint from './ThinkingHint';
import usePressSpring from './usePressSpring';
import { money } from './money';

const numSx = {
  fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
};

/**
 * The one figure the tab exists to answer, and the two sides behind it.
 *
 * The old tab stacked three separate cards — "You owe", "Owed to you", and a
 * grid of people — so the first thing you saw was whichever direction
 * happened to be non-empty, and your net position was nowhere on screen.
 * The bar is the only spectacle here and it is pure ratio: the two widths are
 * the two real totals, and both are printed beside it.
 */
function NetPosition({ owedToYou, youOwe, reduce }) {
  const mode = useTheme().palette.mode;
  const flowIn = flowColor.in[mode];
  const flowOut = flowColor.out[mode];
  const total = owedToYou + youOwe;
  const net = owedToYou - youOwe;
  const inPct = total > 0 ? (owedToYou / total) * 100 : 0;
  const settled = total === 0;
  const tone = settled ? 'text.secondary' : net >= 0 ? flowIn : flowOut;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'text.disabled' }}
      >
        {settled ? 'All square' : net >= 0 ? 'Owed to you, net' : 'You owe, net'}
      </Typography>
      <Typography
        sx={{
          ...numSx, fontSize: 'clamp(2rem, 8vw, 2.9rem)', fontWeight: 700, lineHeight: 1.05,
          color: settled ? 'text.secondary' : tone, mt: 0.25,
        }}
      >
        <AnimatedNumber value={Math.abs(net)} />
      </Typography>

      {total > 0 && (
        <>
          <Box
            aria-hidden
            sx={{
              display: 'flex', mt: 1.5, height: 6, borderRadius: 999, overflow: 'hidden',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
            }}
          >
            <Box
              component={framerMotion.div}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 26 }}
              style={{ transformOrigin: 'left center' }}
              sx={{ width: `${inPct}%`, bgcolor: flowIn }}
            />
            <Box
              component={framerMotion.div}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 26, delay: 0.06 }}
              style={{ transformOrigin: 'right center' }}
              sx={{ width: `${100 - inPct}%`, bgcolor: flowOut }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.85, gap: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              <Box component="span" sx={{ ...numSx, fontWeight: 650, color: flowIn }}>{money(owedToYou)}</Box>
              {' coming back'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'right' }}>
              <Box component="span" sx={{ ...numSx, fontWeight: 650, color: flowOut }}>{money(youOwe)}</Box>
              {' you owe'}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

/** One person, either direction, with their unsettled bills folded underneath. */
function PersonRow({
  entry, expanded, personSplits, settlingKey, editingSplit,
  onToggle, onSettle, onEditSplit, onEditSplitChange, onStartEdit, onCancelEdit,
  onDeleteSplit, onSettleSingle,
}) {
  const owing = entry.direction === 'you_owe';
  const mode = useTheme().palette.mode;
  const tone = owing ? flowColor.out[mode] : flowColor.in[mode];
  const press = usePressSpring({ pressScale: 0.995, disabled: !entry.canExpand });

  return (
    <Box sx={{ py: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          ref={entry.canExpand ? press.ref : undefined}
          {...(entry.canExpand ? press.bindEvents : {})}
          component={entry.canExpand ? 'button' : 'div'}
          type={entry.canExpand ? 'button' : undefined}
          aria-expanded={entry.canExpand ? expanded : undefined}
          onClick={entry.canExpand ? onToggle : undefined}
          sx={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5,
            border: 0, bgcolor: 'transparent', font: 'inherit', textAlign: 'left', p: 0,
            color: 'inherit',
            cursor: entry.canExpand ? 'pointer' : 'default',
            '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 3, borderRadius: `${radius.sm}px` },
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              bgcolor: `${tone}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PersonIcon sx={{ color: tone, fontSize: 17 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.01em' }} noWrap>
              {entry.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
              {owing
                ? `${entry.unsettledCount} ${entry.unsettledCount === 1 ? 'bill' : 'bills'} they paid for`
                : entry.unsettledCount === 0
                  ? 'all settled'
                  : `${entry.unsettledCount} unsettled`}
              {entry.linkedUsername ? ' · has an account' : ''}
            </Typography>
          </Box>
          <Typography sx={{ ...numSx, fontSize: 16, fontWeight: 650, color: tone, flexShrink: 0 }}>
            {money(entry.owed)}
          </Typography>
          {entry.canExpand && (
            <ExpandMoreIcon
              aria-hidden
              sx={{
                fontSize: 19, color: 'text.disabled', flexShrink: 0,
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: `transform ${motion.normal}ms ${motion.ease}`,
              }}
            />
          )}
        </Box>
        {entry.owed > 0 && (
          <Button
            size="small"
            variant="text"
            startIcon={<DoneAllIcon sx={{ fontSize: 15 }} />}
            onClick={() => onSettle(entry)}
            disabled={settlingKey === entry.key}
            sx={{
              flexShrink: 0, borderRadius: `${radius.pill}px`, fontSize: 12, color: tone,
              '&:hover': { bgcolor: `${tone}14` },
            }}
          >
            {settlingKey === entry.key ? 'Settling…' : owing ? 'Paid' : 'Settle'}
          </Button>
        )}
      </Box>

      {entry.canExpand && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ mt: 1, ml: { xs: 0, sm: 6 }, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
            {personSplits.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 1 }}>Loading…</Typography>
            ) : personSplits.map((s) => (
              <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 550 }} noWrap>{s.description}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                    {s.date}{s.paidBy ? ` · paid by ${s.paidBy}` : ''}
                  </Typography>
                </Box>
                {editingSplit?.id === s.id ? (
                  <>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.3, px: 1, py: 0.4,
                        borderRadius: `${radius.pill}px`, border: '1px solid', borderColor: `${tone}66`,
                      }}
                    >
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>₹</Typography>
                      <InputBase
                        autoFocus
                        value={editingSplit.amount}
                        onChange={(e) => onEditSplitChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onEditSplit(s.id, editingSplit.amount);
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        inputProps={{
                          inputMode: 'decimal', 'aria-label': `Amount for ${s.description}`,
                          style: { width: 60, padding: 0, fontSize: 13, fontVariantNumeric: 'tabular-nums' },
                        }}
                      />
                    </Box>
                    <IconButton size="small" aria-label="Save amount" onClick={() => onEditSplit(s.id, editingSplit.amount)} sx={{ color: accents.mint, p: 0.5 }}>
                      <DoneAllIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" aria-label="Cancel edit" onClick={onCancelEdit} sx={{ color: 'text.disabled', p: 0.5 }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <Typography sx={{ ...numSx, fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' }}>
                      {money(s.amount)}
                    </Typography>
                    <Tooltip title="Edit amount">
                      <IconButton size="small" aria-label={`Edit ${s.description} amount`} onClick={() => onStartEdit(s)} sx={{ color: 'text.disabled', p: 0.5, '&:hover': { color: 'text.primary' } }}>
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove split">
                      <IconButton size="small" aria-label={`Remove ${s.description} split`} onClick={() => onDeleteSplit(s)} sx={{ color: 'text.disabled', p: 0.5, '&:hover': { color: accents.red } }}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Button
                      size="small"
                      onClick={() => onSettleSingle(s)}
                      disabled={settlingKey === `s${s.id}`}
                      sx={{ minWidth: 0, px: 1, fontSize: 11, borderRadius: `${radius.pill}px` }}
                    >
                      {settlingKey === `s${s.id}` ? '…' : 'Paid'}
                    </Button>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

/**
 * Shared bills, rebuilt as one ledger.
 *
 * What failed the bar: three stacked cards that each restated a heading, a
 * "Owed to you" card that was a number and nothing else, people in a card
 * grid that never lined their amounts up so you couldn't compare them, and
 * every destructive step behind a raw window.confirm. Now: one net figure,
 * one two-sided bar, one list of people in both directions ordered by size.
 *
 * Data-true: every figure is the server's balance total; the bar's widths are
 * the two real totals as a ratio and both are printed underneath.
 */
export default function ActivitySplitsPanel({
  splits, splitOnlyBills = [], expandedPerson, personSplits, editingSplit,
  onTextChange, onSplitAdd, onOpenManual, onTogglePerson, onSettle,
  onStartEditSplit, onEditSplitChange, onCancelEditSplit, onEditSplit,
  onDeleteSplit, onSettleSingle, onAddToExpenses,
}) {
  const reduce = useReducedMotion();

  // Both directions in one list, biggest first — the question is "who, and
  // how much", not "which API returned them".
  const people = React.useMemo(() => {
    const owedToYou = (splits.balances || []).map((b) => ({
      key: b.personId, id: b.personId, name: b.name, owed: Number(b.owed) || 0,
      unsettledCount: b.unsettledCount, linkedUsername: b.linkedUsername,
      direction: 'owed_to_you', canExpand: b.unsettledCount > 0, raw: b,
    }));
    const youOwe = (splits.youOwe || []).map((d) => ({
      key: `u${d.userId}`, id: d.userId, name: d.name, owed: Number(d.owed) || 0,
      unsettledCount: d.unsettledCount, direction: 'you_owe', canExpand: false, raw: d,
    }));
    return [...owedToYou, ...youOwe].sort((a, b) => b.owed - a.owed);
  }, [splits.balances, splits.youOwe]);

  const nothing = people.length === 0 && splitOnlyBills.length === 0;

  return (
    <Box>
      <NetPosition
        owedToYou={Number(splits.totalOwed) || 0}
        youOwe={Number(splits.totalYouOwe) || 0}
        reduce={reduce}
      />

      {/* ── Capture: one line, the fastest path first ────────────────── */}
      <Box
        sx={{
          display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
          p: 1, mb: 3, borderRadius: `${radius.lg}px`,
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}
      >
        <TextField
          size="small"
          variant="standard"
          sx={{ flex: 1, minWidth: 200, px: 1 }}
          InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
          inputProps={{ 'aria-label': 'Describe a shared bill' }}
          placeholder='"split 1200 dinner with raj and priya"'
          value={splits.text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={splits.loading}
          onKeyDown={(e) => { if (e.key === 'Enter') onSplitAdd(); }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={onSplitAdd}
          disabled={splits.loading || !splits.text.trim()}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
          sx={{ borderRadius: `${radius.pill}px`, px: 2 }}
        >
          {splits.loading ? 'Splitting…' : 'Split'}
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={onOpenManual}
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          sx={{ borderRadius: `${radius.pill}px`, color: 'text.secondary' }}
        >
          Exact
        </Button>
      </Box>
      <ThinkingHint show={splits.loading} label="Working out the shares…" />

      {/* ── Split-only bills you paid: not yet in your expenses ───────── */}
      {splitOnlyBills.length > 0 && (
        <Reveal>
          <Box
            sx={{
              p: 2, mb: 3, borderRadius: `${radius.lg}px`,
              border: '1px dashed', borderColor: `${accents.amber}55`,
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: accents.amber, mb: 0.5 }}>
              Tracked as a split only
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
              You paid these but they aren't counted in your spending yet.
            </Typography>
            {splitOnlyBills.map((s) => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 2, flexWrap: 'wrap', py: 1,
                  borderTop: '1px solid', borderColor: 'divider',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>{s.description}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    {s.personName} owes {money(s.amount)}{s.paidBy ? ` · paid by ${s.paidBy}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAddToExpenses(s.expenseId)}
                  sx={{ borderRadius: `${radius.pill}px` }}
                >
                  Count it as spending
                </Button>
              </Box>
            ))}
          </Box>
        </Reveal>
      )}

      {/* ── The ledger ───────────────────────────────────────────────── */}
      {nothing ? (
        <Box
          sx={{
            p: 4, borderRadius: `${radius.lg}px`, textAlign: 'center',
            border: '1px dashed', borderColor: 'divider',
          }}
        >
          <CallSplitIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>Nobody owes anybody</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 340, mx: 'auto', mt: 0.5 }}>
            Describe a shared bill above — "split 1200 dinner with raj and priya" — and
            each person's share starts tracking here.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 }, py: 0.5, borderRadius: `${radius.lg}px`,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            '& > div + div': { borderTop: '1px solid', borderColor: 'divider' },
          }}
        >
          {people.map((entry, i) => (
            <Reveal key={entry.key} index={i} step={30} maxDelay={260}>
              <PersonRow
                entry={entry}
                expanded={expandedPerson === entry.id && entry.direction === 'owed_to_you'}
                personSplits={personSplits}
                settlingKey={splits.settling}
                editingSplit={editingSplit}
                onToggle={() => onTogglePerson(entry.id)}
                onSettle={onSettle}
                onStartEdit={onStartEditSplit}
                onEditSplitChange={onEditSplitChange}
                onCancelEdit={onCancelEditSplit}
                onEditSplit={onEditSplit}
                onDeleteSplit={onDeleteSplit}
                onSettleSingle={onSettleSingle}
              />
            </Reveal>
          ))}
        </Box>
      )}

      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.75, display: 'block' }}>
        The full amount is recorded as your expense; each person's share is tracked as
        owed to you. Say "paid 500 for raj's ticket" when you didn't share the cost.
      </Typography>
    </Box>
  );
}
