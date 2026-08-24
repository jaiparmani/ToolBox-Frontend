import React from 'react';
import { Typography } from '@mui/material';
import { money } from './money';
import { flowColor } from '../../theme/tokens';

/**
 * One place money is rendered on screen: sign, tone and size handled together
 * so amounts read the same everywhere. tone 'auto' colours by sign (in/out).
 */
const SIZES = { sm: '0.95rem', md: '1.15rem', lg: '1.6rem', hero: 'clamp(2rem, 7vw, 2.8rem)' };

export default function AmountDisplay({ value, size = 'md', tone = 'default', showSign = false, sx, ...rest }) {
  const n = Number(value) || 0;
  let color = 'text.primary';
  if (tone === 'auto') color = n >= 0 ? flowColor.in.dark : flowColor.out.dark;
  else if (tone === 'in') color = flowColor.in.dark;
  else if (tone === 'out') color = flowColor.out.dark;
  const sign = showSign ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  return (
    <Typography component="span"
      sx={{ fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', fontSize: SIZES[size], color, ...sx }}
      {...rest}>
      {sign}{money(Math.abs(n))}
    </Typography>
  );
}
