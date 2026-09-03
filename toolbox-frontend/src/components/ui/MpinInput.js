import React from 'react';
import { Box } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import { accents, type, motion as motionTokens } from '../../theme/tokens';

/**
 * A compact, premium 6-digit MPIN entry for forms (registration, settings).
 *
 * Segmented boxes you can stack (enter + confirm) inside a normal form. On a
 * touch device the OS keyboard is suppressed (it covered the boxes and felt
 * jarring) and an in-app numeric keypad drives entry instead; on desktop the
 * physical keyboard just works via a transparent input. Controlled: the parent
 * owns `value`; `onComplete` fires when the last digit lands; `status` tints the
 * row (mint success, red error). Reduced motion drops the ambient breathing.
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
  // Coarse pointer = phone/tablet: suppress the OS keyboard and show our own pad.
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  const set = (next) => {
    if (disabled) return;
    const clean = String(next).replace(/\D/g, '').slice(0, length);
    onChange?.(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const press = (digit) => set(value + digit);
  const backspace = () => set(value.slice(0, -1));

  // A wrong PIN shakes the row and refocuses; WAAPI replays on every error.
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

  const color = status === 'error' ? accents.red : accents.mint;
  const showPad = coarse && focused && !disabled;

  return (
    <Box>
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
          // Coarse pointers: no OS keyboard (our pad drives it) + readOnly so it
          // can't summon one; desktop keeps the numeric keyboard for real typing.
          inputMode={coarse ? 'none' : 'numeric'}
          readOnly={coarse}
          autoComplete="off"
          aria-label={label}
          maxLength={length}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, background: 'transparent',
            cursor: disabled ? 'default' : 'text', color: 'transparent', caretColor: 'transparent',
            fontSize: 16 /* keeps iOS from zooming */, textAlign: 'center', outline: 'none' }}
        />
      </Box>

      {showPad && (
        <Box
          role="group" aria-label="MPIN keypad"
          // Keep the field focused when a pad key is tapped (mousedown would blur it).
          onMouseDown={(e) => e.preventDefault()}
          sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, maxWidth: 320 }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <KeypadKey key={d} label={d} onTap={() => press(d)} />
          ))}
          <Box aria-hidden />
          <KeypadKey label="0" onTap={() => press('0')} />
          <KeypadKey label={<BackspaceOutlinedIcon sx={{ fontSize: 20 }} />} ariaLabel="Delete" onTap={backspace} />
        </Box>
      )}
    </Box>
  );
}

function KeypadKey({ label, ariaLabel, onTap }) {
  return (
    <Box
      role="button" tabIndex={-1} aria-label={ariaLabel || String(label)}
      onClick={onTap}
      sx={{
        height: 48, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', cursor: 'pointer',
        fontFamily: type.displayFamily, fontWeight: 600, fontSize: '1.25rem', color: 'text.primary',
        border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        transition: 'background-color .12s ease, transform .08s ease',
        '&:hover': { bgcolor: 'action.hover' },
        '&:active': { transform: 'scale(0.96)', bgcolor: 'action.selected' },
      }}
    >
      {label}
    </Box>
  );
}
