import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

/**
 * One confirmation dialog to replace scattered window.confirm() calls - themed,
 * with a destructive variant that colours the confirm button red.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, loading, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 650 }}>{title}</DialogTitle>
      {message && <DialogContent><Typography variant="body2" color="text.secondary">{message}</Typography></DialogContent>}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit">{cancelLabel}</Button>
        <Button onClick={onConfirm} variant="contained" color={destructive ? 'error' : 'primary'} disabled={loading}>
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
