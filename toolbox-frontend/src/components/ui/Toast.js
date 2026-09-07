import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, IconButton, Slide, Snackbar, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useReducedMotion } from 'framer-motion';
import { motion as motionTokens, radius, z } from '../../theme/tokens';
import { feedback } from './feedback';

const ToastContext = createContext(() => {});

/**
 * How long each kind of feedback is allowed to live.
 *
 * §16 counts status, completion, warning and error as four different kinds of
 * feedback, and this component used to give all of them the same 3.2 seconds.
 * A completion can leave on its own — you already know what you did. A failure
 * cannot: it was on screen before you finished reading it, which is the exact
 * complaint ErrorBanner was written to fix. Errors now wait to be dismissed,
 * warnings get twice as long, confirmations keep today's timing.
 */
const DURATION = { success: 3200, info: 3200, warning: 6000, error: null };

const CUE = { success: 'success', error: 'error', warning: 'error', info: 'open' };

function SlideUp(props) {
  return <Slide {...props} direction="up" />;
}

/**
 * Wrap the app once; call useToast() anywhere to fire a themed snackbar.
 *
 * `show(message, severity)` is unchanged. It also accepts an object —
 * `show({ message, severity, action, actionLabel, onAction, duration })` — for
 * the case a toast most needs to cover: an easy undo (§16, agency). A toast
 * that reports something you may not have meant to do, with no way back from
 * it, is the wrong half of the interaction.
 *
 * Toasts queue rather than clobber. Firing two in quick succession used to
 * replace the first mid-flight, so a message could appear and vanish inside a
 * frame; the second now waits for the first to finish leaving.
 */
export function ToastProvider({ children }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const [pack, setPack] = useState([]);
  const [toast, setToast] = useState(undefined);
  const [open, setOpen] = useState(false);

  const show = useCallback((arg, severityArg = 'success') => {
    const next = typeof arg === 'string' || arg == null
      ? { message: arg, severity: severityArg }
      : { severity: 'success', ...arg };

    // A toast always follows something the user just did, so the cue is caused
    // by a real commit rather than by the page loading (§13, causality).
    feedback(CUE[next.severity] || 'success');

    setPack((p) => [...p, { ...next, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);

  useEffect(() => {
    if (pack.length && !toast) {
      setToast(pack[0]);
      setPack((p) => p.slice(1));
      setOpen(true);
    } else if (pack.length && toast && open) {
      // Something new is waiting: start the current one leaving to make room.
      setOpen(false);
    }
  }, [pack, toast, open]);

  const dismiss = useCallback((_e, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  // The message is only released once it has finished its exit, so two toasts
  // never cross paths on screen and neither is cut off mid-flight.
  const onExited = useCallback(() => setToast(undefined), []);

  const severity = toast?.severity || 'success';
  // `null` is a meaningful value here (never auto-hide), so this has to be an
  // own-property test — `??` would quietly turn an error back into a 3.2s flash.
  const duration = toast && 'duration' in toast
    ? toast.duration
    : (severity in DURATION ? DURATION[severity] : 3200);

  // Supplying `action` suppresses MUI's own ✕, so the dismiss control is
  // rebuilt alongside the undo — an error toast never auto-hides and must
  // always have a way out.
  const action = toast?.action ?? (toast?.onAction ? (
    <>
      <Button
        size="small"
        color="inherit"
        onClick={() => { toast.onAction(); setOpen(false); }}
        sx={{ fontWeight: 700 }}
      >
        {toast.actionLabel || 'Undo'}
      </Button>
      <IconButton size="small" color="inherit" aria-label="Dismiss" onClick={() => setOpen(false)}>
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </>
  ) : undefined);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast ? toast.key : undefined}
        open={open}
        autoHideDuration={duration}
        onClose={dismiss}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // Enters from below and leaves the same way (§7); reduced motion gets
        // the plain cross-fade instead of a slide.
        TransitionComponent={reduce ? undefined : SlideUp}
        transitionDuration={reduce ? 0 : { enter: motionTokens.normal, exit: motionTokens.fast }}
        TransitionProps={{ onExited }}
        sx={{ zIndex: z.toast }}
      >
        {toast ? (
          <Alert
            onClose={dismiss}
            action={action}
            severity={severity}
            variant="filled"
            // A completion is polite; a failure interrupts. Same component,
            // two different levels of insistence.
            role={severity === 'error' || severity === 'warning' ? 'alert' : 'status'}
            sx={{
              borderRadius: `${radius.lg}px`,
              alignItems: 'center',
              boxShadow: theme.shadows[6],
              '& .MuiAlert-message': { letterSpacing: 0, lineHeight: 1.45 },
            }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
