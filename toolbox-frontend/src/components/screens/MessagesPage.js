import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar, Box, Chip, CircularProgress, Container, MenuItem, Select, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import MarkChatUnreadRoundedIcon from '@mui/icons-material/MarkChatUnreadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

import { useMoney } from '../../contexts/MoneyContext';
import {
  askAssistant, confirmExpense, deleteExpense, getCategories, getPendingExpenses, getTags,
  transformExpenseForUI, updateExpense,
} from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import ExpenseComposer from '../ui/ExpenseComposer';
import { ExpenseListSkeleton } from '../ui/Skeletons';
import { PageHeader, SectionHeader, EmptyState, Panel } from '../ui';
import { money, relativeDay } from '../ui/money';
import { accents, radius, type } from '../../theme/tokens';

const DISCARD_UNDO_MS = 5000;
const EMPTY_COMPOSER = { open: false, data: {} };

/**
 * Messages — paste a forwarded bank/UPI/card alert and it's logged straight
 * away with a category suggested from past messages like it (expenses.
 * assistant's bank_message intent, same one the Ask box uses). It already
 * counts in every total; this screen is just where the suggestion gets a
 * once-over — accept it, fix it in the same editor Activity uses, or throw
 * it out — before it's marked confirmed.
 */
export default function MessagesPage() {
  const { refresh: refreshMoney } = useMoney();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { ok, message }

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [edits, setEdits] = useState({}); // { [expenseId]: categoryId }
  const [confirming, setConfirming] = useState({}); // { [expenseId]: true }

  // The same amount-first composer Activity uses for add/edit — opened here
  // pre-filled, so "edit this one" never has to be a second, lesser form.
  const [composer, setComposer] = useState(EMPTY_COMPOSER);
  const [savingEdit, setSavingEdit] = useState(false);

  // Discard, with a short undo window — mirrors the swipe-to-delete pattern
  // on the main Activity list rather than a blocking confirm dialog.
  const [discarded, setDiscarded] = useState(null); // { item }
  const discardTimerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c, t] = await Promise.allSettled([getPendingExpenses(), getCategories(), getTags()]);
    if (p.status === 'fulfilled') setPending(p.value);
    if (c.status === 'fulfilled') setCategories(c.value.results || []);
    if (t.status === 'fulfilled') setTags(t.value.results || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (discardTimerRef.current) clearTimeout(discardTimerRef.current); }, []);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await askAssistant(message);
      if (r.type === 'expense_pending') {
        setPending((prev) => [transformExpenseForUI(r.expense), ...prev]);
        setText('');
        setSendResult({ ok: true, message: `Found ${money(parseFloat(r.expense.amount))} — suggested as ${r.expense.category?.name || 'uncategorised'}.` });
      } else if (r.type === 'expense_added') {
        setText('');
        setSendResult({ ok: true, message: `That read as your own note, not a bank alert — added directly as ${r.expense.description}.` });
        refreshMoney();
      } else {
        setSendResult({ ok: false, message: r.reply || "Couldn't find an amount in that." });
      }
    } catch (e) {
      setSendResult({ ok: false, message: e.message || 'Something went wrong.' });
    } finally {
      setSending(false);
    }
  };

  const confirmOne = async (item) => {
    setConfirming((c) => ({ ...c, [item.id]: true }));
    try {
      const categoryId = edits[item.id];
      await confirmExpense(item.id, categoryId ? { categoryId } : undefined);
      setPending((prev) => prev.filter((p) => p.id !== item.id));
      refreshMoney();
    } catch (e) {
      setSendResult({ ok: false, message: e.message || 'Could not confirm that one.' });
    } finally {
      setConfirming((c) => { const n = { ...c }; delete n[item.id]; return n; });
    }
  };

  // Same shape ExpenseTrackerPage.openExpenseForm builds for an edit — so the
  // composer sees an identical "editing" session whether it was opened here
  // or from Activity.
  const openComposer = (item) => {
    setComposer({
      open: true,
      data: {
        id: item.id,
        amount: item.amount,
        description: item.description,
        categoryId: edits[item.id] ?? item.category?.id ?? '',
        date: item.date,
        tagIds: (item.tags || []).map((t) => t.id),
        location: item.location || '',
        paymentMethod: item.paymentMethod || '',
        transactionType: item.type || 'expense',
        isRecurring: item.isRecurring || false,
      },
    });
  };
  const closeComposer = () => setComposer(EMPTY_COMPOSER);

  const saveComposer = async () => {
    const d = composer.data;
    if (!d.amount || parseFloat(d.amount) <= 0) { setSendResult({ ok: false, message: 'Enter a valid amount.' }); return; }
    if (!d.description || d.description.trim().length < 3) { setSendResult({ ok: false, message: 'Enter a description.' }); return; }
    if (!d.categoryId) { setSendResult({ ok: false, message: 'Pick a category.' }); return; }
    setSavingEdit(true);
    try {
      const updated = await updateExpense(d.id, d);
      setPending((prev) => prev.map((p) => (p.id === d.id ? updated : p)));
      closeComposer();
      refreshMoney();
    } catch (e) {
      setSendResult({ ok: false, message: e.message || 'Could not save that edit.' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Optimistic remove + a 5s undo window before the delete actually commits.
  // A second discard while one is already in flight commits the first right
  // away, same as the Activity list's swipe-to-delete.
  const discardOne = (item) => {
    if (discardTimerRef.current) {
      clearTimeout(discardTimerRef.current);
      discardTimerRef.current = null;
      if (discarded?.item) deleteExpense(discarded.item.id).catch(() => {});
    }
    setPending((prev) => prev.filter((p) => p.id !== item.id));
    setDiscarded({ item });
    discardTimerRef.current = setTimeout(async () => {
      discardTimerRef.current = null;
      setDiscarded(null);
      try {
        await deleteExpense(item.id);
        refreshMoney();
      } catch {
        setSendResult({ ok: false, message: 'Could not discard that one.' });
        load();
      }
    }, DISCARD_UNDO_MS);
  };

  const undoDiscard = () => {
    if (discardTimerRef.current) { clearTimeout(discardTimerRef.current); discardTimerRef.current = null; }
    const item = discarded?.item;
    setDiscarded(null);
    if (!item) return;
    setPending((prev) => [item, ...prev]);
  };

  const categoriesByType = useMemo(() => {
    const map = {};
    for (const c of categories) (map[c.transaction_type] ||= []).push(c);
    return map;
  }, [categories]);

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
      <Reveal>
        <PageHeader
          icon={MarkChatUnreadRoundedIcon}
          title="Messages"
          subtitle="Paste a bank or UPI alert — I'll pull the amount and suggest a category"
        />
      </Reveal>

      <Reveal index={1}>
        <Panel sx={{ p: 1.75, mb: 3 }}>
          <TextField
            multiline minRows={2} maxRows={6} fullWidth
            placeholder={'"Rs.500.00 debited from A/c XX1234 on 01-Oct-25; Info: UPI/DR/SWIGGY. Avl Bal: Rs.12,340.00"'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.9rem' } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Box
              component="button"
              onClick={send}
              disabled={!text.trim() || sending}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 1.75, py: 0.75,
                borderRadius: `${radius.pill}px`, border: 'none', cursor: 'pointer', font: 'inherit',
                fontWeight: 650, fontSize: '0.85rem', color: '#fff',
                background: !text.trim() || sending ? 'action.disabledBackground' : `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`,
                opacity: !text.trim() || sending ? 0.5 : 1,
              }}
            >
              {sending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SendRoundedIcon sx={{ fontSize: 16 }} />}
              {sending ? 'Reading…' : 'Log it'}
            </Box>
          </Box>
          {sendResult && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 1.25 }}>
              {sendResult.ok
                ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: accents.mint, mt: '1px', flexShrink: 0 }} />
                : <ErrorOutlineRoundedIcon sx={{ fontSize: 16, color: accents.amber, mt: '1px', flexShrink: 0 }} />}
              <Typography variant="caption" color="text.secondary">{sendResult.message}</Typography>
            </Box>
          )}
        </Panel>
      </Reveal>

      {loading ? (
        <ExpenseListSkeleton rows={3} />
      ) : pending.length === 0 ? (
        <Reveal index={2}>
          <EmptyState
            icon={CheckCircleRoundedIcon}
            title="Nothing waiting"
            description="Forwarded bank messages land here with a suggested category until you confirm them."
            tone={accents.mint}
          />
        </Reveal>
      ) : (
        <Box>
          <Reveal index={2}><SectionHeader title="Pending confirmation" count={pending.length} /></Reveal>
          <Stack spacing={1.25}>
            {pending.map((item, i) => (
              <Reveal key={item.id} index={3 + i}>
                <PendingRow
                  item={item}
                  categories={categoriesByType[item.type] || categories}
                  selectedCategoryId={edits[item.id] ?? item.category?.id ?? ''}
                  onCategoryChange={(id) => setEdits((e) => ({ ...e, [item.id]: id }))}
                  onConfirm={() => confirmOne(item)}
                  confirming={!!confirming[item.id]}
                  onEdit={() => openComposer(item)}
                  onDiscard={() => discardOne(item)}
                />
              </Reveal>
            ))}
          </Stack>
        </Box>
      )}

      <Snackbar
        open={!!discarded}
        message={discarded ? `Discarded "${discarded.item.description}"` : ''}
        autoHideDuration={DISCARD_UNDO_MS}
        onClose={(_, reason) => { if (reason !== 'clickaway') setDiscarded(null); }}
        action={(
          <Box
            component="button"
            onClick={undoDiscard}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
              color: accents.cyan, fontWeight: 650, fontSize: '0.82rem', px: 1,
            }}
          >
            Undo
          </Box>
        )}
      />

      {/* Same composer Activity uses to add/edit an expense — opened here
          pre-filled with the pending row, so editing it looks and behaves
          identically wherever it's done from. */}
      <ExpenseComposer
        open={composer.open}
        editing
        data={composer.data}
        saving={savingEdit}
        categories={categories}
        tags={tags}
        onClose={closeComposer}
        onChange={(patch) => setComposer((prev) => ({ ...prev, data: { ...prev.data, ...patch } }))}
        onSave={saveComposer}
      />
    </Container>
  );
}

function PendingRow({ item, categories, selectedCategoryId, onCategoryChange, onConfirm, confirming, onEdit, onDiscard }) {
  const isIncome = item.type === 'income';
  const tone = item.category?.color || accents.amber;
  const initial = (item.description || item.category?.name || '?').charAt(0).toUpperCase();
  const tags = item.tags || [];

  return (
    <Panel tint={accents.amber} sx={{ p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Avatar sx={{
          width: 40, height: 40, flexShrink: 0, fontSize: '1rem', fontWeight: 700,
          bgcolor: `${tone}22`, color: tone, boxShadow: `inset 0 0 0 1.5px ${tone}3d`,
        }}>
          {initial}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 650, flex: 1, minWidth: 0 }} noWrap>{item.description}</Typography>
            <Typography sx={{
              fontFamily: type.displayFamily, fontWeight: 750, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              color: isIncome ? accents.mint : 'text.primary',
            }}>
              {isIncome ? '+' : ''}{money(item.amount)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">{relativeDay(item.date)}</Typography>
          {item.sourceMessage && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25, fontStyle: 'italic', lineHeight: 1.4 }}>
              from: "{item.sourceMessage}"
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: accents.amber }}>
          AI suggested
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.6 }}>
          <Select
            size="small"
            value={selectedCategoryId || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            displayEmpty
            sx={{ minWidth: 120, fontSize: '0.82rem', '& .MuiSelect-select': { py: 0.5 } }}
          >
            {!categories.some((c) => c.id === selectedCategoryId) && (
              <MenuItem value={selectedCategoryId}>{item.category?.name || 'Uncategorised'}</MenuItem>
            )}
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
          {tags.map((t) => (
            <Chip
              key={t.id ?? t.name} label={t.name} size="small"
              sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, bgcolor: `${t.color || accents.amber}22`, color: t.color || accents.amber }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, mt: 1.25 }}>
        <ActionButton onClick={onConfirm} disabled={confirming} color={accents.mint} flex
          icon={confirming ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}>
          {confirming ? 'Confirming…' : 'Confirm'}
        </ActionButton>
        <ActionButton onClick={onEdit} muted icon={<EditRoundedIcon sx={{ fontSize: 16 }} />} aria-label="Edit" />
        <ActionButton onClick={onDiscard} muted tone={accents.red} icon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />} aria-label="Discard" />
      </Box>
    </Panel>
  );
}

function ActionButton({ onClick, disabled, color, muted, tone, flex, icon, children, ...rest }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6,
        flex: flex ? 1 : '0 0 auto', py: 0.9, px: flex ? 1.5 : 1.1,
        borderRadius: `${radius.md}px`, border: 'none', cursor: disabled ? 'default' : 'pointer',
        font: 'inherit', fontWeight: 650, fontSize: '0.85rem',
        color: muted ? (tone || 'text.secondary') : '#fff',
        backgroundColor: muted ? 'action.hover' : color,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}{children}
    </Box>
  );
}
