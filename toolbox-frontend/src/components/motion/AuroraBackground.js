import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * A living backdrop for the whole app.
 *
 * Sits fixed behind every screen: a few big, soft colour fields that drift and
 * breathe, so the app never feels like a flat form. Heavily blurred and low
 * opacity, so content stays readable - it's atmosphere, not decoration that
 * competes. Honours reduced-motion by holding still.
 */
export default function AuroraBackground() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();

  // Cool → violet → warm, matched to the app's accent story.
  const orbs = dark
    ? ['rgba(10,132,255,0.22)', 'rgba(191,90,242,0.20)', 'rgba(255,55,95,0.15)', 'rgba(48,209,88,0.14)']
    : ['rgba(10,132,255,0.16)', 'rgba(191,90,242,0.14)', 'rgba(255,55,95,0.10)', 'rgba(48,209,88,0.10)'];

  const drift = (i) => ({
    // Each orb wanders on its own slow, offset loop, so the field never repeats
    // in an obvious way.
    x: ['-8%', '10%', '-4%', '-8%'],
    y: ['0%', '-12%', '8%', '0%'],
    scale: [1, 1.15, 0.95, 1],
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
          animate={reduce ? {} : drift(i)}
          transition={{ duration: 26 + i * 7, repeat: Infinity, ease: 'easeInOut', delay: i * -6 }}
          style={{
            position: 'absolute',
            width: '58vmax', height: '58vmax', borderRadius: '50%',
            top: ['-10%', '40%', '20%', '55%'][i],
            left: ['-5%', '55%', '30%', '-10%'][i],
            background: `radial-gradient(circle at center, ${colour}, transparent 68%)`,
            filter: 'blur(46px)',
          }}
        />
      ))}

    </Box>
  );
}
