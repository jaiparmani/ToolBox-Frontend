import React from 'react';
import { Box } from '@mui/material';
import { accents, type, motion as motionTokens } from '../../theme/tokens';

/**
 * A compact, premium 6-digit MPIN entry for forms (registration, settings).
 *
 * Unlike MpinField — the cinematic unlock hero with its own on-screen keypad —
 * this is a quiet, inline control: segmented boxes you can stack (enter +
 * confirm) inside a normal form. A single transparent input sits over the slots
 * so the physical keyboard and the mobile numeric keypad both just work, and the
 * digits are shown in the display face so choosing a PIN feels deliberate.
 *
 * Controlled: the parent owns `value`; `onComplete` fires when the last digit
 * lands. `status` tints the row (mint on success, red on error). Reduced motion
 * keeps the states and drops the ambient breathing.
 */
export default function MpinInput({
  value = '', onChange, onComplete, length = 6,
  status = 'idle', disabled = false, autoFocus = false,
  label = '6-digit MPIN', id,
}) {
  const inputRef = React.useRef(null);
  const rowRef = React.useRef(null);
  const [focused, setFocused] = React.useState(false);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const set = (next) => {
    const clean = String(next).replace(/\D/g, '').slice(0, length);
    onChange?.(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  // A wrong PIN shakes the row and refocuses; WAAPI replays on every error,
  // which a CSS class toggle can't do reliably.
  React.useEffect(() => {
    if (status !== 'error') return;
    if (!reduce && rowRef.current?.animate) {
      rowRef.current.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
         { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
         { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
        { duration: 400, easing: 'ease-in-out' },
      );
    }
  }, [status, reduce]);

  const color = status === 'error' ? accents.red : status === 'success' ? accents.mint : accents.mint;

  return (
    <Box
      ref={rowRef}
      onClick={() => inputRef.current?.focus()}
      sx={{ position: 'relative', display: 'flex', gap: { xs: 1, sm: 1.25 }, cursor: disabled ? 'default' : 'text',
        '@keyframes mpinSlotBreathe': {
          '0%,100%': { boxShadow: `0 0 0 1px ${color}55` },
          '50%': { boxShadow: `0 0 0 1px ${color}` },
        },
      }}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const active = focused && i === value.length && status !== 'success';
        return (
          <Box key={i} aria-hidden sx={{
            flex: 1, minWidth: 40, height: 52, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: type.displayFamily, fontWeight: 600, fontSize: '1.5rem',
            color: 'text.primary',
            background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
            border: '1.5px solid',
            borderColor: filled || active ? color : 'divider',
            animation: active && !reduce ? 'mpinSlotBreathe 1.5s ease-in-out infinite' : 'none',
            transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.normal}ms ${motionTokens.ease}`,
          }}>
            {filled ? value[i] : ''}
          </Box>
        );
      })}
      <Box
        component="input"
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        maxLength={length}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, background: 'transparent',
          cursor: disabled ? 'default' : 'text', color: 'transparent', caretColor: 'transparent',
          fontSize: 16 /* keeps iOS from zooming */, textAlign: 'center', outline: 'none' }}
      />
    </Box>
  );
}
