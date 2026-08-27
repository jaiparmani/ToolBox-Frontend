import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';
import TiltCard from '../motion/TiltCard';
import { type } from '../../theme/tokens';

/**
 * The four headline figures — machined hardware that catches the light.
 *
 * A nested "double-bezel" build (a glass core in a subtle tray, concentric
 * radii, an inset highlight) plus a whisper of the stat's own colour. On top of
 * that: each card tilts in 3D toward the pointer with a glare, and a slow band
 * of light sweeps across it like a real polished surface — staggered so the row
 * shimmers in sequence, never all at once. Figures count to their real value in
 * the display face. Reduced motion holds it all still; the numbers stay true.
 */
export default function SummaryStrip({ stats }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        overflowX: 'auto', pt: 0.5, pb: 1.25,
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
        '@keyframes cardSheen': {
          '0%': { transform: 'translateX(-160%) rotate(12deg)' },
          '60%, 100%': { transform: 'translateX(220%) rotate(12deg)' },
        },
      }}
    >
      {stats.map((stat, i) => (
        <Box key={stat.label} sx={{ flex: { xs: '0 0 auto', md: 1 }, minWidth: { xs: 150, md: 0 }, scrollSnapAlign: 'start' }}>
          <TiltCard max={8}>
            <Box
              sx={{
                // Outer shell — the tray the glass core sits in.
                p: '5px', borderRadius: '22px', height: '100%',
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.028)',
                boxShadow: dark
                  ? `0 1px 0 rgba(255,255,255,0.06) inset, 0 14px 34px -14px ${stat.color}66`
                  : `0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 34px -16px ${stat.color}77`,
              }}
            >
              {/* Inner core */}
              <Box
                sx={{
                  position: 'relative', overflow: 'hidden',
                  p: { xs: 1.85, sm: 2 }, borderRadius: '17px',
                  background: dark
                    ? `linear-gradient(155deg, ${stat.color}24, rgba(22,22,28,0.94) 58%)`
                    : `linear-gradient(155deg, ${stat.color}1a, #ffffff 62%)`,
                  boxShadow: dark ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.95)',
                }}
              >
                {/* Ambient colour bloom */}
                <Box aria-hidden sx={{
                  position: 'absolute', top: -30, right: -30, width: 84, height: 84, borderRadius: '50%',
                  background: `radial-gradient(circle, ${stat.color}3d, transparent 70%)`, filter: 'blur(10px)', pointerEvents: 'none',
                }} />
                {/* Travelling sheen — a band of light sweeping the polished face */}
                {!reduce && (
                  <Box aria-hidden sx={{
                    position: 'absolute', top: -20, bottom: -20, left: 0, width: '45%', pointerEvents: 'none',
                    background: `linear-gradient(100deg, transparent, ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)'}, transparent)`,
                    animation: `cardSheen ${6.5 + i * 0.4}s ease-in-out ${i * 1.1}s infinite`,
                  }} />
                )}

                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1.1, position: 'relative' }}>
                  {/* Nested-bezel icon */}
                  <Box sx={{
                    width: 30, height: 30, borderRadius: '10px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${stat.color}2e`, boxShadow: `inset 0 0 0 1px ${stat.color}47, 0 4px 10px -4px ${stat.color}88`,
                  }}>
                    <stat.icon sx={{ color: stat.color, fontSize: 17 }} />
                  </Box>
                  <Typography sx={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'text.secondary',
                  }} noWrap>
                    {stat.label}
                  </Typography>
                </Box>

                <Typography
                  component="div"
                  sx={{
                    position: 'relative', fontFamily: type.displayFamily, fontWeight: 650,
                    fontSize: { xs: '1.55rem', sm: '1.9rem' }, letterSpacing: '-0.035em', lineHeight: 1,
                    color: stat.tone || 'text.primary', fontVariantNumeric: 'tabular-nums',
                  }}
                  noWrap
                >
                  {stat.raw === undefined
                    ? <AnimatedNumber value={stat.value} format="plain" />
                    : <AnimatedNumber value={stat.raw} format="smart" />}
                </Typography>
              </Box>
            </Box>
          </TiltCard>
        </Box>
      ))}
    </Stack>
  );
}
