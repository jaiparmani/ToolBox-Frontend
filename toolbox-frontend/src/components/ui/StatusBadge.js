import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { state as stateTokens, accents, color as colorTokens, radius, motion as motionTokens } from '../../theme/tokens';

/**
 * Dark-tuned accent → its mode-tuned twin.
 *
 * Screens hand components raw values out of `accents` (e.g. `accents.red`),
 * which are tuned for the deep-ink surface. On the light canvas those same
 * values sit at the wrong contrast. Every entry's `dark` value is byte-identical
 * to the accent it replaces, so dark mode is untouched; only light resolves to
 * the token file's light-mode counterpart. No new hex is introduced here.
 */
const MODE_TWIN = {
  [accents.mint]: stateTokens.success,
  [accents.green]: stateTokens.success,   // === accents.emerald
  [accents.amber]: stateTokens.warning,
  [accents.red]: stateTokens.danger,
  [accents.cyan]: stateTokens.info,
  [accents.blue]: colorTokens.primary,
  [accents.violet]: colorTokens.accent,
  [accents.purple]: colorTokens.accent,
};

/**
 * Resolve a colour a caller passed us into the right value for the active mode.
 * Anything we don't recognise (an MUI palette path like `text.disabled`, a
 * chart series, a custom hex) is returned untouched — this only re-points the
 * shared accent set, it never invents a colour.
 */
export function resolveToneColor(tone, mode = 'dark') {
  if (typeof tone !== 'string') return tone;
  const twin = MODE_TWIN[tone] || MODE_TWIN[tone.toUpperCase()] || MODE_TWIN[tone.toLowerCase()];
  return twin ? (twin[mode] || tone) : tone;
}

/** True for values we can safely append an alpha suffix to / use in a gradient. */
export function isColorValue(tone) {
  return typeof tone === 'string' && /^(#|rgb|hsl)/i.test(tone.trim());
}

/**
 * Visually hidden, still announced. Several components in this kit show a
 * figure that is mid-animation (a counting total, a grown bar) and must hand
 * assistive tech the settled, exact number instead — the design brief's rule
 * that no figure may exist only inside motion. One definition, shared, rather
 * than four slightly different clip rects.
 */
export const srOnly = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)',
  whiteSpace: 'nowrap', border: 0,
};

/**
 * A status indicator — a coloured dot + label.
 *
 * The four kinds of feedback (Apple Design §16: status, completion, warning,
 * error) must not look alike, so weight escalates with severity rather than
 * only hue: ambient status is a hollow ring, completion a filled dot, a warning
 * lifts onto a tinted pill, and an error gets the pill plus a defined border.
 * Someone glancing sideways reads the severity from the shape before the colour
 * resolves — which also means the badge still works for colour-blind readers
 * and in high-contrast mode.
 *
 * `dotOnly` keeps the bare indicator; it carries an `aria-label` so the dot is
 * not silent to a screen reader.
 */
export default function StatusBadge({ status = 'info', label, dotOnly, live = false, sx, ...rest }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const TONE = {
    success: stateTokens.success[mode],
    warning: stateTokens.warning[mode],
    danger: stateTokens.danger[mode],
    info: stateTokens.info[mode],
  };
  const c = TONE[status] || TONE.info;

  // Shape carries severity; colour confirms it.
  const shell = {
    info: null,
    success: null,
    warning: { bg: `${c}1a`, border: 'transparent' },
    danger: { bg: `${c}22`, border: `${c}66` },
  }[status] || null;

  const hollow = status === 'info';

  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={0.75}
      // A bare dot has no text; without this it is invisible to assistive tech.
      {...(dotOnly ? { role: 'img', 'aria-label': label || `${status} status` } : {})}
      sx={{
        ...(shell && {
          px: 0.9, py: 0.3, borderRadius: `${radius.pill}px`,
          backgroundColor: shell.bg,
          border: '1px solid', borderColor: shell.border,
        }),
        ...sx,
      }}
      {...rest}
    >
      <Box
        aria-hidden
        sx={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          backgroundColor: hollow ? 'transparent' : c,
          border: hollow ? `2px solid ${c}` : 'none',
          boxShadow: hollow ? 'none' : `0 0 8px ${c}55`,
          ...(live && {
            animation: `statusBreathe ${motionTokens.slower * 3}ms ${motionTokens.standard} infinite`,
            '@keyframes statusBreathe': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.45 },
            },
            // A slow oscillation is exactly what reduced-motion asks us to drop.
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      />
      {!dotOnly && label && (
        <Typography
          variant="caption"
          // Small text wants a touch of positive tracking, not the negative
          // tracking a headline gets (Apple Design §15).
          sx={{ fontWeight: 600, color: c, letterSpacing: '0.01em', lineHeight: 1.3 }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Confidence badge for AI-derived values (an inferred category, a parsed
 * amount). Communicates certainty so the model's guess is never mistaken for a
 * fact — low confidence reads amber, not hidden. The wording carries the level
 * on its own, so nothing here depends on colour alone.
 */
export function ConfidenceBadge({ level = 'high', sx, ...rest }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const map = {
    high: { color: stateTokens.success[mode], label: 'High confidence' },
    medium: { color: stateTokens.warning[mode], label: 'Worth a check' },
    low: { color: stateTokens.danger[mode], label: 'Low confidence' },
  };
  const m = map[level] || map.medium;
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={0.5}
      title={m.label}
      sx={{ px: 0.9, py: 0.25, borderRadius: `${radius.pill}px`, backgroundColor: `${m.color}1f`, ...sx }}
      {...rest}
    >
      <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: m.color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: m.color, fontSize: '0.66rem', letterSpacing: '0.01em' }}>
        {m.label}
      </Typography>
    </Box>
  );
}
