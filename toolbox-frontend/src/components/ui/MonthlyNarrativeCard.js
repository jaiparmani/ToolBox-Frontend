import React from 'react';
import { Box, IconButton, Paper, Skeleton, Typography } from '@mui/material';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { accents, color, radius } from '../../theme/tokens';
import { getMonthlyNarrative } from '../rest/expenseTrackerApis';

/**
 * A short prose narrative for a given month, written by the backend model.
 * Shows a shimmer skeleton while loading; silently disappears on 404 (the
 * endpoint is "will be deployed" — no data yet is the normal state).
 */
export default function MonthlyNarrativeCard({ year, month }) {
  const [state, setState] = React.useState({ data: null, loading: true, error: false });

  const load = React.useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: false }));
    try {
      const data = await getMonthlyNarrative(year, month);
      setState({ data, loading: false, error: false });
    } catch {
      setState({ data: null, loading: false, error: true });
    }
  }, [year, month]);

  React.useEffect(() => { load(); }, [load]);

  // 404 or error — render nothing rather than an empty card
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
      {/* Header row: quote icon + refresh */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: `${radius.md}px`,
            bgcolor: (t) => t.palette.mode === 'dark' ? `${accents.violet}20` : `${accents.violet}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <FormatQuoteRoundedIcon sx={{ color: accents.violet, fontSize: 20 }} />
        </Box>
        <IconButton
          size="small"
          onClick={load}
          disabled={state.loading}
          aria-label="Refresh narrative"
          sx={{ color: 'text.disabled' }}
        >
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {state.loading ? (
        <Box sx={{ mt: 0.5 }}>
          <Skeleton variant="text" width="92%" height={22} />
          <Skeleton variant="text" width="85%" height={22} />
          <Skeleton variant="text" width="72%" height={22} />
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: { xs: 15, sm: 16 },
            lineHeight: 1.7,
            color: 'text.secondary',
            fontStyle: 'italic',
            letterSpacing: '-0.005em',
          }}
        >
          {state.data?.narrative}
        </Typography>
      )}
    </Paper>
  );
}
