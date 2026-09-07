import React from 'react';
import { Typography, useTheme } from '@mui/material';
import { money, moneySmart } from './money';
import { flowColor, type } from '../../theme/tokens';

/**
 * One place money is rendered on screen: sign, tone and size handled together
 * so amounts read the same everywhere. tone 'auto' colours by sign (in/out).
 *
 * Type is set per size rather than once (Apple Design §15): tracking tightens
 * as the figure grows — a hero balance at 2.8rem needs −0.03em to stop reading
 * as loose, while the same value at 0.95rem inside a row needs none at all —
 * and weight and leading move with it, so hierarchy comes from the set, not
 * from size alone. Large figures pick up the display face; small inline ones
 * stay on the body face so they sit level with the text around them.
 */
const SIZES = {
  sm:   { size: '0.95rem', weight: 600, tracking: '0',       leading: 1.4,  display: false },
  md:   { size: '1.15rem', weight: 650, tracking: '-0.01em', leading: 1.3,  display: false },
  lg:   { size: '1.6rem',  weight: 700, tracking: '-0.022em', leading: 1.15, display: true },
  hero: { size: 'clamp(2rem, 7vw, 2.8rem)', weight: 700, tracking: '-0.032em', leading: 1.02, display: true },
};

export default function AmountDisplay({
  value,
  size = 'md',
  tone = 'default',
  showSign = false,
  compact = false,
  sx,
  ...rest
}) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const n = Number(value) || 0;

  // These used to read `flowColor.in.dark` unconditionally, so every signed
  // amount kept its dark-canvas hue on the light canvas.
  let color = 'text.primary';
  if (tone === 'auto') color = n >= 0 ? flowColor.in[mode] : flowColor.out[mode];
  else if (tone === 'in') color = flowColor.in[mode];
  else if (tone === 'out') color = flowColor.out[mode];

  const t = SIZES[size] || SIZES.md;
  const sign = showSign ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  const text = (compact ? moneySmart : money)(Math.abs(n));

  return (
    <Typography
      component="span"
      // "−" (U+2212) is drawn correctly but announced inconsistently; spell the
      // direction out so a screen reader never loses the sign on a figure.
      aria-label={showSign && n !== 0 ? `${n > 0 ? 'plus' : 'minus'} ${text}` : undefined}
      sx={{
        fontFamily: t.display ? type.displayFamily : 'inherit',
        fontWeight: t.weight,
        fontSize: t.size,
        letterSpacing: t.tracking,
        lineHeight: t.leading,
        fontVariantNumeric: 'tabular-nums',
        color,
        ...sx,
      }}
      {...rest}
    >
      {sign}{text}
    </Typography>
  );
}
