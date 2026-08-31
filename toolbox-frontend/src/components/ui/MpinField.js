import React from 'react';
import { Box } from '@mui/material';
import BackspaceRoundedIcon from '@mui/icons-material/BackspaceRounded';
import { accents, type, motion as motionTokens } from '../../theme/tokens';

/**
 * A tactile, cinematic PIN entry — the hero of the unlock screen.
 *
 * Six slots fill and glow as digits land; the live slot breathes; a wrong PIN
 * shakes the row (Web Animations, so it replays every time) and burns red; a
 * correct one flares mint. A real, invisible input sits over the slots so the
 * physical keyboard and the mobile numeric keypad both just work (tap the slots
 * to summon it); an on-screen keypad is there for thumbs. Controlled: the parent
 * owns `value` and fires `onComplete` when the last digit lands. Reduced motion
 * keeps the states but drops the ambient movement.
 */
export default function MpinField({
  value = '', onChange, onComplete, length = 6,
  status = 'idle', disabled = false, autoFocus = true,
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

  // A wrong PIN shakes the row and refocuses for another try; WAAPI replays it
  // on every error, which a CSS class toggle can't do reliably.
  React.useEffect(() => {
    if (status !== 'error') return;
    if (!reduce && rowRef.current?.animate) {
      rowRef.current.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' },
         { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' },
         { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 420, easing: 'ease-in-out' },
      );
    }
    inputRef.current?.focus();
  }, [status, reduce]);

  const color = status === 'error' ? accents.red : status === 'success' ? accents.mint : accents.cyan;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  const press = (k) => {
    if (disabled) return;
    if (k === '⌫') { set(value.slice(0, -1)); inputRef.current?.focus(); return; }
    if (k === '') return;
    set(value + k);
    inputRef.current?.focus();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.75 }}>
      {/* Slot row (the real input is transparent, on top, so typing + mobile keypad work) */}
      <Box
        ref={rowRef}
        onClick={() => inputRef.current?.focus()}
        sx={{ position: 'relative', display: 'flex', gap: { xs: 1, sm: 1.35 }, cursor: 'text',
          '@keyframes slotBreathe': { '0%,100%': { boxShadow: `0 0 0 1px ${color}66, 0 0 18px -6px ${color}` }, '50%': { boxShadow: `0 0 0 1px ${color}, 0 0 26px -4px ${color}` } },
          '@keyframes slotPop': { '0%': { transform: 'scale(0.4)', opacity: 0 }, '70%': { transform: 'scale(1.18)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
        }}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && i === value.length && status !== 'success';
          return (
            <Box key={i} sx={{
              width: { xs: 42, sm: 50 }, height: { xs: 52, sm: 62 }, borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
              border: '1.5px solid',
              borderColor: filled || active ? `${color}` : 'divider',
              boxShadow: active && !reduce ? undefined : (filled ? `0 0 22px -8px ${color}, inset 0 1px 0 rgba(255,255,255,0.08)` : 'inset 0 1px 0 rgba(255,255,255,0.05)'),
              animation: active && !reduce ? 'slotBreathe 1.5s ease-in-out infinite' : 'none',
              transition: 'border-color 160ms ease, box-shadow 220ms ease',
            }}>
              {filled && (
                <Box aria-hidden sx={{
                  width: { xs: 13, sm: 15 }, height: { xs: 13, sm: 15 }, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 30%, #fff, ${color} 70%)`,
                  boxShadow: `0 0 14px ${color}`,
                  animation: reduce ? 'none' : 'slotPop 260ms cubic-bezier(0.2,0.8,0.2,1)',
                }} />
              )}
            </Box>
          );
        })}
        <Box
          component="input"
          ref={inputRef}
          value={value}
          onChange={(e) => set(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`${length}-digit MPIN`}
          maxLength={length}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, background: 'transparent',
            cursor: 'text', color: 'transparent', caretColor: 'transparent', fontSize: 16 /* keeps iOS from zooming */, textAlign: 'center', outline: 'none' }}
        />
      </Box>

      {/* On-screen keypad — for thumbs; keyboard still works in parallel */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 1.25 }, width: { xs: 216, sm: 246 } }}>
        {keys.map((k, i) => k === '' ? <Box key={i} /> : (
          <Box
            key={i}
            role="button"
            aria-label={k === '⌫' ? 'Delete' : k}
            onClick={() => press(k)}
            sx={{
              height: { xs: 58, sm: 62 }, borderRadius: '16px', userSelect: 'none', cursor: disabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: type.displayFamily, fontWeight: 600, fontSize: '1.35rem',
              color: k === '⌫' ? 'text.secondary' : 'text.primary',
              background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.03)',
              border: '1px solid', borderColor: 'divider',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              transition: `transform ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}, background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
              '@media (hover: hover)': { '&:hover': { background: `${accents.cyan}1c`, borderColor: `${accents.cyan}66`, boxShadow: `0 6px 18px -8px ${accents.cyan}88` } },
              '&:active': { transform: 'scale(0.92)', background: `${accents.cyan}2e`, boxShadow: `0 0 22px -6px ${accents.cyan}` },
            }}
          >
            {k === '⌫' ? <BackspaceRoundedIcon sx={{ fontSize: 22 }} /> : k}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
