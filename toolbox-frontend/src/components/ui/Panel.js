import React from 'react';
import { Paper } from '@mui/material';
import { radius, motion as motionTokens, color as colorTokens, shadow } from '../../theme/tokens';
import { resolveToneColor, isColorValue } from './StatusBadge';

/**
 * The one surface primitive. Variants map to the elevation language:
 *   glass    - translucent + blur, for hierarchy (use sparingly, per the brief)
 *   elevated - opaque raised card
 *   outlined - flat, hairline border only (the default; least visual weight)
 * `tint` (or its alias `tone`) washes a state/accent colour in from the
 * top-left for emphasis.
 *
 * Three things this surface owes every screen that uses it:
 *
 * - **Response on pointer-down** (Apple Design §1). An interactive panel used to
 *   only answer on hover — nothing at all on a phone, where there is no hover.
 *   It now takes a small scale on `:active`, which fires the instant a finger
 *   lands rather than on release.
 * - **A keyboard path.** `interactive` + `onClick` was a mouse-only affordance;
 *   it now defaults to `role="button"`, `tabIndex={0}` and Enter/Space. Callers
 *   that already pass their own (InboxPage's EventRow does) still win, because
 *   `...rest` is spread last.
 * - **Honest materials** (§12, §14). The glass variant reads its colour from
 *   the token file instead of two inline rgba literals, and collapses to a
 *   solid surface under `prefers-reduced-transparency`, where a blurred
 *   translucent layer is exactly what the user asked us not to render.
 */
export default function Panel({
  variant = 'outlined',
  tint,
  tone,          // alias — several screens already pass `tone`; it used to leak
  interactive,   // straight through to the DOM as an unknown attribute.
  onClick,
  onKeyDown,
  sx,
  children,
  ...rest
}) {
  const wash = tint ?? tone;
  const clickable = !!(interactive && onClick);

  const base = (theme) => {
    const mode = theme.palette.mode;
    const accent = resolveToneColor(wash, mode);
    const canWash = isColorValue(accent);
    return {
      borderRadius: `${radius.xl}px`,
      border: '1px solid',
      borderColor: 'divider',
      position: 'relative',
      overflow: 'hidden',
      ...(canWash && {
        '&::before': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(120% 100% at 0% 0%, ${accent}22, transparent 60%)`,
        },
      }),
      ...(interactive && {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        willChange: 'transform',
        transition: `transform ${motionTokens.fast}ms ${motionTokens.ease}, border-color ${motionTokens.fast}ms ${motionTokens.standard}`,
        '@media (hover: hover)': {
          '&:hover': { transform: 'translateY(-3px)', borderColor: canWash ? accent : 'primary.main' },
        },
        // Pointer-down, not release: the press is felt before the action runs.
        '&:active': { transform: 'scale(0.985)', transitionDuration: `${motionTokens.instant}ms` },
        '@media (prefers-reduced-motion: reduce)': {
          transition: `border-color ${motionTokens.fast}ms ${motionTokens.standard}`,
          '&:hover': { transform: 'none', borderColor: canWash ? accent : 'primary.main' },
          '&:active': { transform: 'none' },
        },
      }),
    };
  };

  const byVariant = {
    glass: (theme) => ({
      backdropFilter: 'blur(30px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
      backgroundColor: colorTokens.glass[theme.palette.mode],
      '@media (prefers-reduced-transparency: reduce)': {
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        backgroundColor: theme.palette.background.paper,
      },
    }),
    elevated: (theme) => ({
      backgroundColor: 'background.paper',
      boxShadow: shadow[theme.palette.mode].sm,
    }),
    outlined: () => ({ backgroundColor: 'transparent' }),
  };

  const variantSx = byVariant[variant] || byVariant.outlined;

  return (
    <Paper
      elevation={0}
      // Defaults only: a caller that already supplies role/tabIndex/onKeyDown
      // overrides them via the spread below.
      {...(clickable ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
          onKeyDown?.(e);
        },
      } : (onKeyDown ? { onKeyDown } : {}))}
      onClick={onClick}
      sx={[
        (theme) => ({ ...base(theme), ...variantSx(theme) }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Paper>
  );
}
