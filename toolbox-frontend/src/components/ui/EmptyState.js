import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { motion as motionTokens, radius, type } from '../../theme/tokens';
import { resolveToneColor, isColorValue } from './StatusBadge';

/**
 * No-data / all-clear surface, treated as part of the experience rather than a
 * blank. Same shape for "nothing yet", "all caught up", and "no results".
 *
 * An empty state's job is to say what to do next, not that there is nothing
 * (Apple Design §16). The `actionLabel` was already the way out; what it was
 * missing:
 *
 * - **A said-out-loud announcement.** The surface swaps in after a fetch
 *   resolves, and nothing told a screen-reader user it had. It is now a polite
 *   `status` region, so "You're all caught up" is actually heard.
 * - **A medallion instead of a floating glyph.** When the caller passes a real
 *   colour (`tone={accents.mint}` for all-clear, red for a failure), the icon
 *   now sits in a soft tinted disc of that colour. All-clear and nothing-yet
 *   stop looking identical, and the tone is mode-resolved so an accent tuned
 *   for the dark canvas doesn't come along unchanged onto the light one.
 * - **Arrival, not appearance.** The block materialises with a short
 *   transform + opacity settle on the token easing rather than being simply
 *   present, and holds perfectly still under `prefers-reduced-motion`.
 * - **`hint` and `secondaryAction`** (both optional, both additive) for the
 *   quieter second sentence and the lesser way out — "or step back to a month
 *   with activity" is a different weight of suggestion than the primary button.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  actionLabel,
  onAction,
  secondaryAction,
  tone = 'text.disabled',
  dense,
  sx,
  ...rest
}) {
  const theme = useTheme();
  const resolved = resolveToneColor(tone, theme.palette.mode);
  // `tone` is usually a palette path ('text.disabled'); only a real colour can
  // be washed into a disc, so the neutral case degrades to the quiet chip.
  const tinted = isColorValue(resolved);
  const size = dense ? 40 : 52;

  return (
    <Box
      role="status"
      sx={{
        py: dense ? 4 : 7, px: 3, textAlign: 'center',
        animation: `emptyArrive ${motionTokens.normal}ms ${motionTokens.ease} both`,
        '@keyframes emptyArrive': {
          from: { opacity: 0, transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        ...sx,
      }}
      {...rest}
    >
      {Icon && (
        <Box
          aria-hidden
          sx={{
            width: size + 20, height: size + 20, mx: 'auto', mb: 1.75,
            borderRadius: `${radius.pill}px`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: tinted ? `${resolved}1a` : 'action.hover',
            border: '1px solid',
            borderColor: tinted ? `${resolved}33` : 'divider',
          }}
        >
          <Icon sx={{ fontSize: size * 0.62, color: tinted ? resolved : 'text.disabled' }} />
        </Box>
      )}

      <Typography
        component="p"
        sx={{
          fontFamily: type.displayFamily, fontWeight: 650,
          fontSize: dense ? '1.02rem' : '1.15rem',
          letterSpacing: '-0.015em', lineHeight: 1.25, m: 0,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          // Body copy takes no negative tracking and a looser leading than the
          // line above it — hierarchy from the set, not from size alone (§15).
          sx={{ mt: 0.75, maxWidth: 340, mx: 'auto', letterSpacing: 0, lineHeight: 1.55 }}
        >
          {description}
        </Typography>
      )}

      {hint && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mt: 0.75, maxWidth: 340, mx: 'auto', letterSpacing: '0.01em', lineHeight: 1.5 }}
        >
          {hint}
        </Typography>
      )}

      {(actionLabel || secondaryAction) && (
        <Box
          sx={{
            mt: 2.5, display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          {actionLabel && (
            <Button
              variant="contained"
              onClick={onAction}
              sx={{
                // Response on pointer-down, not on release (§1) — on a phone
                // there is no hover state to stand in for it.
                transition: `transform ${motionTokens.instant}ms ${motionTokens.ease}`,
                '&:active': { transform: 'scale(0.97)' },
                '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
              }}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </Box>
      )}
    </Box>
  );
}
