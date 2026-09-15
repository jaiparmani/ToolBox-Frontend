import React from 'react';
import { Box, IconButton, Paper, Skeleton, Typography } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { accents, radius } from '../../theme/tokens';
import { getSpendingPersonality } from '../rest/expenseTrackerApis';

/**
 * A 3-sentence spending personality profile written by the backend model.
 * Shows a shimmer skeleton while loading; silently disappears on 404 (not
 * enough data yet — fewer than 15 expenses) or any other error.
 */
export default function SpendingPersonalityCard() {
  const [state, setState] = React.useState({ data: null, loading: true, error: false });

  const load = React.useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: false }));
    try {
      const data = await getSpendingPersonality();
      setState({ data, loading: false, error: false });
    } catch {
      setState({ data: null, loading: false, error: true });
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // 404 (not enough data), error, or explicit null — render nothing
  if (!state.loading && !state.data) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: `${radius.lg}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header row: sparkle icon + title + refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: `${radius.md}px`,
              bgcolor: (t) => t.palette.mode === 'dark' ? `${accents.amber}20` : `${accents.amber}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ color: accents.amber, fontSize: 18 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Your spending personality
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={load}
          disabled={state.loading}
          aria-label="Refresh spending personality"
          sx={{ color: 'text.disabled' }}
        >
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {state.loading ? (
        <Box sx={{ mt: 0.5 }}>
          <Skeleton variant="text" width="95%" height={22} />
          <Skeleton variant="text" width="88%" height={22} />
          <Skeleton variant="text" width="76%" height={22} />
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: 1.8,
            color: 'text.secondary',
            letterSpacing: '-0.003em',
          }}
        >
          {state.data?.personality}
        </Typography>
      )}

      {/* Caption */}
      {!state.loading && state.data && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1.5, color: 'text.disabled', fontStyle: 'italic' }}
        >
          Based on your last 90 days
        </Typography>
      )}
    </Paper>
  );
}
