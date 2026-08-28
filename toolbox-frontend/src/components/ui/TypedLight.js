import React from 'react';
import { Box } from '@mui/material';
import { accents } from '../../theme/tokens';

/**
 * "Typed light" — reveals the assistant's words as if they're arriving on a
 * beam, with a soft glowing caret trailing the last character. It's a reveal of
 * real, already-received text (never fabricated mid-stream): the full string is
 * present for selection and screen readers from the first frame; only its
 * *appearance* is paced. Reduced motion shows it whole at once.
 *
 * Calls onStart once when it begins pacing and onDone when it lands, so the
 * caller can drive the orb's "speaking" state.
 */
export default function TypedLight({ text = '', reduce = false, speed = 16, onStart, onDone, sx }) {
  const [n, setN] = React.useState(reduce ? text.length : 0);

  React.useEffect(() => {
    if (reduce || !text) { setN(text.length); onDone?.(); return undefined; }
    setN(0);
    onStart?.();
    let i = 0;
    const id = setInterval(() => {
      // Reveal a couple of chars per tick on long replies so it never drags.
      i += text.length > 160 ? 2 : 1;
      // Ping the orb so it visibly reacts to the words landing — a light-driven
      // pulse, throttled to every few chars so it reads as a beat, not a buzz.
      if (i % 3 === 0) window.dispatchEvent(new Event('toolbox:orb-tick'));
      if (i >= text.length) { i = text.length; setN(i); clearInterval(id); onDone?.(); }
      else setN(i);
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduce]);

  const done = n >= text.length;
  return (
    <Box component="span" sx={{ '@keyframes caretBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } }, ...sx }}>
      {/* Visible, paced text */}
      <Box component="span" aria-hidden={!done}>{text.slice(0, n)}</Box>
      {/* Full text for assistive tech / selection, hidden visually until paced in */}
      {!done && (
        <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>{text}</Box>
      )}
      {!done && (
        <Box component="span" sx={{ display: 'inline-block', width: '0.5em', height: '1em', ml: '1px', verticalAlign: '-0.15em',
          borderRadius: '2px', background: `linear-gradient(180deg, ${accents.cyan}, ${accents.violet})`,
          boxShadow: `0 0 8px ${accents.violet}aa`, animation: reduce ? 'none' : 'caretBlink 0.7s steps(1) infinite' }} />
      )}
    </Box>
  );
}
