import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import Panel from './Panel';

/**
 * A titled frame around a visualisation - optional header, legend slot and a
 * consistent inner padding so every chart on the app sits in the same shell.
 */
export default function ChartContainer({ title, subtitle, action, legend, children, tint, sx }) {
  return (
    <Panel tint={tint} sx={{ p: { xs: 2, sm: 2.5 }, ...sx }}>
      {(title || action) && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box>
            {title && <Typography sx={{ fontWeight: 650, fontSize: '1rem' }}>{title}</Typography>}
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
      )}
      {children}
      {legend && <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>{legend}</Box>}
    </Panel>
  );
}
