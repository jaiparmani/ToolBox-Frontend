import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { accents, motion as motionTokens, radius, space } from '../../theme/tokens';
import AssistantOrb from './AssistantOrb';
import usePressSpring from './usePressSpring';
import useDraggable from './useDraggable';

const SEEN_KEY = 'toolbox:assistant-introduced';
const POS_KEY = 'toolbox:assistant-launcher-pos';

// The mobile tab bar the launcher has always floated above. A layout fact about
// the app shell, not a tunable — the launcher just has to stay off it.
const BOTTOM_BAR = 80;

// Visually hidden, but not hidden from assistive tech.
const srOnly = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px',
};

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
 *
 * ── It moves ───────────────────────────────────────────────────────────────
 * A control that stands on *every* screen will eventually stand on top of the
 * one number you are trying to read. §16.5 (Flexibility) says the answer to
 * "no single layout fits everyone" is to let people rearrange it, so you can
 * pick this up and put it somewhere else, and it stays there — across pages,
 * across reloads, across a rotation.
 *
 * `useDraggable` carries the physics (1:1 tracking from the grab point, a 10px
 * threshold, rubber-banded walls, momentum-projected edge snapping, a critically
 * damped settle). What this file owns is how the drag and the *tap* share one
 * button without either spoiling the other:
 *
 *  - Two transforms, two nodes. The wrapper takes the translate; the button
 *    keeps the press scale it already had. They never write to the same node,
 *    so neither has to know the other exists.
 *  - The moment a press becomes a drag, the press is handed back (`onDragCommit`
 *    releases it) and the wrapper lifts instead — the object comes up off the
 *    surface into your hand rather than staying pushed into it.
 *  - A committed drag swallows the click it would otherwise produce, so moving
 *    the launcher never opens the assistant (§10). A tap — anything under 10px
 *    — is untouched and still opens it.
 *  - The first-run note is positioned against whichever edge the launcher is
 *    resting on and flips below it near the top of the screen, so it can't be
 *    pushed off-screen by where the user parked things.
 */
export default function AssistantLauncher({ state = 'idle', unseen = false, onOpen, buttonRef }) {
  const sysReduce = useReducedMotion();
  const reduce = !!sysReduce;
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const press = usePressSpring({ pressScale: 0.94 });
  const descId = React.useId();

  const [hint, setHint] = React.useState(false);

  const drag = useDraggable({
    storageKey: POS_KEY,
    margin: space[4],
    // Below md the app shell's tab bar owns the bottom strip; above it there is
    // only the window edge. The home indicator is measured separately, from
    // env(safe-area-inset-bottom), inside the hook.
    reserveBottom: wide ? space[2] : BOTTOM_BAR,
    reduce,
    label: 'Assistant launcher',
    // The tap is off; give the button its scale back before the wrapper lifts.
    onDragCommit: () => {
      press.bindEvents.onPointerUp();
      setHint(false);
    },
  });

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

  const onPointerDown = (e) => { press.bindEvents.onPointerDown(e); drag.handlers.onPointerDown(e); };
  const onPointerUp = (e) => { press.bindEvents.onPointerUp(e); drag.handlers.onPointerUp(e); };
  const onPointerCancel = (e) => { press.bindEvents.onPointerCancel(e); drag.handlers.onPointerCancel(e); };

  return (
    <Box
      ref={drag.nodeRef}
      sx={{
        position: 'fixed',
        zIndex: (t) => t.zIndex.speedDial,
        // Placement is entirely `transform` — no per-frame layout property, and
        // one composited layer that a drag can move for free.
        left: 0,
        top: 0,
        willChange: 'transform',
        display: 'flex',
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
      {/* Keyboard moves are a real change of position; say so, once, politely. */}
      <Box role="status" aria-live="polite" aria-atomic="true" sx={srOnly}>
        {drag.announcement}
      </Box>

      {/* First-run note. Decorative — the same sentence is in the button's name.
          Taken out of flow so the wrapper's box is exactly the button's box,
          which is what the drag clamps against. */}
      {hint && (
        <Box
          aria-hidden
          onClick={dismissHint}
          sx={{
            position: 'absolute',
            ...(drag.edge === 'left' ? { left: 0 } : { right: 0 }),
            ...(drag.atTop
              ? { top: `calc(100% + ${space[2]}px)` }
              : { bottom: `calc(100% + ${space[2]}px)` }),
            display: 'flex', alignItems: 'center', gap: 0.75,
            width: 'max-content', maxWidth: `min(260px, calc(100vw - ${space[8]}px))`,
            px: 1.5, py: 0.9, cursor: 'pointer',
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
            Ask me anything about your money — or press&nbsp;⌘K. Drag it out of the way.
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
        onPointerDown={onPointerDown}
        onPointerMove={drag.handlers.onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={press.bindEvents.onPointerLeave}
        onKeyDown={drag.handlers.onKeyDown}
        onClick={(e) => {
          // §10 — the tail of a drag is not a tap.
          if (drag.consumeDragClick()) return;
          dismissHint();
          onOpen?.(e.currentTarget);
        }}
        aria-label={label}
        aria-describedby={descId}
        aria-haspopup="dialog"
        sx={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 1,
          font: 'inherit', color: 'text.primary',
          cursor: drag.dragging ? 'grabbing' : 'pointer',
          // Without this the page scrolls out from under a drag on a phone.
          touchAction: 'none',
          p: '5px', pr: { xs: '5px', sm: 1.5 },
          border: '1px solid', borderColor: drag.dragging ? accents.violet : `${accents.violet}3d`,
          borderRadius: `${radius.pill}px`,
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(20px) saturate(1.5)',
          // Depth answers the lift: held, it casts further. One transition on a
          // state change, not a per-frame animation.
          boxShadow: drag.dragging
            ? `0 26px 60px -18px ${accents.violet}, 0 0 0 1px ${accents.violet}55`
            : `0 14px 38px -18px ${accents.violet}cc`,
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

        {/* The move affordance, for people who will never see the cursor change.
            Pointer dragging must not be the only way to reposition it. */}
        <Box component="span" id={descId} sx={srOnly}>
          Drag to move it. Or with it focused, press the left or right arrow key to park it
          against that edge, and the up or down arrow key to move it a step; hold Shift for
          a larger step.
        </Box>
      </Box>
    </Box>
  );
}
