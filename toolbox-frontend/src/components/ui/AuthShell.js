import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { accents } from '../../theme/tokens';

/**
 * The shared "vault" shell for every authentication screen — login, register,
 * forgot, reset. One frame so the whole auth family reads as a single, premium
 * experience: a card floating over the app's living aurora, framed like a
 * security console with corner brackets and a slow scan-line sweeping the top
 * edge. `maxWidth` widens it for the two-column login and the register form.
 *
 * Purely presentational; it owns no auth logic. Reduced-motion holds the
 * scan-line still and drops the entrance transform.
 */
export default function AuthShell({ children, maxWidth = { xs: 430 } }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        px: { xs: 2, sm: 3 },
        pt: 'max(env(safe-area-inset-top), 24px)',
        pb: 'max(env(safe-area-inset-bottom), 24px)',
        '&::before': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(circle at 18% 12%, ${accents.blue}30, transparent 40%),
            radial-gradient(circle at 84% 8%, ${accents.violet}26, transparent 44%),
            radial-gradient(circle at 50% 108%, ${accents.cyan}1f, transparent 55%)
          `,
          opacity: (t) => (t.palette.mode === 'dark' ? 1 : 0.55),
        },
        '&::after': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: (t) => `linear-gradient(${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px), linear-gradient(90deg, ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px)`,
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 78%)',
        },
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          sx={{ position: 'relative', width: '100%', maxWidth, mx: 'auto' }}
        >
          {[
            { top: -1, left: -1, borderWidth: '2px 0 0 2px', borderRadius: '18px 0 0 0' },
            { top: -1, right: -1, borderWidth: '2px 2px 0 0', borderRadius: '0 18px 0 0' },
            { bottom: -1, left: -1, borderWidth: '0 0 2px 2px', borderRadius: '0 0 0 18px' },
            { bottom: -1, right: -1, borderWidth: '0 2px 2px 0', borderRadius: '0 0 18px 0' },
          ].map((pos, i) => (
            <Box key={i} aria-hidden sx={{
              position: 'absolute', width: 22, height: 22, borderStyle: 'solid',
              borderColor: `${accents.cyan}88`, ...pos, zIndex: 2, pointerEvents: 'none',
            }} />
          ))}

          <Paper
            elevation={0}
            sx={{
              position: 'relative', overflow: 'hidden', p: { xs: 2.5, sm: 3.5 }, borderRadius: '18px',
              border: '1px solid', borderColor: 'divider',
              backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(22,22,28,0.72)' : 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(30px) saturate(1.6)', WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
              boxShadow: (t) => t.palette.mode === 'dark'
                ? '0 30px 80px -24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 30px 80px -30px rgba(20,30,60,0.28), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <Box aria-hidden sx={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px', overflow: 'hidden',
              '&::before': {
                content: '""', position: 'absolute', top: 0, left: '-40%', width: '40%', height: '100%',
                background: `linear-gradient(90deg, transparent, ${accents.cyan}, ${accents.violet}, transparent)`,
                animation: 'authScan 4.2s ease-in-out infinite',
              },
              '@keyframes authScan': { '0%': { transform: 'translateX(0)' }, '55%,100%': { transform: 'translateX(375%)' } },
              '@media (prefers-reduced-motion: reduce)': { '&::before': { animation: 'none', opacity: 0.5, transform: 'translateX(180%)' } },
            }} />
            {children}
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
