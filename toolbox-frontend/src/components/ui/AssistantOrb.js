import React from 'react';
import { Box } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { accents } from '../../theme/tokens';

/**
 * The assistant, as a living presence rather than an icon.
 *
 * A luminous orb that breathes at rest, with a few sparks orbiting it on their
 * own rings; while it's thinking the sparks quicken, a bright halo spins up, and
 * the whole thing pulses; while it speaks it glows warm. Pure transform/opacity
 * CSS so it stays cheap and GPU-friendly; reduced motion holds it as a still,
 * lit orb. Decorative — the state it conveys is always written in text nearby,
 * so nothing meaningful lives only here.
 *
 * `state`: 'idle' | 'thinking' | 'speaking'.
 */
export default function AssistantOrb({ state = 'idle', size = 72, reduce = false }) {
  const thinking = state === 'thinking';
  const speaking = state === 'speaking';
  const anim = (on) => (reduce ? 'none' : on);
  const rush = thinking ? 2.1 : speaking ? 1.4 : 1; // sparks quicken with activity

  // Sparks on their own orbits — diameter, duration, direction, colour, size.
  const orbits = [
    { d: size * 1.08, dur: 5.5, dir: 1, c: accents.cyan, dot: size * 0.055 },
    { d: size * 0.84, dur: 4.0, dir: -1, c: accents.violet, dot: size * 0.05 },
    { d: size * 1.28, dur: 7.5, dir: 1, c: accents.blue, dot: size * 0.045 },
  ];

  return (
    <Box aria-hidden sx={{ position: 'relative', width: size, height: size, flexShrink: 0,
      '@keyframes orbSpin': { to: { transform: 'rotate(360deg)' } },
      '@keyframes orbSpinR': { to: { transform: 'rotate(-360deg)' } },
      '@keyframes orbBreathe': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
      '@keyframes orbPulse': { '0%,100%': { transform: 'scale(1)', filter: 'brightness(1)' }, '50%': { transform: 'scale(1.09)', filter: 'brightness(1.3)' } },
      '@keyframes sparkOrbit': { to: { transform: 'rotate(360deg)' } },
      '@keyframes sparkOrbitR': { to: { transform: 'rotate(-360deg)' } },
    }}>
      {/* Outer glow — swells while thinking/speaking */}
      <Box sx={{ position: 'absolute', inset: -size * 0.3, borderRadius: '50%',
        background: `radial-gradient(circle, ${accents.violet}${thinking ? '5e' : speaking ? '4a' : '30'}, transparent 68%)`,
        transition: 'background 400ms ease', filter: 'blur(7px)',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }} />

      {/* Orbiting sparks */}
      {orbits.map((o, i) => (
        <Box key={i} sx={{
          position: 'absolute', top: '50%', left: '50%', width: o.d, height: o.d,
          mt: `${-o.d / 2}px`, ml: `${-o.d / 2}px`, borderRadius: '50%',
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
        opacity: thinking ? 1 : 0, transition: 'opacity 300ms ease',
        background: `conic-gradient(from 0deg, transparent 0%, ${accents.cyan} 18%, ${accents.violet} 34%, transparent 55%)`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
        animation: anim('orbSpin 1.05s linear infinite') }} />
      <Box sx={{ position: 'absolute', inset: 3, borderRadius: '50%',
        opacity: thinking ? 0.7 : 0, transition: 'opacity 300ms ease',
        background: `conic-gradient(from 180deg, transparent 0%, ${accents.blue} 22%, transparent 46%)`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
        animation: anim('orbSpinR 1.6s linear infinite') }} />

      {/* Core */}
      <Box sx={{ position: 'absolute', inset: size * 0.15, borderRadius: '50%',
        background: `radial-gradient(circle at 34% 28%, #ffffff, ${accents.violet} 46%, ${accents.blue} 100%)`,
        boxShadow: `0 0 ${speaking ? 24 : thinking ? 30 : 16}px ${accents.violet}${thinking ? 'aa' : '77'}, inset 0 1px 2px rgba(255,255,255,0.5)`,
        transition: 'box-shadow 400ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : speaking ? 'orbBreathe 1.6s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }}>
        <AutoAwesomeRoundedIcon sx={{ color: '#fff', fontSize: size * 0.32, opacity: 0.95 }} />
      </Box>
    </Box>
  );
}
