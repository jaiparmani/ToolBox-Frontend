import React from 'react';
import { Box, Button, Typography } from '@mui/material';

/**
 * No-data / all-clear surface, treated as part of the experience rather than a
 * blank. Same shape for "nothing yet", "all caught up", and "no results".
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, tone = 'text.disabled', dense }) {
  return (
    <Box sx={{ py: dense ? 4 : 7, px: 3, textAlign: 'center' }}>
      {Icon && <Icon sx={{ fontSize: dense ? 40 : 52, color: tone, mb: 1.5 }} />}
      <Typography variant="h6" sx={{ fontWeight: 650 }}>{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 320, mx: 'auto' }}>{description}</Typography>}
      {actionLabel && <Button variant="contained" onClick={onAction} sx={{ mt: 2.5 }}>{actionLabel}</Button>}
    </Box>
  );
}
