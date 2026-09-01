import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Container, IconButton, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';

import { useAuth } from '../../contexts/AuthContext';
import { useMoney } from '../../contexts/MoneyContext';
import { getRecurring, createRecurring, deleteRecurring, getCategories } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import AuroraBackground from '../motion/AuroraBackground';
import {
  PageHeader, SectionHeader, Panel, EmptyState, AmountDisplay, SegmentedControl,
  BottomSheet, ConfirmDialog, ErrorBanner,
} from '../ui';
import { accents } from '../../theme/tokens';
import { feedback } from '../ui/feedback';

const CADENCE = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];
const UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

function cadenceLabel(rule) {
  const unit = UNIT[rule.cadence] || rule.cadence;
  const n = rule.interval || 1;
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { transaction_type: 'expense', amount: '', description: '', cadence: 'monthly', interval: '1', anchor_date: today(), end_date: '', category: '' };

/**
 * Recurring — the income and bills that drive the whole forecast. These are the
 * inputs behind the Cash Flow River, Safe-to-Spend and the Money Pulse, so the
 * screen makes them visible and editable, and refreshes the shared money state
 * on every change so the effect is immediate elsewhere.
 */
export default function RecurringPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { refresh: refreshMoney } = useMoney();
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.allSettled([getRecurring(), getCategories()]);
      if (r.status === 'fulfilled') setRules(r.value);
      if (c.status === 'fulfilled') setCategories(Array.isArray(c.value) ? c.value : c.value.results || []);
    } catch { /* handled per-call */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const { income, bills } = useMemo(() => ({
    income: rules.filter(r => r.transaction_type === 'income'),
    bills: rules.filter(r => r.transaction_type === 'expense'),
  }), [rules]);

  const openForm = () => { setForm(EMPTY_FORM); setFormOpen(true); };

  const save = async () => {
    if (!form.amount || !form.description.trim()) { setError('Add an amount and a description.'); return; }
    setSaving(true);
    try {
      await createRecurring({
        description: form.description.trim(),
        amount: form.amount,
        transaction_type: form.transaction_type,
        cadence: form.cadence,
        interval: parseInt(form.interval, 10) || 1,
        anchor_date: form.anchor_date,
        end_date: form.end_date || null,
        category: form.category || null,
      });
      feedback('success');
      setFormOpen(false);
      await load();
      refreshMoney();           // the forecast changes — reflect it everywhere
    } catch (e) { feedback('error'); setError(e.message || 'Could not save that recurring item.'); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteRecurring(confirmDel.id);
      setConfirmDel(null);
      await load();
      refreshMoney();
    } catch (e) { setError(e.message || 'Could not remove that item.'); }
    finally { setDeleting(false); }
  };

  if (isLoading || !isAuthenticated) return null;
  const isIncome = form.transaction_type === 'income';
  const tone = isIncome ? accents.mint : accents.blue;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 10, position: 'relative' }}>
      {/* Living backdrop — same premium climate as the money screens */}
      <AuroraBackground />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <Reveal>
        <PageHeader
          icon={AutorenewRoundedIcon}
          gradient={`linear-gradient(135deg, ${accents.violet}, ${accents.cyan})`}
          glow={`${accents.violet}55`}
          title="Recurring"
          subtitle="The income & bills behind your forecast"
          actions={
            <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={openForm}>
              Add
            </Button>
          }
        />
        {/* Financial weather now lives once in the app top bar, not per-screen. */}
      </Reveal>

      {loading ? (
        <Stack spacing={1.25}>
          {[0, 1, 2].map(i => <Box key={i} sx={{ height: 68, borderRadius: 3, border: '1px solid', borderColor: 'divider', opacity: 0.4 }} />)}
        </Stack>
      ) : rules.length === 0 ? (
        <Reveal index={1}>
          <Panel>
            <EmptyState
              icon={AutorenewRoundedIcon}
              title="No recurring items yet"
              description="Add your salary, rent, or subscriptions and they'll drive your Cash Flow River and Safe-to-Spend forecast."
              actionLabel="Add your first"
              onAction={openForm}
            />
          </Panel>
        </Reveal>
      ) : (
        <>
          {income.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Reveal index={1}><SectionHeader title="Income" count={income.length} /></Reveal>
              <Stack spacing={1.25}>
                {income.map((r, i) => (
                  <Reveal key={r.id} index={2 + i}><RuleRow rule={r} onDelete={() => setConfirmDel(r)} /></Reveal>
                ))}
              </Stack>
            </Box>
          )}
          {bills.length > 0 && (
            <Box>
              <Reveal index={2}><SectionHeader title="Bills & subscriptions" count={bills.length} /></Reveal>
              <Stack spacing={1.25}>
                {bills.map((r, i) => (
                  <Reveal key={r.id} index={3 + i}><RuleRow rule={r} onDelete={() => setConfirmDel(r)} /></Reveal>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Add form */}
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)}>
        <Typography variant="h6" sx={{ fontWeight: 650, mb: 2 }}>New recurring item</Typography>
        <Stack spacing={2}>
          <SegmentedControl
            value={form.transaction_type}
            onChange={(v) => setForm(f => ({ ...f, transaction_type: v }))}
            options={[
              { id: 'expense', label: 'Bill / subscription', color: accents.blue },
              { id: 'income', label: 'Income', color: accents.mint },
            ]}
          />
          <TextField
            label="Amount" type="number" value={form.amount} fullWidth
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            InputProps={{ startAdornment: <Box sx={{ mr: 0.5, color: 'text.secondary' }}>₹</Box> }}
          />
          <TextField
            label="Description" value={form.description} fullWidth
            placeholder={isIncome ? 'Salary' : 'Rent, Netflix…'}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>Repeats</Typography>
            <SegmentedControl
              value={form.cadence}
              onChange={(v) => setForm(f => ({ ...f, cadence: v }))}
              options={CADENCE.map(c => ({ ...c, color: tone }))}
            />
          </Box>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={`Every N ${UNIT[form.cadence]}s`} type="number" value={form.interval} sx={{ flex: 1 }}
              onChange={(e) => setForm(f => ({ ...f, interval: e.target.value }))}
            />
            <TextField
              label="Starts on" type="date" value={form.anchor_date} sx={{ flex: 1.4 }}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setForm(f => ({ ...f, anchor_date: e.target.value }))}
            />
          </Stack>
          <TextField
            select label="Category (optional)" value={form.category} fullWidth
            onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <MenuItem value="">None</MenuItem>
            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Ends on (optional)" type="date" value={form.end_date} fullWidth
            InputLabelProps={{ shrink: true }}
            onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
          />
          <Button variant="contained" size="large" onClick={save} disabled={saving}
            sx={{ backgroundColor: tone, '&:hover': { backgroundColor: tone } }}>
            {saving ? 'Saving…' : `Add ${isIncome ? 'income' : 'bill'}`}
          </Button>
        </Stack>
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDel}
        title="Remove this recurring item?"
        message={confirmDel ? `"${confirmDel.description}" will stop driving your forecast. Past transactions are unaffected.` : ''}
        confirmLabel="Remove"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
      </Box>
    </Container>
  );
}

function RuleRow({ rule, onDelete }) {
  const isIncome = rule.transaction_type === 'income';
  const tone = isIncome ? accents.mint : accents.blue;
  const Icon = isIncome ? NorthEastRoundedIcon : SouthWestRoundedIcon;
  return (
    <Panel sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, backgroundColor: `${tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ color: tone, fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{rule.description}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {cadenceLabel(rule)} · next {fmtDate(rule.next_date)}
          {rule.category_name ? ` · ${rule.category_name}` : ''}
        </Typography>
      </Box>
      <AmountDisplay value={isIncome ? Number(rule.amount) : -Number(rule.amount)} tone="auto" showSign size="md" />
      <IconButton size="small" aria-label={`Remove ${rule.description}`} onClick={onDelete} sx={{ color: 'text.disabled', '&:hover': { color: accents.red } }}>
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Panel>
  );
}
