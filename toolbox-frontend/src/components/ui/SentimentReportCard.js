import React, { useEffect, useState } from 'react';
import { Box, Chip, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { getSentimentReport } from '../rest/expenseTrackerApis';
import { accents } from '../../theme/tokens';

const MIN_TAGGED = 5;

const SENTIMENT_CONFIG = [
  { key: 'good',    label: 'Good',    emoji: '😊', color: accents.green },
  { key: 'neutral', label: 'Neutral', emoji: '😐', color: accents.amber },
  { key: 'regret',  label: 'Regret',  emoji: '😔', color: accents.red },
];

function SentimentBar({ label, emoji, color, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {count} <Typography component="span" variant="caption" sx={{ color: 'text.disabled' }}>({pct}%)</Typography>
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 999,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
        }}
      />
    </Box>
  );
}

export default function SentimentReportCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSentimentReport()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { /* silently hide on error */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Skeleton width="60%" height={20} sx={{ mb: 1.5 }} />
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={30} sx={{ borderRadius: 1 }} />)}
        </Stack>
      </Paper>
    );
  }

  // Hide if not enough data
  if (!data || data.total_tagged < MIN_TAGGED) return null;

  const { total_tagged, total_expenses, by_sentiment, category_breakdown, most_joyful, most_regretted } = data;
  const top3 = (category_breakdown || []).slice(0, 3);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <SentimentSatisfiedAltIcon fontSize="small" sx={{ color: accents.amber }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Regret Score</Typography>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        You've rated <strong>{total_tagged}</strong> of <strong>{total_expenses}</strong> expenses
      </Typography>

      {/* Sentiment bars */}
      <Stack spacing={1.25} sx={{ mt: 2, mb: 2.5 }}>
        {SENTIMENT_CONFIG.map(({ key, label, emoji, color }) => (
          <SentimentBar
            key={key}
            label={label}
            emoji={emoji}
            color={color}
            count={by_sentiment[key] ?? 0}
            total={total_tagged}
          />
        ))}
      </Stack>

      {/* Top regretted categories */}
      {top3.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Top regretted
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1, mb: 2 }}>
            {top3.map((row) => (
              <Box key={row.category} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {row.category}
                </Typography>
                <Chip
                  size="small"
                  label={`${Math.round(row.regret_rate * 100)}% regret`}
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: `${accents.red}1a`,
                    color: accents.red,
                    border: 'none',
                  }}
                />
              </Box>
            ))}
          </Stack>
        </>
      )}

      {/* Most joyful / most regretted summary */}
      {(most_joyful || most_regretted) && (
        <Box sx={{
          display: 'flex', gap: 1, flexWrap: 'wrap',
          pt: 1.5, borderTop: '1px solid', borderColor: 'divider',
        }}>
          {most_joyful && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              😊 Most joyful: <strong style={{ color: accents.green }}>{most_joyful}</strong>
            </Typography>
          )}
          {most_regretted && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              😔 Most regretted: <strong style={{ color: accents.red }}>{most_regretted}</strong>
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
