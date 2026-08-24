import React from 'react';
import { Paper } from '@mui/material';
import { radius } from '../../theme/tokens';

/**
 * The one surface primitive. Variants map to the elevation language:
 *   glass    - translucent + blur, for hierarchy (use sparingly, per the brief)
 *   elevated - opaque raised card
 *   outlined - flat, hairline border only (the default; least visual weight)
 * `tint` washes a state/accent colour in from the top-left for emphasis.
 */
export default function Panel({ variant = 'outlined', tint, interactive, sx, children, ...rest }) {
  const base = {
    borderRadius: `${radius.xl}px`,
    border: '1px solid',
    borderColor: 'divider',
    position: 'relative',
    overflow: 'hidden',
    ...(tint && {
      '&::before': {
        content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(120% 100% at 0% 0%, ${tint}22, transparent 60%)`,
      },
    }),
    ...(interactive && {
      cursor: 'pointer',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
      '&:hover': { transform: 'translateY(-3px)', borderColor: tint || 'primary.main' },
    }),
  };
  const byVariant = {
    glass: { backdropFilter: 'blur(30px) saturate(1.5)', backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(24,24,32,0.62)' : 'rgba(255,255,255,0.7)' },
    elevated: { backgroundColor: 'background.paper' },
    outlined: { backgroundColor: 'transparent' },
  };
  return (
    <Paper elevation={0} sx={{ ...base, ...byVariant[variant], ...sx }} {...rest}>
      {children}
    </Paper>
  );
}
