import React from 'react';
import { Box, Typography } from '@mui/material';
import Panel from './Panel';
import AnimatedNumber from './AnimatedNumber';
import { moneySmart } from './money';
import { type, accents } from '../../theme/tokens';

/**
 * A single headline figure — restrained. A quiet neutral icon + label over one
 * large tabular value that still counts up, with a single thin flat accent line
 * to distinguish tiles in a row (no bloom, glow, or gradient). `amount` renders
 * as money; pass `value` for anything else.
 */
export default function MetricCard({ icon: Icon, label, amount, value, color = accents.mint, format = 'smart', onClick, sx }) {
  return (
    <Panel interactive={!!onClick} onClick={onClick} sx={{ p: 1.75, ...sx }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
        {Icon && (
          <Box sx={{
            width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
          }}>
            <Icon sx={{ color: 'text.secondary', fontSize: 14 }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600 }}>{label}</Typography>
      </Box>
      <Typography sx={{
        fontFamily: type.displayFamily, fontWeight: 650, fontSize: { xs: '1.2rem', sm: '1.4rem' },
        letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: 'text.primary',
      }}>
        {amount !== undefined ? <AnimatedNumber value={amount} format={format} /> : (value ?? moneySmart(0))}
      </Typography>
      <Box aria-hidden sx={{ mt: 1, height: '2px', width: 28, borderRadius: 999, backgroundColor: color, opacity: 0.6 }} />
    </Panel>
  );
}
