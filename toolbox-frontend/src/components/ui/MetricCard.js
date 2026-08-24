import React from 'react';
import { Box, Typography } from '@mui/material';
import Panel from './Panel';
import AnimatedNumber from './AnimatedNumber';
import { moneySmart } from './money';

/**
 * A single headline figure - icon badge, label, and a large value that counts
 * up. `amount` renders as money; pass `value` for anything else.
 */
export default function MetricCard({ icon: Icon, label, amount, value, color = '#0A84FF', format = 'smart', onClick, sx }) {
  return (
    <Panel interactive={!!onClick} onClick={onClick} sx={{ p: 1.75, ...sx }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75, position: 'relative' }}>
        {Icon && (
          <Box sx={{ width: 24, height: 24, borderRadius: '7px', backgroundColor: `${color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon sx={{ color, fontSize: 14 }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', sm: '1.4rem' }, letterSpacing: '-0.02em', position: 'relative' }}>
        {amount !== undefined ? <AnimatedNumber value={amount} format={format} /> : (value ?? moneySmart(0))}
      </Typography>
    </Panel>
  );
}
