import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Panel from './Panel';
import AnimatedNumber from './AnimatedNumber';
import { money, moneySmart } from './money';
import { type, accents } from '../../theme/tokens';
import { resolveToneColor, srOnly } from './StatusBadge';

/**
 * A single headline figure — restrained. A quiet neutral icon + label over one
 * large tabular value that still counts up, with a single thin flat accent line
 * to distinguish tiles in a row (no bloom, glow, or gradient). `amount` renders
 * as money; pass `value` for anything else.
 *
 * Craft notes:
 * - Tracking is set per breakpoint, because the figure is a different size at
 *   each one and a single value would be too tight at 1.2rem or too loose at
 *   1.4rem (Apple Design §15).
 * - The counting figure is hidden from assistive tech and the *settled* number
 *   is put on the card's accessible name instead. A screen reader was
 *   previously read every intermediate frame of the count-up — dozens of
 *   figures that were never true.
 * - The accent rule resolves per mode; it was pinned to the dark-canvas accent.
 */
export default function MetricCard({
  icon: Icon,
  label,
  amount,
  value,
  sub,
  color = accents.mint,
  format = 'smart',
  onClick,
  sx,
  ...rest
}) {
  const theme = useTheme();
  const rule = resolveToneColor(color, theme.palette.mode);

  const hasAmount = amount !== undefined;
  // The truth, spelled out in full — never the compact form, which rounds.
  const spoken = hasAmount ? money(amount) : (value ?? moneySmart(0));

  return (
    <Panel
      interactive={!!onClick}
      onClick={onClick}
      sx={{ p: 1.75, ...sx }}
      {...rest}
    >
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
        {Icon && (
          <Box
            aria-hidden
            sx={{
              width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
            }}
          >
            <Icon sx={{ color: 'text.secondary', fontSize: 14 }} />
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
        >
          {label}
        </Typography>
      </Box>
      {/* The visible label is read normally; this supplies the settled figure. */}
      <Box component="span" sx={srOnly}>{spoken}</Box>
      <Typography
        aria-hidden
        sx={{
          fontFamily: type.displayFamily, fontWeight: 650,
          fontSize: { xs: '1.2rem', sm: '1.4rem' },
          letterSpacing: { xs: '-0.022em', sm: '-0.03em' },
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums', color: 'text.primary',
        }}
      >
        {hasAmount ? <AnimatedNumber value={amount} format={format} /> : (value ?? moneySmart(0))}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: 'block', mt: 0.25, letterSpacing: '0.01em' }}
        >
          {sub}
        </Typography>
      )}
      <Box
        aria-hidden
        sx={{ mt: 1, height: '2px', width: 28, borderRadius: 999, backgroundColor: rule, opacity: 0.6 }}
      />
    </Panel>
  );
}
