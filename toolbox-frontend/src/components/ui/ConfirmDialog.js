import React, { useCallback, useId } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grow, Typography, useTheme,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useReducedMotion } from 'framer-motion';
import { state as stateTokens, motion as motionTokens, radius, type } from '../../theme/tokens';
import { haptic } from './feedback';

/**
 * One confirmation dialog to replace scattered window.confirm() calls — themed,
 * with a destructive variant that colours the confirm button red.
 *
 * Two ideas drive the shape of it:
 *
 * **It should come from where it was called** (Apple Design §7). Pass the
 * triggering element as `anchorEl` (a node or a ref) and the panel scales out
 * of that control and collapses back into it on the way out — the same path in
 * both directions, so the button and the question are visibly the same object.
 * Without an anchor it behaves exactly as before, growing from its centre.
 *
 * **Destructive has to be unmistakable, because it is rare** (§16). Over-asking
 * trains people to click through, so when this dialog does appear for something
 * irreversible it says so with a warning medallion, a danger-toned heading, and
 * focus parked on Cancel rather than on the button that cannot be undone —
 * a stray Enter should not delete anything. Non-destructive confirmations keep
 * focus on the confirm button, where it is useful.
 *
 * While `loading`, backdrop and Escape are inert: the request is already in
 * flight and dismissing the dialog would only hide it.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  anchorEl,
  onConfirm,
  onCancel,
  ...rest
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const id = useId();
  const danger = stateTokens.danger[theme.palette.mode];

  /**
   * Point the panel's transform-origin at the control that opened it. Set on
   * the node itself so it persists through the exit transition — enter and
   * exit then run along one path rather than two.
   */
  const anchorOrigin = useCallback((node) => {
    const el = anchorEl && (anchorEl.current ?? anchorEl);
    if (!node || !el || typeof el.getBoundingClientRect !== 'function') return;
    const a = el.getBoundingClientRect();
    const p = node.getBoundingClientRect();
    if (!p.width || !p.height) return;
    const clamp = (v, max) => Math.max(0, Math.min(v, max));
    node.style.transformOrigin =
      `${clamp(a.left + a.width / 2 - p.left, p.width)}px ${clamp(a.top + a.height / 2 - p.top, p.height)}px`;
  }, [anchorEl]);

  const handleConfirm = () => {
    // A commit, and an irreversible one — the single place in this component
    // where a haptic earns its keep (§13, utility).
    if (destructive) haptic('warn');
    onConfirm?.();
  };

  return (
    <Dialog
      open={!!open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={reduce ? 0 : { enter: motionTokens.normal, exit: motionTokens.fast }}
      TransitionProps={{ onEnter: anchorOrigin }}
      aria-labelledby={`confirm-title-${id}`}
      aria-describedby={message ? `confirm-message-${id}` : undefined}
      PaperProps={{ sx: { borderRadius: `${radius.xl}px` } }}
      {...rest}
    >
      <DialogTitle
        id={`confirm-title-${id}`}
        sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
          fontFamily: type.displayFamily, fontWeight: 650,
          fontSize: '1.15rem', letterSpacing: '-0.015em', lineHeight: 1.3,
          pb: message || detail ? 1 : 2,
        }}
      >
        {destructive && (
          <Box
            aria-hidden
            sx={{
              width: 32, height: 32, flexShrink: 0, mt: '-2px',
              borderRadius: `${radius.pill}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${danger}1f`,
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 18, color: danger }} />
          </Box>
        )}
        <Box component="span" sx={{ minWidth: 0, color: destructive ? danger : 'text.primary' }}>
          {title}
        </Box>
      </DialogTitle>

      {(message || detail) && (
        <DialogContent sx={{ pt: 0 }}>
          {message && (
            <Typography
              id={`confirm-message-${id}`}
              variant="body2"
              color="text.secondary"
              sx={{ letterSpacing: 0, lineHeight: 1.55 }}
            >
              {message}
            </Typography>
          )}
          {detail}
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 2, gap: 0.5 }}>
        <Button
          onClick={onCancel}
          color="inherit"
          disabled={loading}
          // Destructive: the safe option is the one under the cursor and the
          // keyboard, so a reflexive Enter cancels rather than commits.
          autoFocus={!!destructive}
          sx={{ fontWeight: 600 }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={loading}
          autoFocus={!destructive}
          sx={{
            fontWeight: 650,
            transition: `transform ${motionTokens.instant}ms ${motionTokens.ease}`,
            '&:active': { transform: 'scale(0.97)' },
            '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
          }}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
