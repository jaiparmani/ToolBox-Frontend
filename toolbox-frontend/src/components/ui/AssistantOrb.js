import React from 'react';
import { Box } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { accents } from '../../theme/tokens';

/**
 * The assistant, as a presence rather than an icon.
 *
 * A small living orb that breathes at rest, spins up a bright halo while it's
 * thinking, and glows warm while it speaks. Pure transform/opacity CSS so it
 * stays cheap and GPU-friendly; reduced motion holds it as a still, lit orb.
 * Decorative — the state it conveys is always also written in text nearby, so
 * nothing meaningful lives only here.
 *
 * `state`: 'idle' | 'thinking' | 'speaking'.
 */
export default function AssistantOrb({ state = 'idle', size = 72, reduce = false }) {
  const thinking = state === 'thinking';
  const speaking = state === 'speaking';
  const anim = (on) => (reduce ? 'none' : on);

  return (
    <Box aria-hidden sx={{ position: 'relative', width: size, height: size, flexShrink: 0,
      '@keyframes orbSpin': { to: { transform: 'rotate(360deg)' } },
      '@keyframes orbSpinR': { to: { transform: 'rotate(-360deg)' } },
      '@keyframes orbBreathe': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
      '@keyframes orbPulse': { '0%,100%': { transform: 'scale(1)', filter: 'brightness(1)' }, '50%': { transform: 'scale(1.09)', filter: 'brightness(1.25)' } },
    }}>
      {/* Outer glow — swells while thinking/speaking */}
      <Box sx={{ position: 'absolute', inset: -size * 0.28, borderRadius: '50%',
        background: `radial-gradient(circle, ${accents.violet}${thinking ? '55' : speaking ? '44' : '2e'}, transparent 68%)`,
        transition: 'background 400ms ease', filter: 'blur(6px)',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }} />

      {/* Rotating halo arc — only while thinking */}
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
      <Box sx={{ position: 'absolute', inset: size * 0.14, borderRadius: '50%',
        background: `radial-gradient(circle at 34% 28%, #ffffff, ${accents.violet} 46%, ${accents.blue} 100%)`,
        boxShadow: `0 0 ${speaking ? 22 : thinking ? 26 : 14}px ${accents.violet}${thinking ? '99' : '66'}`,
        transition: 'box-shadow 400ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: anim(thinking ? 'orbPulse 1.1s ease-in-out infinite' : speaking ? 'orbBreathe 1.6s ease-in-out infinite' : 'orbBreathe 3.4s ease-in-out infinite') }}>
        <AutoAwesomeRoundedIcon sx={{ color: '#fff', fontSize: size * 0.34, opacity: 0.95 }} />
      </Box>
    </Box>
  );
}
