import React from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import { accents, color, radius } from '../../theme/tokens';
import { money } from './money';
import { getMonthForecast } from '../rest/expenseTrackerApis';

const paceColor = (note) => {
  const n = (note || '').toLowerCase();
  if (n.includes('over')) return accents.red;
  if (n.includes('under')) return accents.green;
  return accents.mint;
};

/**
 * Compact month-end forecast widget for the dashboard. Shows projected total,
 * a current-vs-projected progress bar, and a short per-category callout.
 * Silently disappears if the endpoint returns 404 or an error (it will be
 * deployed — no data is the normal state before launch).
 */
export default function DashMonthForecast() {
  const [state, setState] = React.useState({ data: null, loading: true });

  React.useEffect(() => {
    getMonthForecast()
      .then(data => setState({ data, loading: false }))
      .catch(() => setState({ data: null, loading: false }));
  }, []);

  if (state.loading || !state.data) return null;

  const {
    projected_total = 0,
    current_spend = 0,
    days_left = 0,
    pace = '',
    categories = [],
  } = state.data;

  const pct = projected_total > 0
    ? Math.min((current_spend / projected_total) * 100, 100)
    : 0;
  const barColor = pct > 90 ? accents.red : pct > 75 ? accents.amber : accents.mint;
  const topCats = categories.slice(0, 3);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 2.5 },
        borderRadius: `${radius.lg}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Eyebrow */}
      <Typography
        sx={{
          fontSize: 11, fontWeight: 650, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'text.secondary', mb: 1,
        }}
      >
        Month forecast
      </Typography>

      {/* Hero number */}
      <Typography
        sx={{
          fontSize: { xs: 22, sm: 26 }, fontWeight: 700,
          letterSpacing: '-0.03em', color: 'text.primary', lineHeight: 1.1,
        }}
      >
        {money(projected_total)}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.3, mb: 1.5 }}>
        Based on your pace
        {days_left > 0 ? ` · ${days_left} day${days_left !== 1 ? 's' : ''} left` : ''}
        {pace ? ` · ${pace}` : ''}
      </Typography>

      {/* Progress: current vs projected */}
      <Box sx={{ mb: topCats.length > 0 ? 1.5 : 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
            {money(current_spend)} spent
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
            {Math.round(pct)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 5, borderRadius: 999,
            bgcolor: (t) => color.sunken[t.palette.mode],
            '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 999 },
          }}
        />
      </Box>

      {/* Per-category callouts */}
      {topCats.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {topCats.map((cat) => {
            const tint = paceColor(cat.budget_note);
            return (
              <Box
                key={cat.name}
                sx={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5, fontWeight: 550, color: 'text.secondary',
                    flex: 1, minWidth: 0,
                  }}
                  noWrap
                >
                  {cat.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary' }}>
                    {money(cat.projected)}
                  </Typography>
                  {cat.budget_note && (
                    <Box
                      sx={{
                        px: 0.75, py: 0.1,
                        borderRadius: `${radius.sm}px`,
                        bgcolor: `${tint}18`,
                        fontSize: 11, fontWeight: 600, color: tint,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.budget_note}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
