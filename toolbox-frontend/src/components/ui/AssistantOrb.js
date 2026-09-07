import React from 'react';
import { Box } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { accents, motion as motionTokens } from '../../theme/tokens';

/**
 * The assistant, as a living presence rather than an icon.
 *
 * A luminous orb that breathes at rest; while it's thinking the sparks quicken,
 * a halo spins up and the glow swells; while it speaks it answers each landing
 * word with a ripple of light.
 *
 * Three things it is careful about:
 *
 * 1. **Meaning is never only in the motion.** By default the orb is decorative
 *    (`aria-hidden`) and the state it conveys is written in text beside it. Pass
 *    `label` where it stands alone and it becomes a `role="img"` with that text
 *    alternative, so a screen reader gets the same information.
 * 2. **Transform and opacity only.** The old pulse animated `filter:
 *    brightness()` every frame, which paints; the brightness now lives in a
 *    separate layer whose *opacity* animates, so the whole thing stays on the
 *    compositor.
 * 3. **It stops when nobody's looking.** A hidden tab or an off-screen orb pauses
 *    every loop (`visibilitychange` + `IntersectionObserver`), and reduced motion
 *    holds it as a single still, lit frame — subscribed live, not read once.
 *
 * `state`: 'idle' | 'thinking' | 'speaking'.
 */
export default function AssistantOrb({ state = 'idle', size = 72, reduce: reduceProp, label }) {
  const sysReduce = useReducedMotion();
  const reduce = reduceProp ?? !!sysReduce;
  const thinking = state === 'thinking';
  const speaking = state === 'speaking';
  const anim = (on) => (reduce ? 'none' : on);
  const rush = thinking ? 2.1 : speaking ? 1.4 : 1; // sparks quicken with activity

  const rootRef = React.useRef(null);

  // Sound-reactive pulse: TypedLight pings 'toolbox:orb-tick' as each word lands,
  // and the orb answers with a quick ripple of light — driven straight to the
  // DOM (no React re-render per word) so it stays cheap even mid-stream.
  const pulseRef = React.useRef(null);
  React.useEffect(() => {
    if (reduce) return undefined;
    const onTick = () => {
      const el = pulseRef.current;
      if (!el || document.hidden) return;
      el.style.transition = 'none';
      el.style.opacity = '0.85';
      el.style.transform = 'scale(0.9)';
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${motionTokens.slower}ms ${motionTokens.ease}, transform ${motionTokens.slower}ms ${motionTokens.ease}`;
        el.style.opacity = '0';
        el.style.transform = 'scale(1.5)';
      });
    };
    window.addEventListener('toolbox:orb-tick', onTick);
    return () => window.removeEventListener('toolbox:orb-tick', onTick);
  }, [reduce]);

  // Don't spend frames on an orb nobody can see.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || reduce) return undefined;
    let onScreen = true;
    const apply = () => { el.dataset.paused = (!onScreen || document.hidden) ? 'true' : 'false'; };
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; apply(); }, { threshold: 0 })
      : null;
    io?.observe(el);
    document.addEventListener('visibilitychange', apply);
    apply();
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', apply); };
  }, [reduce]);

  // Sparks on their own orbits — diameter, duration, direction, colour, size.
  const orbits = [
    { d: size * 1.08, dur: 5.5, dir: 1, c: accents.cyan, dot: size * 0.055 },
    { d: size * 0.84, dur: 4.0, dir: -1, c: accents.violet, dot: size * 0.05 },
    { d: size * 1.28, dur: 7.5, dir: 1, c: accents.blue, dot: size * 0.045 },
  ];

  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true };

  return (
    <Box
      ref={rootRef}
      {...a11y}
      sx={{
        position: 'relative', width: size, height: size, flexShrink: 0,
        '&[data-paused="true"] *': { animationPlayState: 'paused' },
        '@keyframes orbSpin': { to: { transform: 'rotate(360deg)' } },
        '@keyframes orbSpinR': { to: { transform: 'rotate(-360deg)' } },
        '@keyframes orbBreathe': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
        '@keyframes orbPulse': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.09)' } },
        '@keyframes orbGlow': { '0%,100%': { opacity: 0.25 }, '50%': { opacity: 0.8 } },
        '@keyframes sparkOrbit': { to: { transform: 'rotate(360deg)' } },
        '@keyframes sparkOrbitR': { to: { transform: 'rotate(-360deg)' } },
      }}
    >
      {/* Outer glow — swells while thinking/speaking */}
      <Box sx={{ position: 'absolute', inset: -size * 0.3, borderRadius: '50%',
        background: `radial-gradient(circle, ${accents.violet}${thinking ? '5e' : speaking ? '4a' : '30'}, transparent 68%)`,
        transition: `background ${motionTokens.slow}ms ${motionTokens.ease}`, filter: 'blur(7px)',
        willChange: reduce ? undefined : 'transform',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }} />

      {/* Reactive pulse ring — flashes outward on each typed-light tick */}
      <Box ref={pulseRef} aria-hidden sx={{ position: 'absolute', inset: -size * 0.12, borderRadius: '50%',
        opacity: 0, pointerEvents: 'none', willChange: 'transform, opacity',
        border: '1.5px solid', borderColor: accents.cyan,
        boxShadow: `0 0 ${size * 0.18}px ${accents.cyan}88` }} />

      {/* Orbiting sparks */}
      {orbits.map((o, i) => (
        <Box key={i} sx={{
          position: 'absolute', top: '50%', left: '50%', width: o.d, height: o.d,
          mt: `${-o.d / 2}px`, ml: `${-o.d / 2}px`, borderRadius: '50%',
          willChange: reduce ? undefined : 'transform',
          animation: anim(`${o.dir > 0 ? 'sparkOrbit' : 'sparkOrbitR'} ${o.dur / rush}s linear infinite`),
        }}>
          <Box sx={{
            position: 'absolute', top: -o.dot / 2, left: '50%', ml: `${-o.dot / 2}px`,
            width: o.dot, height: o.dot, borderRadius: '50%', background: o.c,
            boxShadow: `0 0 ${o.dot * 2.4}px ${o.c}`,
            opacity: reduce ? 0.9 : 1,
          }} />
        </Box>
      ))}

      {/* Rotating halo arcs — only while thinking */}
      <Box sx={{ position: 'absolute', inset: -3, borderRadius: '50%',
        opacity: thinking ? 1 : 0, transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
        background: `conic-gradient(from 0deg, transparent 0%, ${accents.cyan} 18%, ${accents.violet} 34%, transparent 55%)`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
        animation: anim('orbSpin 1.05s linear infinite') }} />
      <Box sx={{ position: 'absolute', inset: 3, borderRadius: '50%',
        opacity: thinking ? 0.7 : 0, transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
        background: `conic-gradient(from 180deg, transparent 0%, ${accents.blue} 22%, transparent 46%)`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
        animation: anim('orbSpinR 1.6s linear infinite') }} />

      {/* Core */}
      <Box sx={{ position: 'absolute', inset: size * 0.15, borderRadius: '50%',
        background: `radial-gradient(circle at 34% 28%, #ffffff, ${accents.violet} 46%, ${accents.blue} 100%)`,
        boxShadow: `0 0 ${speaking ? 24 : thinking ? 30 : 16}px ${accents.violet}${thinking ? 'aa' : '77'}, inset 0 1px 2px rgba(255,255,255,0.5)`,
        transition: `box-shadow ${motionTokens.slow}ms ${motionTokens.ease}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        willChange: reduce ? undefined : 'transform',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : speaking ? 'orbBreathe 1.6s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }}>
        {/* The old pulse brightened the core with an animated `filter`, which
            repaints; this layer carries the same swell as pure opacity. */}
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle at 42% 34%, #ffffff, transparent 72%)`,
          opacity: thinking ? 0.45 : speaking ? 0.3 : 0.18,
          willChange: reduce ? undefined : 'opacity',
          animation: anim(thinking ? 'orbGlow 1.1s ease-in-out infinite' : 'none') }} />
        <AutoAwesomeRoundedIcon sx={{ color: '#fff', fontSize: size * 0.32, opacity: 0.95, position: 'relative' }} />
      </Box>
    </Box>
  );
}
