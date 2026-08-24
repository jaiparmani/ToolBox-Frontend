import React from 'react';
import { Box, Typography } from '@mui/material';
import { state as stateTokens } from '../../theme/tokens';

const TONE = { success: stateTokens.success.dark, warning: stateTokens.warning.dark, danger: stateTokens.danger.dark, info: stateTokens.info.dark };

/**
 * A status indicator - a coloured dot + label. Status colours are reserved
 * (never a chart series). `dotOnly` for a bare indicator.
 */
export default function StatusBadge({ status = 'info', label, dotOnly, sx }) {
  const color = TONE[status] || TONE.info;
  return (
    <Box display="inline-flex" alignItems="center" gap={0.75} sx={sx}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}88`, flexShrink: 0 }} />
      {!dotOnly && label && <Typography variant="caption" sx={{ fontWeight: 600, color }}>{label}</Typography>}
    </Box>
  );
}

/**
 * Confidence badge for AI-derived values (an inferred category, a parsed
 * amount). Communicates certainty so the model's guess is never mistaken for a
 * fact - low confidence reads amber, not hidden.
 */
export function ConfidenceBadge({ level = 'high', sx }) {
  const map = {
    high: { color: stateTokens.success.dark, label: 'High confidence' },
    medium: { color: stateTokens.warning.dark, label: 'Worth a check' },
    low: { color: stateTokens.danger.dark, label: 'Low confidence' },
  };
  const m = map[level] || map.medium;
  return (
    <Box display="inline-flex" alignItems="center" gap={0.5}
      sx={{ px: 0.9, py: 0.25, borderRadius: 999, backgroundColor: `${m.color}1f`, ...sx }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: m.color }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: m.color, fontSize: '0.66rem' }}>{m.label}</Typography>
    </Box>
  );
}
