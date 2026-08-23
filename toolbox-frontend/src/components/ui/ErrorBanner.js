import React from 'react';
import { Alert, AlertTitle, Collapse } from '@mui/material';

/**
 * Errors that stay put.
 *
 * These used to be snackbars that vanished after four seconds - long enough to
 * see something went wrong, too short to read why, and gone before you could
 * act on a message like which quota ran out and when it resets. Failures stay
 * until dismissed; only confirmations are allowed to disappear on their own.
 */
export default function ErrorBanner({ error, onClose }) {
  return (
    <Collapse in={!!error} unmountOnExit>
      <Alert
        severity="error"
        onClose={onClose}
        sx={{ mb: 2, borderRadius: 3, alignItems: 'flex-start' }}
      >
        <AlertTitle sx={{ fontWeight: 600, mb: 0.25 }}>That didn't work</AlertTitle>
        {error}
      </Alert>
    </Collapse>
  );
}
