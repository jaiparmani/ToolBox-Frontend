import React from 'react';
import { Box, Typography } from '@mui/material';
import Panel from './Panel';
import AnimatedNumber from './AnimatedNumber';
import { moneySmart } from './money';
import { type } from '../../theme/tokens';

/**
 * A single headline figure - icon badge, label, and a large value that counts
 * up. `amount` renders as money; pass `value` for anything else.
 *
 * Dressed as a small instrument: a bloom of the metric's own colour pooling in
 * the corner, the figure set in Geist and tinted toward that colour, and a thin
 * gradient meter-line under it. Static — no per-frame work — so a whole grid of
 * these stays cheap.
 */
export default function MetricCard({ icon: Icon, label, amount, value, color = '#0A84FF', format = 'smart', onClick, sx }) {
  return (
    <Panel interactive={!!onClick} onClick={onClick} sx={{ p: 1.75, position: 'relative', overflow: 'hidden', ...sx }}>
      {/* Ambient colour bloom */}
      <Box aria-hidden sx={{
        position: 'absolute', top: -26, right: -26, width: 72, height: 72, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}33, transparent 70%)`, filter: 'blur(10px)', pointerEvents: 'none',
      }} />
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75, position: 'relative' }}>
        {Icon && (
          <Box sx={{
            width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: `${color}26`, boxShadow: `inset 0 0 0 1px ${color}42, 0 3px 8px -3px ${color}88`,
          }}>
            <Icon sx={{ color, fontSize: 14 }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>{label}</Typography>
      </Box>
      <Typography sx={{
        fontFamily: type.displayFamily, fontWeight: 700, fontSize: { xs: '1.2rem', sm: '1.4rem' },
        letterSpacing: '-0.03em', position: 'relative', fontVariantNumeric: 'tabular-nums',
      }}>
        {amount !== undefined ? <AnimatedNumber value={amount} format={format} /> : (value ?? moneySmart(0))}
      </Typography>
      {/* Instrument meter-line */}
      <Box aria-hidden sx={{
        mt: 0.85, height: 3, borderRadius: 999, position: 'relative', overflow: 'hidden',
        background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: 999,
          background: `linear-gradient(90deg, ${color}, ${color}55)`, boxShadow: `0 0 8px ${color}66`,
        }} />
      </Box>
    </Panel>
  );
}
