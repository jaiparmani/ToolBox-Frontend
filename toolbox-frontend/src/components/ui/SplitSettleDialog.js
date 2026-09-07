import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import { money } from './money';
import { accents } from '../../theme/tokens';
import SplitAmount from './SplitAmount';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Settle part of a debt, or all of it.
 *
 * `is_settled` was a boolean, so a debt was all-or-nothing: "he gave me 300 of
 * the 500" had nowhere to live, and the only truthful options were to leave the
 * whole thing standing or wipe it. The share now carries how much has actually
 * been paid, and this is where that figure is entered.
 *
 * Nothing here is invented. `outstanding` comes from the server's own rows
 * (share minus what has already been paid on it), the remainder is that number
 * minus what you type, and a payment larger than the debt is refused on both
 * sides rather than quietly capped.
 */
export default function SplitSettleDialog({
  open, outstanding = 0, direction = 'owed_to_you', counterparty, description,
  alreadyPaid = 0, saving = false, error = null, onClose, onConfirm,
}) {
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAmount(String(round2(outstanding)));
    setLocalError(null);
  }, [open, outstanding]);

  const entered = parseFloat(amount);
  const valid = Number.isFinite(entered) && entered > 0 && entered <= round2(outstanding);
  const remaining = valid ? round2(outstanding - entered) : outstanding;
  const owedByMe = direction === 'you_owe';

  const submit = () => {
    if (!Number.isFinite(entered) || entered <= 0) {
      setLocalError('Enter how much changed hands.');
      return;
    }
    if (entered > round2(outstanding)) {
      setLocalError(`That's more than the ${money(outstanding)} outstanding.`);
      return;
    }
    setLocalError(null);
    onConfirm(String(round2(entered)));
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 650, pb: 0.5 }}>
        {owedByMe ? 'Record a payment' : 'Mark money as received'}
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }} noWrap>
            {description}{counterparty ? ` · ${owedByMe ? 'to' : 'from'} ${counterparty}` : ''}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            px: 2, py: 1.5, mt: 1, mb: 2, borderRadius: 3,
            border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Still outstanding
            </Typography>
            <SplitAmount direction={direction} amount={outstanding} size="body1" />
          </Stack>
          {alreadyPaid > 0 && (
            <Typography variant="caption" color="text.secondary">
              {money(alreadyPaid)} already paid on this
            </Typography>
          )}
        </Box>

        <TextField
          autoFocus fullWidth type="number" label="Amount paid"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />

        {/* Shortcuts to real figures only — the whole debt, or half of it. */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Chip
            label={`All · ${money(outstanding)}`} size="small" variant="outlined"
            onClick={() => setAmount(String(round2(outstanding)))}
          />
          {outstanding > 1 && (
            <Chip
              label={`Half · ${money(round2(outstanding / 2))}`} size="small" variant="outlined"
              onClick={() => setAmount(String(round2(outstanding / 2)))}
            />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {valid && remaining > 0
            ? `${money(remaining)} would still be ${owedByMe ? 'owed by you' : 'owed to you'}.`
            : valid
              ? 'That clears it completely.'
              : 'Part of it is fine — the rest stays on the books.'}
        </Typography>

        {(localError || error) && (
          <Typography role="alert" variant="body2" sx={{ color: accents.red, mt: 1.5 }}>
            {localError || error}
          </Typography>
        )}
        {saving && <LinearProgress sx={{ mt: 2, borderRadius: 999 }} />}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving || !valid}>
          {saving ? 'Recording…' : owedByMe ? 'I paid this' : 'Received'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
