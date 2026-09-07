import React from 'react';
import { Alert, AlertTitle, Box, Button, Collapse, IconButton, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useReducedMotion } from 'framer-motion';
import { state as stateTokens, motion as motionTokens, radius } from '../../theme/tokens';

/**
 * Errors that stay put.
 *
 * These used to be snackbars that vanished after four seconds — long enough to
 * see something went wrong, too short to read why, and gone before you could
 * act on a message like which quota ran out and when it resets. Failures stay
 * until dismissed; only confirmations are allowed to disappear on their own.
 *
 * What it gained:
 *
 * - **A warning that isn't an error.** §16 counts warning and error as two
 *   different kinds of feedback; this component could only speak in one of
 *   them, so every caller with a "heads up" had to dress it as a failure.
 *   `severity` now accepts `warning` and `info`, each with its own default
 *   heading, tint and left edge. `error` is unchanged and remains the default,
 *   so no existing caller moves.
 * - **A way forward.** A failure that only offers "dismiss" is a dead end;
 *   `onRetry` puts the action that failed back within reach (§16, agency).
 * - **Weight in the left edge.** A 3px bar in the state colour makes the
 *   severity legible from the corner of the eye, before the words or the icon
 *   are read — and it survives high-contrast mode, where tinted backgrounds
 *   flatten out.
 */
const COPY = {
  error: "That didn't work",
  warning: 'Heads up',
  info: 'For your information',
};

export default function ErrorBanner({
  error,
  onClose,
  severity = 'error',
  title,
  onRetry,
  retryLabel = 'Try again',
  sx,
  ...rest
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const mode = theme.palette.mode;
  const key = severity === 'warning' ? 'warning' : severity === 'info' ? 'info' : 'danger';
  const edge = stateTokens[key][mode];

  return (
    <Collapse in={!!error} unmountOnExit timeout={reduce ? 0 : motionTokens.normal}>
      <Alert
        severity={severity}
        variant="outlined"
        onClose={onClose}
        action={
          // Supplying `action` suppresses MUI's own ✕, so it is only used when
          // there is a retry to place beside it — and the ✕ is rebuilt here so
          // the familiar dismiss affordance is never lost.
          onRetry ? (
            <Box display="flex" alignItems="center" gap={0.25}>
              <Button size="small" color="inherit" onClick={onRetry} sx={{ fontWeight: 600, flexShrink: 0 }}>
                {retryLabel}
              </Button>
              {onClose && (
                <IconButton size="small" color="inherit" aria-label="Dismiss" onClick={onClose}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ) : undefined
        }
        sx={{
          mb: 2,
          borderRadius: `${radius.lg}px`,
          alignItems: 'flex-start',
          borderColor: `${edge}55`,
          borderLeft: `3px solid ${edge}`,
          backgroundColor: `${edge}12`,
          '& .MuiAlert-message': { minWidth: 0, letterSpacing: 0, lineHeight: 1.5 },
          '@media (prefers-contrast: more)': {
            backgroundColor: 'background.paper',
            borderColor: edge,
          },
          ...sx,
        }}
        {...rest}
      >
        <AlertTitle sx={{ fontWeight: 650, mb: 0.25, letterSpacing: '-0.005em' }}>
          {title || COPY[severity] || COPY.error}
        </AlertTitle>
        {error}
      </Alert>
    </Collapse>
  );
}
