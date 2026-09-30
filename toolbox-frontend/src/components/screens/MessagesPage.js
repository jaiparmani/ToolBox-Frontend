import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Chip, CircularProgress, Container, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import MarkChatUnreadRoundedIcon from '@mui/icons-material/MarkChatUnreadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

import { useMoney } from '../../contexts/MoneyContext';
import {
  askAssistant, confirmExpense, getCategories, getPendingExpenses,
} from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import { ExpenseListSkeleton } from '../ui/Skeletons';
import { PageHeader, SectionHeader, EmptyState, Panel } from '../ui';
import { money, relativeDay } from '../ui/money';
import { accents, radius, type } from '../../theme/tokens';

/**
 * Messages — paste a forwarded bank/UPI/card alert and it's logged straight
 * away with a category suggested from past messages like it (expenses.
 * assistant's bank_message intent, same one the Ask box uses). It already
 * counts in every total; this screen is just where the suggestion gets a
 * once-over before it's marked confirmed.
 */
export default function MessagesPage() {
  const { refresh: refreshMoney } = useMoney();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { ok, message }

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [edits, setEdits] = useState({}); // { [expenseId]: categoryId }
  const [confirming, setConfirming] = useState({}); // { [expenseId]: true }

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.allSettled([getPendingExpenses(), getCategories()]);
    if (p.status === 'fulfilled') setPending(p.value);
    if (c.status === 'fulfilled') setCategories(c.value.results || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await askAssistant(message);
      if (r.type === 'expense_pending') {
        setPending((prev) => [
          {
            id: r.expense.id, amount: parseFloat(r.expense.amount), description: r.expense.description,
            date: r.expense.date, category: r.expense.category, tags: r.expense.tags,
            transaction_type: r.expense.transaction_type,
          },
          ...prev,
        ]);
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
                  categories={categoriesByType[item.transaction_type] || categories}
                  selectedCategoryId={edits[item.id] ?? item.category?.id ?? ''}
                  onCategoryChange={(id) => setEdits((e) => ({ ...e, [item.id]: id }))}
                  onConfirm={() => confirmOne(item)}
                  confirming={!!confirming[item.id]}
                />
              </Reveal>
            ))}
          </Stack>
        </Box>
      )}
    </Container>
  );
}

function PendingRow({ item, categories, selectedCategoryId, onCategoryChange, onConfirm, confirming }) {
  const isIncome = item.transaction_type === 'income';
  return (
    <Panel tint={accents.amber} sx={{ p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 650 }} noWrap>{item.description}</Typography>
          <Typography variant="caption" color="text.secondary">{relativeDay(item.date)}</Typography>
        </Box>
        <Typography sx={{
          fontFamily: type.displayFamily, fontWeight: 750, fontVariantNumeric: 'tabular-nums',
          color: isIncome ? accents.mint : 'text.primary',
        }}>
          {isIncome ? '+' : ''}{money(item.amount)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
        <Chip
          label="Suggested" size="small"
          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${accents.amber}22`, color: accents.amber }}
        />
        <Select
          size="small"
          value={selectedCategoryId || ''}
          onChange={(e) => onCategoryChange(e.target.value)}
          displayEmpty
          sx={{ flex: 1, fontSize: '0.82rem', '& .MuiSelect-select': { py: 0.5 } }}
        >
          {!categories.some((c) => c.id === selectedCategoryId) && (
            <MenuItem value={selectedCategoryId}>{item.category?.name || 'Uncategorised'}</MenuItem>
          )}
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Select>
      </Box>

      <Box
        component="button"
        onClick={onConfirm}
        disabled={confirming}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
          width: '100%', mt: 1.25, py: 0.9, borderRadius: `${radius.md}px`,
          border: 'none', cursor: confirming ? 'default' : 'pointer', font: 'inherit',
          fontWeight: 650, fontSize: '0.85rem', color: '#fff',
          backgroundColor: accents.mint, opacity: confirming ? 0.6 : 1,
        }}
      >
        {confirming ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
        {confirming ? 'Confirming…' : 'Confirm'}
      </Box>
    </Panel>
  );
}
