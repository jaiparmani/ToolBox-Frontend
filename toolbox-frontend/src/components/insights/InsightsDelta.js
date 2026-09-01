import React from 'react';
import { Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { accents, type } from '../../theme/tokens';

/**
 * Month-over-month change for a spend figure, as a quiet inline chip.
 *
 * Semantics, not decoration: spending MORE than last period reads as caution
 * (amber, up arrow); spending LESS reads as on-track (mint, down arrow). The
 * green accent is never used to mean "big" — only "you spent less". A brand-new
 * line (no prior spend) is called out as "new" rather than a fake +100%.
 */
export default function InsightsDelta({ value, prev, size = 'sm' }) {
  const v = Number(value) || 0;
  const p = Number(prev) || 0;
  if (v <= 0 && p <= 0) return null;

  const isNew = p <= 0 && v > 0;
  const gone = p > 0 && v <= 0;
  const pct = p > 0 ? Math.round(((v - p) / p) * 100) : 0;
  const up = v > p;

  const tone = isNew ? accents.amber : gone ? accents.mint : up ? accents.amber : accents.mint;
  const Icon = isNew ? ArrowUpwardIcon : gone ? ArrowDownwardIcon : up ? ArrowUpwardIcon : ArrowDownwardIcon;
  const label = isNew ? 'new' : gone ? 'cleared' : `${Math.abs(pct)}%`;
  const fontSize = size === 'sm' ? 11 : 12.5;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0,
        px: 0.65, py: '2px', borderRadius: '7px',
        bgcolor: `${tone}1f`, color: tone,
        fontFamily: type.displayFamily, fontWeight: 650, fontSize,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap',
      }}
    >
      <Icon sx={{ fontSize: fontSize + 2 }} />
      {label}
    </Box>
  );
}
