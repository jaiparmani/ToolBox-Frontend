import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
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

// Orb colours per weather condition. Cool/positive → warm/urgent.
const PALETTES = {
  clear: {
    dark: ['rgba(10,132,255,0.20)', 'rgba(48,214,165,0.18)', 'rgba(48,209,88,0.13)', 'rgba(100,210,255,0.12)'],
    light: ['rgba(10,132,255,0.14)', 'rgba(48,214,165,0.12)', 'rgba(48,209,88,0.09)', 'rgba(100,210,255,0.09)'],
    speed: 1, amp: 1,
  },
  tailwind: {
    dark: ['rgba(100,210,255,0.22)', 'rgba(10,132,255,0.20)', 'rgba(124,92,255,0.16)', 'rgba(48,214,165,0.14)'],
    light: ['rgba(100,210,255,0.15)', 'rgba(10,132,255,0.13)', 'rgba(124,92,255,0.11)', 'rgba(48,214,165,0.10)'],
    speed: 1.15, amp: 1.1,
  },
  pressure: {
    dark: ['rgba(255,159,10,0.20)', 'rgba(10,132,255,0.17)', 'rgba(124,92,255,0.15)', 'rgba(255,159,10,0.12)'],
    light: ['rgba(255,159,10,0.13)', 'rgba(10,132,255,0.11)', 'rgba(124,92,255,0.10)', 'rgba(255,159,10,0.08)'],
    speed: 1.3, amp: 1.2,
  },
  storm: {
    dark: ['rgba(255,69,58,0.22)', 'rgba(124,92,255,0.20)', 'rgba(255,159,10,0.15)', 'rgba(255,69,58,0.14)'],
    light: ['rgba(255,69,58,0.14)', 'rgba(124,92,255,0.12)', 'rgba(255,159,10,0.10)', 'rgba(255,69,58,0.09)'],
    speed: 1.6, amp: 1.35,
  },
};

export default function AuroraBackground({ weatherKey }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();
  const { projection, pulse } = useMoney();

  // Zero-wiring: derive the same condition the weather pill shows. An explicit
  // key wins (previews); anything unknown falls back to calm.
  const key = weatherKey || deriveWeather({ projection, pulse }).key || 'clear';
  const p = PALETTES[key] || PALETTES.clear;
  const orbs = dark ? p.dark : p.light;

  const drift = (amp) => ({
    // Each orb wanders on its own slow, offset loop, so the field never repeats
    // in an obvious way. Amplitude widens as the weather turns.
    x: [`${-8 * amp}%`, `${10 * amp}%`, `${-4 * amp}%`, `${-8 * amp}%`],
    y: ['0%', `${-12 * amp}%`, `${8 * amp}%`, '0%'],
    scale: [1, 1 + 0.15 * amp, 1 - 0.05 * amp, 1],
  });

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: dark ? '#131319' : '#eceef3',
      }}
    >
      {orbs.map((colour, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={reduce ? {} : drift(p.amp)}
          transition={{ duration: (26 + i * 7) / p.speed, repeat: Infinity, ease: 'easeInOut', delay: i * -6 }}
          style={{
            position: 'absolute',
            width: '58vmax', height: '58vmax', borderRadius: '50%',
            top: ['-10%', '40%', '20%', '55%'][i],
            left: ['-5%', '55%', '30%', '-10%'][i],
            background: `radial-gradient(circle at center, ${colour}, transparent 68%)`,
            filter: 'blur(46px)',
            // Glide between palettes when the weather shifts, instead of snapping.
            transition: 'background 1.4s ease',
          }}
        />
      ))}
    </Box>
  );
}
