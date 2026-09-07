import React from 'react';
import { Box, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { accents, motion as motionTokens, radius } from '../../theme/tokens';
import AssistantOrb from './AssistantOrb';
import usePressSpring from './usePressSpring';

const SEEN_KEY = 'toolbox:assistant-introduced';

/**
 * The way in.
 *
 * The assistant used to be reachable by ⌘K and a small "Ask" pill in the header
 * — which is to say, invisible to anyone who didn't already know it existed, and
 * unreachable by keyboard (the pill was a `<div role="button">` with no tab
 * stop). Apple Design §16 asks every screen to answer "what can I do here"; this
 * is that answer, standing on every screen: a lit orb with a written label and
 * the shortcut printed on it, so the keyboard route is *taught* rather than
 * assumed.
 *
 * It is a real `<button>` — one tab stop, Enter/Space, a visible focus ring, and
 * an accessible name that changes when there's an unread reply. It responds on
 * pointer-DOWN (§1) through `usePressSpring`, so the press lands before the
 * click does. On a phone it collapses to the orb alone to stay out of the way of
 * the bottom bar; the accessible name stays full either way.
 *
 * Once — and only once, ever — a small note drifts up beside it to say what it's
 * for. It is decorative (`aria-hidden`): a screen reader already hears the same
 * words in the button's own label, so nothing is lost by skipping it.
 */
export default function AssistantLauncher({ state = 'idle', unseen = false, onOpen, buttonRef }) {
  const sysReduce = useReducedMotion();
  const reduce = !!sysReduce;
  const press = usePressSpring({ pressScale: 0.94 });

  const [hint, setHint] = React.useState(false);
  React.useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* private mode */ }
    if (seen) return undefined;
    const show = setTimeout(() => setHint(true), 1400);
    const hide = setTimeout(() => setHint(false), 11000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const dismissHint = React.useCallback(() => {
    setHint(false);
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
  }, []);

  const label = unseen
    ? 'Money OS assistant — you have an unread reply. Opens with Command K.'
    : 'Ask Money OS — add an expense, split a bill, search, or ask a question. Opens with Command K.';

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: (t) => t.zIndex.speedDial,
        left: 16,
        bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 24 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1,
        '@keyframes asstLaunchIn': {
          from: { opacity: 0, transform: 'translateY(12px) scale(0.9)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes asstHintIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes asstDotPop': {
          '0%': { transform: 'scale(0)' },
          '70%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      }}
    >
      {/* First-run note. Decorative — the same sentence is in the button's name. */}
      {hint && (
        <Box
          aria-hidden
          onClick={dismissHint}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            maxWidth: 260, px: 1.5, py: 0.9, cursor: 'pointer',
            borderRadius: `${radius.lg}px`,
            border: '1px solid', borderColor: `${accents.violet}44`,
            backgroundColor: 'background.paper',
            backdropFilter: 'blur(18px) saturate(1.4)',
            boxShadow: `0 12px 34px -14px ${accents.violet}aa`,
            animation: reduce ? 'none' : `asstHintIn ${motionTokens.slow}ms ${motionTokens.ease} both`,
            '@media (prefers-reduced-transparency: reduce)': { backdropFilter: 'none' },
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
            Ask me anything about your money — or press&nbsp;⌘K.
          </Typography>
          <CloseRoundedIcon sx={{ fontSize: 15, color: 'text.disabled', flexShrink: 0 }} />
        </Box>
      )}

      <Box
        component="button"
        type="button"
        ref={(node) => {
          press.ref.current = node;
          if (buttonRef) buttonRef.current = node;
        }}
        {...press.bindEvents}
        onClick={(e) => { dismissHint(); onOpen?.(e.currentTarget); }}
        aria-label={label}
        aria-haspopup="dialog"
        sx={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 1,
          font: 'inherit', color: 'text.primary', cursor: 'pointer',
          p: '5px', pr: { xs: '5px', sm: 1.5 },
          border: '1px solid', borderColor: `${accents.violet}3d`,
          borderRadius: `${radius.pill}px`,
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(20px) saturate(1.5)',
          boxShadow: `0 14px 38px -18px ${accents.violet}cc`,
          transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.normal}ms ${motionTokens.ease}`,
          animation: reduce ? 'none' : `asstLaunchIn ${motionTokens.normal}ms ${motionTokens.ease}`,
          '&:hover': { borderColor: accents.violet, boxShadow: `0 18px 44px -16px ${accents.violet}` },
          '&:focus-visible': { outline: `2px solid ${accents.violet}`, outlineOffset: 3 },
          // Frostier and flatter when the user asks for less translucency / more contrast.
          '@media (prefers-reduced-transparency: reduce)': { backdropFilter: 'none' },
          '@media (prefers-contrast: more)': { borderColor: 'text.primary', boxShadow: 'none' },
        }}
      >
        <AssistantOrb state={state} size={40} reduce={reduce} />

        {/* The label and the shortcut, written down. Hidden on phones for room,
            where the button's accessible name still carries both. */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.85, pr: 0.25 }}>
          <Typography component="span" sx={{ fontWeight: 620, fontSize: '0.86rem', letterSpacing: '-0.01em' }}>
            {unseen ? 'New reply' : 'Ask'}
          </Typography>
          <Box
            component="span"
            aria-hidden
            sx={{
              px: 0.6, py: 0.1, borderRadius: `${radius.sm - 2}px`,
              border: '1px solid', borderColor: 'divider',
              fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled',
            }}
          >
            ⌘K
          </Box>
        </Box>

        {unseen && state !== 'thinking' && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute', top: 2, left: 34,
              width: 12, height: 12, borderRadius: '50%',
              background: accents.mint,
              border: '2px solid', borderColor: 'background.paper',
              boxShadow: `0 0 10px ${accents.mint}`,
              animation: reduce ? 'none' : `asstDotPop ${motionTokens.normal}ms ${motionTokens.emphasis}`,
            }}
          />
        )}
      </Box>
    </Box>
  );
}
