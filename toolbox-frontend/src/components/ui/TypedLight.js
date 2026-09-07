import React from 'react';
import { Box } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { accents, motion as motionTokens } from '../../theme/tokens';

/**
 * "Typed light" — the assistant's words arriving on a beam.
 *
 * This reveals text that has *already* been received in full; nothing is
 * fabricated mid-stream. Only its appearance is paced.
 *
 * The previous version rendered the sentence twice — a sliced visible copy plus
 * a visually-hidden full copy for assistive tech — which meant a screen reader
 * or a text selection could pick up the same words twice, and the visible half
 * flipped `aria-hidden` under the reader mid-read. Now the sentence exists once:
 * every word is in the DOM from the first frame (so it is selectable and fully
 * readable immediately), and the reveal is nothing but `opacity`/`transform`
 * written straight to those nodes — no React re-render per word.
 *
 * Interruptible (Apple Design §3): flip `revealNow` and the whole answer lands
 * at once, from wherever the reveal had got to. Reduced motion starts there.
 *
 * Calls onStart when it begins pacing and onDone when it lands, so the caller
 * can drive the orb's "speaking" state.
 */
export default function TypedLight({ text = '', reduce: reduceProp, speed = 16, revealNow = false, onStart, onDone, sx }) {
  const sysReduce = useReducedMotion();
  const reduce = reduceProp ?? !!sysReduce;
  const hostRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const doneRef = React.useRef(false);

  // Split on whitespace but keep it, so the text reflows exactly as written.
  const parts = React.useMemo(() => (text ? text.split(/(\s+)/) : []), [text]);

  // Keep the callbacks fresh without restarting the reveal when the parent
  // re-renders (a new inline arrow on every render used to be a restart risk).
  const cbRef = React.useRef({ onStart, onDone });
  cbRef.current = { onStart, onDone };

  const finish = React.useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const host = hostRef.current;
    if (host) {
      host.querySelectorAll('[data-word]').forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
      host.querySelectorAll('[data-caret]').forEach((el) => el.removeAttribute('data-caret'));
    }
    if (!doneRef.current) { doneRef.current = true; cbRef.current.onDone?.(); }
  }, []);

  React.useEffect(() => {
    doneRef.current = false;
    const host = hostRef.current;
    if (!host) return undefined;
    const words = Array.from(host.querySelectorAll('[data-word]'));

    if (reduce || !text || words.length === 0) { finish(); return undefined; }

    cbRef.current.onStart?.();

    // Pace by the length of the real sentence, but never let a long answer drag:
    // the whole reveal lands inside ~2s however much came back.
    const total = Math.min(text.length * speed, 2000);
    const step = Math.max(24, Math.round(total / words.length));

    let i = 0;
    timerRef.current = setInterval(() => {
      const el = words[i];
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.setAttribute('data-caret', '');
        const prev = words[i - 1];
        if (prev) prev.removeAttribute('data-caret');
        // Ping the orb so it visibly reacts to the words landing — every other
        // word, so it reads as a beat rather than a buzz.
        if (i % 2 === 0) window.dispatchEvent(new Event('toolbox:orb-tick'));
      }
      i += 1;
      if (i >= words.length) finish();
    }, step);

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [text, reduce, speed, finish]);

  React.useEffect(() => { if (revealNow) finish(); }, [revealNow, finish]);

  const hidden = reduce ? {} : { opacity: 0, transform: 'translateY(2px)' };

  return (
    <Box
      component="span"
      ref={hostRef}
      sx={{
        '@keyframes caretBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
        // The caret trails the word that just landed, rather than sitting at the
        // end of a sentence that hasn't arrived yet.
        '& [data-caret]::after': {
          content: '""', display: 'inline-block', width: '0.42em', height: '0.95em',
          marginLeft: '2px', verticalAlign: '-0.12em', borderRadius: '2px',
          background: `linear-gradient(180deg, ${accents.cyan}, ${accents.violet})`,
          boxShadow: `0 0 8px ${accents.violet}aa`,
          animation: reduce ? 'none' : 'caretBlink 0.7s steps(1) infinite',
        },
        ...sx,
      }}
    >
      {parts.map((p, i) => (
        /\s/.test(p) || p === ''
          ? <React.Fragment key={i}>{p}</React.Fragment>
          : (
            <Box
              component="span"
              key={i}
              data-word=""
              style={hidden}
              sx={{
                display: 'inline-block',
                willChange: reduce ? undefined : 'transform, opacity',
                transition: reduce ? 'none' : `opacity ${motionTokens.normal}ms ${motionTokens.ease}, transform ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            >
              {p}
            </Box>
          )
      ))}
    </Box>
  );
}
