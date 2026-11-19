import React from 'react';
import { Box, Paper, Skeleton, Typography } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { accents, radius } from '../../theme/tokens';
import { getFinancialAgeScore } from '../rest/expenseTrackerApis';

const LEVELS = ['Student', 'Starter', 'Builder', 'Owner', 'Free'];

/**
 * Financial Age Score card — shows the user's financial maturity level on a
 * 5-step progression (Student → Starter → Builder → Owner → Free) with a
 * 2-sentence LLM-written description personalised to their actual signals.
 *
 * Shows a shimmer skeleton while loading; silently disappears on 404 (fewer
 * than 10 expenses) or any other error.
 */
export default function FinancialAgeCard() {
  const [state, setState] = React.useState({ data: null, loading: true, error: false });

  const load = React.useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: false }));
    try {
      const data = await getFinancialAgeScore();
      setState({ data, loading: false, error: false });
    } catch {
      setState({ data: null, loading: false, error: true });
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // 404 (not enough data), error, or null — render nothing
  if (!state.loading && !state.data) return null;

  const currentIndex = state.data ? LEVELS.indexOf(state.data.level) : -1;

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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: `${radius.md}px`,
            bgcolor: (t) => t.palette.mode === 'dark' ? `${accents.mint}20` : `${accents.mint}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <TrendingUpRoundedIcon sx={{ color: accents.mint, fontSize: 18 }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}>
          Financial age
        </Typography>
      </Box>

      {/* Step progression */}
      {state.loading ? (
        <Skeleton variant="rounded" height={28} width="100%" sx={{ mb: 2, borderRadius: 2 }} />
      ) : (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', mb: 2,
            position: 'relative',
          }}
        >
          {LEVELS.map((label, i) => {
            const isActive = i === currentIndex;
            const isPast = i < currentIndex;
            return (
              <React.Fragment key={label}>
                {/* Connector line before each dot except the first */}
                {i > 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      height: 1.5,
                      bgcolor: isPast || isActive
                        ? accents.mint
                        : 'divider',
                      transition: 'background-color 0.2s',
                    }}
                  />
                )}
                {/* Step dot + label */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <Box
                    sx={{
                      width: 12, height: 12, borderRadius: '50%',
                      bgcolor: isActive
                        ? accents.mint
                        : isPast
                          ? (t) => t.palette.mode === 'dark' ? `${accents.mint}55` : `${accents.mint}66`
                          : 'action.disabledBackground',
                      border: isActive ? `2px solid ${accents.mint}` : '2px solid transparent',
                      boxShadow: isActive ? `0 0 0 3px ${accents.mint}30` : 'none',
                      transition: 'all 0.2s',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      fontSize: 10,
                      lineHeight: 1.2,
                      color: isActive
                        ? accents.mint
                        : isPast
                          ? 'text.secondary'
                          : 'text.disabled',
                      fontWeight: isActive ? 700 : 400,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      )}

      {/* Level name */}
      {state.loading ? (
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
      ) : (
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 500,
            color: accents.mint,
            letterSpacing: '-0.02em',
            mb: 0.75,
          }}
        >
          {state.data?.level}
        </Typography>
      )}

      {/* Description */}
      {state.loading ? (
        <Box sx={{ mt: 0.5 }}>
          <Skeleton variant="text" width="95%" height={20} />
          <Skeleton variant="text" width="80%" height={20} />
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'text.secondary',
            letterSpacing: '-0.003em',
          }}
        >
          {state.data?.description}
        </Typography>
      )}

      {/* Caption */}
      {!state.loading && state.data && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1.5, color: 'text.disabled', fontStyle: 'italic' }}
        >
          Based on last 90 days
        </Typography>
      )}
    </Paper>
  );
}
