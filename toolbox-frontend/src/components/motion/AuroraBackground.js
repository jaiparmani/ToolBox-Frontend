import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import { accents, motion as motionTokens } from '../../theme/tokens';
import { useMoney } from '../../contexts/MoneyContext';
import { deriveWeather } from '../ui/FinancialWeather';

/**
 * A living backdrop that reflects your financial weather.
 *
 * A few big, soft colour fields drift and breathe behind the content, so the
 * screen never feels like a flat form. The palette and pace are keyed to the
 * derived Financial Weather: calm mint/blue on clear days, warm amber under
 * pressure, a faster, redder field when a storm is approaching — the same
 * honest signal the weather pill shows, felt rather than read.
 *
 * Heavily blurred and low opacity, so content stays readable — atmosphere, not
 * decoration that competes. Honours reduced-motion by holding still. Reads the
 * shared money context itself, so it needs no wiring; pass `weatherKey` to
 * override (e.g. for a preview), or it falls back to calm 'clear'.
 */

// Orb colours per weather condition, built from the accent roles rather than
// hand-mixed rgba - cool/positive through to warm/urgent. `a` is the per-orb
// alpha in dark mode; light mode runs at 70% of it so the field stays behind
// the type on a bright surface. `speed`/`amp` are how much the weather agitates
// the field, keyed to the same condition the weather pill states.
const PALETTES = {
  clear: {
    orbs: [[accents.blue, 0.20], [accents.mint, 0.18], [accents.green, 0.13], [accents.cyan, 0.12]],
    speed: 1, amp: 1,
  },
  tailwind: {
    orbs: [[accents.cyan, 0.22], [accents.blue, 0.20], [accents.violet, 0.16], [accents.mint, 0.14]],
    speed: 1.15, amp: 1.1,
  },
  pressure: {
    orbs: [[accents.amber, 0.20], [accents.blue, 0.17], [accents.violet, 0.15], [accents.amber, 0.12]],
    speed: 1.3, amp: 1.2,
  },
  storm: {
    orbs: [[accents.red, 0.22], [accents.violet, 0.20], [accents.amber, 0.15], [accents.red, 0.14]],
    speed: 1.6, amp: 1.35,
  },
};

// Orbit anchors: four fields spread across the viewport so the composition
// never reads as one blob drifting.
const ANCHORS = [
  { top: '-10%', left: '-5%' },
  { top: '40%', left: '55%' },
  { top: '20%', left: '30%' },
  { top: '55%', left: '-10%' },
];

export default function AuroraBackground({ weatherKey }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();
  const { projection, pulse } = useMoney();

  // Zero-wiring: derive the same condition the weather pill shows. An explicit
  // key wins (previews); anything unknown falls back to calm.
  const key = weatherKey || deriveWeather({ projection, pulse }).key || 'clear';
  const p = PALETTES[key] || PALETTES.clear;
  const orbs = p.orbs.map(([hex, a]) => alpha(hex, dark ? a : a * 0.7));

  const drift = (amp) => ({
    // Each orb wanders on its own slow, offset loop, so the field never repeats
    // in an obvious way. Amplitude widens as the weather turns.
    //
    // Position and opacity only - no `scale`. Scaling a 58vmax blurred layer
    // forces the compositor to re-rasterise it every frame, which is the single
    // most expensive thing a full-screen backdrop can do; breathing the opacity
    // reads the same and costs nothing.
    x: [`${-8 * amp}%`, `${10 * amp}%`, `${-4 * amp}%`, `${-8 * amp}%`],
    y: ['0%', `${-12 * amp}%`, `${8 * amp}%`, '0%'],
    opacity: [0.85, 1, 0.8, 0.85],
  });

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: 'background.default',
      }}
    >
      {orbs.map((colour, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={reduce ? { opacity: 1 } : drift(p.amp)}
          // ~26-47s per cycle (0.02-0.04Hz): far below the ~0.2Hz band that makes
          // a looping background uncomfortable, and slow enough to read as
          // weather rather than animation.
          transition={{ duration: (26 + i * 7) / p.speed, repeat: Infinity, ease: 'easeInOut', delay: i * -6 }}
          style={{
            position: 'absolute',
            width: '58vmax', height: '58vmax', borderRadius: '50%',
            ...ANCHORS[i % ANCHORS.length],
            background: `radial-gradient(circle at center, ${colour}, transparent 68%)`,
            filter: 'blur(46px)',
            // Glide between palettes when the weather shifts, instead of snapping
            // - an abrupt brightness change is exactly what to avoid here.
            transition: `background ${motionTokens.slower * 2.5}ms ${motionTokens.ease}`,
          }}
        />
      ))}
    </Box>
  );
}
