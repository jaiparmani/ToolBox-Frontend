import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

/**
 * What the model is doing, while it does it.
 *
 * These calls take five to fifteen seconds against a free tier. A bare spinner
 * for that long reads as a hang, so this names the step and, past ten seconds,
 * says the wait is expected rather than leaving the user guessing.
 */
export default function ThinkingHint({ label = 'Reading that…', show }) {
  const [slow, setSlow] = React.useState(false);

  React.useEffect(() => {
    if (!show) { setSlow(false); return undefined; }
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, [show]);

  if (!show) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <LinearProgress sx={{ borderRadius: 999, height: 3 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, px: 1 }}>
        {slow ? 'Still going — the free model queue is slow right now.' : label}
      </Typography>
    </Box>
  );
}
