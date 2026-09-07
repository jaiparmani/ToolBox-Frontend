import { motion as motionTokens, radius, shadow } from '../../theme/tokens';

/**
 * The one card material the dashboard is built from.
 *
 * Every Dash* card used to carry its own copy of `border 1px / 14px / paper`,
 * which meant the grid's depth could drift a card at a time. This is that
 * surface stated once (reuse, don't fork), with two additions from Apple
 * Design §12: a bright top edge, as if light were catching the lip of the
 * card, and a shadow soft enough to read as lift on the light ground while
 * staying invisible against the near-black one, where the hairline already
 * carries the separation. Radius comes from `radius.lg`, not a hand-typed 14.
 *
 * Deliberately a plain object, not a theme callback, so a card can spread it
 * and override padding or height without forking the material.
 */
export const dashCardSx = {
  position: 'relative',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: `${radius.lg}px`,
  bgcolor: 'background.paper',
  p: { xs: 2, sm: 2.25 },
  boxShadow: shadow.light.sm,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: `${radius.lg}px`,
    right: `${radius.lg}px`,
    top: 0,
    height: '1px',
    pointerEvents: 'none',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
  },
};

/** The same surface, for cards that are a target: it answers the pointer. */
export const dashCardInteractiveSx = {
  ...dashCardSx,
  cursor: 'pointer',
  transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.normal}ms ${motionTokens.ease}, transform ${motionTokens.fast}ms ${motionTokens.ease}`,
  '&:hover': {
    borderColor: 'text.disabled',
    boxShadow: shadow.light.md,
    transform: 'translateY(-1px)',
  },
  '&:active': { transform: 'translateY(0)' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
};

export default dashCardSx;
