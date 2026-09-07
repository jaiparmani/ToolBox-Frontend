import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, LinearProgress, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { money } from './money';
import { accents } from '../../theme/tokens';

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Reopen the whole bill, not one number.
 *
 * Editing a split used to mean editing its amount and nothing else, so a shared
 * bill saved with the wrong description, date or category had no way back short
 * of deleting it and starting again. This is the create dialog, reopened on an
 * existing bill: everything it collected, it can correct.
 *
 * Who is on the bill is the one asymmetry. The people on a split live in the
 * payer's own contact list, so only the payer sees the roster — the other side
 * edits their own share and the bill's details, which is what they can actually
 * speak to. The server enforces the same rule; this only avoids offering a
 * control that would be refused.
 *
 * Every figure shown is arithmetic on what's in the fields — the residual is
 * literally `bill − Σ shares`, recomputed as you type, so the payer can see
 * their own share fall to zero rather than discovering it after saving.
 */
export default function SplitEditDialog({
  open, item, categories = [], saving = false, onClose, onSave,
}) {
  const [form, setForm] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [newName, setNewName] = useState('');

  const isPayer = item?.direction === 'owed_to_you';

  // Reset from the row every time it opens, so a cancelled edit leaves nothing
  // behind and a second open never shows the last bill's numbers.
  useEffect(() => {
    if (!open || !item) return;
    setLocalError(null);
    setNewName('');
    setForm({
      description: item.description || '',
      date: item.date || '',
      categoryId: item.categoryId || '',
      expenseAmount: String(item.expenseTotal ?? ''),
      amount: String(item.amount ?? ''),
      participants: (item.participants || []).map(p => ({
        splitId: p.splitId, personId: p.personId, name: p.name,
        amount: String(p.amount), isNew: false,
      })),
    });
  }, [open, item]);

  const shares = useMemo(() => {
    if (!form) return 0;
    if (!isPayer) return num(form.amount);
    return form.participants.reduce((sum, p) => sum + num(p.amount), 0);
  }, [form, isPayer]);

  const bill = form ? num(form.expenseAmount) : 0;
  // The payer has no row of their own: their share is what is left of the bill
  // after everyone else's. It may legitimately be zero — that is what covering
  // somebody's whole share looks like.
  const residual = Math.max(0, bill - shares);
  const overBill = shares > bill;

  if (!item || !form) return null;

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const setParticipant = (index, value) => setForm(prev => ({
    ...prev,
    participants: prev.participants.map((p, i) => (i === index ? { ...p, amount: value } : p)),
    // Keep the edited row's own field in step: it is one of these rows.
    amount: prev.participants[index]?.splitId === item.id ? value : prev.amount,
  }));

  const removeParticipant = (index) => setForm(prev => ({
    ...prev,
    participants: prev.participants.filter((_, i) => i !== index),
  }));

  const addParticipant = () => {
    const name = newName.trim();
    if (!name) return;
    if (form.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setLocalError(`${name} is already on this bill.`);
      return;
    }
    setForm(prev => ({
      ...prev,
      participants: [...prev.participants, { personId: null, name, amount: '', isNew: true }],
    }));
    setNewName('');
    setLocalError(null);
  };

  const submit = () => {
    if (!form.description.trim()) { setLocalError('What was this for?'); return; }
    if (bill <= 0) { setLocalError('The bill has to be more than zero.'); return; }

    if (isPayer) {
      const bad = form.participants.find(p => num(p.amount) <= 0);
      if (bad) { setLocalError(`${bad.name}'s share has to be more than zero.`); return; }
      if (!form.participants.length) {
        setLocalError('A split needs at least one other person — remove it instead.');
        return;
      }
      const mine = form.participants.find(p => p.splitId === item.id);
      if (!mine) {
        setLocalError("You can't drop the share you're editing here — remove the split instead.");
        return;
      }
    } else if (num(form.amount) <= 0) {
      setLocalError('Your share has to be more than zero.');
      return;
    }

    setLocalError(null);
    onSave({
      description: form.description.trim(),
      date: form.date || undefined,
      categoryId: form.categoryId || undefined,
      // The bill only ever grows to cover the shares; the server holds that
      // rule, so send exactly what is on screen.
      expenseAmount: form.expenseAmount,
      amount: isPayer
        ? (form.participants.find(p => p.splitId === item.id)?.amount ?? form.amount)
        : form.amount,
      participants: isPayer
        ? form.participants.map(p => ({
          personId: p.personId || undefined, name: p.name, amount: p.amount,
        }))
        : undefined,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 650, pb: 0.5 }}>
        Edit this shared bill
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
          {isPayer
            ? 'You paid it. Everyone on it is told what changed.'
            : `${item.counterparty} paid it. They're told what you change.`}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="What was it for?" fullWidth autoFocus
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Date" type="date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
            <TextField
              label="Category" select fullWidth
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              helperText={categories.length ? ' ' : 'Categories are still loading'}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Total bill" type="number" fullWidth
            value={form.expenseAmount}
            onChange={(e) => setField('expenseAmount', e.target.value)}
            helperText={`What ${isPayer ? 'you' : item.counterparty} actually paid`}
          />

          <Divider />

          {isPayer ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 650 }}>
                Who owes what
              </Typography>
              {form.participants.map((p, i) => (
                <Stack key={`${p.splitId || p.name}-${i}`} direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ flex: 1, fontWeight: 500 }} noWrap>
                    {p.name}{p.isNew ? ' · new' : ''}
                  </Typography>
                  <TextField
                    size="small" type="number" label="Share" sx={{ width: 130 }}
                    value={p.amount}
                    onChange={(e) => setParticipant(i, e.target.value)}
                  />
                  <IconButton
                    size="small"
                    aria-label={`Take ${p.name} off this bill`}
                    onClick={() => removeParticipant(i)}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              ))}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  size="small" label="Add someone" fullWidth
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
                />
                <Button
                  size="small" startIcon={<PersonAddIcon />} onClick={addParticipant}
                  disabled={!newName.trim()}
                >
                  Add
                </Button>
              </Stack>
            </>
          ) : (
            <TextField
              label="Your share" type="number" fullWidth
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              helperText={item.settledAmount > 0
                ? `You've already paid ${money(item.settledAmount)} of this — it can't go below that.`
                : 'What you owe on this bill'}
            />
          )}

          {/* The residual, computed here from the fields above — never a figure
              the screen made up, and it is allowed to be zero. */}
          <Box
            sx={{
              px: 2, py: 1.5, borderRadius: 3, bgcolor: 'action.hover',
              border: '1px solid', borderColor: 'divider',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2" color="text.secondary">
                {isPayer ? 'Your own share of this bill' : `${item.counterparty}'s own share`}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {money(residual)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {money(bill)} bill − {money(shares)} shared
              {overBill ? ' · the bill will grow to cover the shares' : ''}
            </Typography>
          </Box>

          {localError && (
            <Typography role="alert" variant="body2" sx={{ color: accents.red }}>
              {localError}
            </Typography>
          )}
        </Stack>
        {saving && <LinearProgress sx={{ mt: 2, borderRadius: 999 }} />}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
