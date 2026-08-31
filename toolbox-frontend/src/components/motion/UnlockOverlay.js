import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';

/**
 * The signature moment. When the MPIN (or OTP) is accepted, the whole screen
 * hands off to this: the vault lock snaps open, a ring of light bursts outward,
 * and a short "welcome back" settles in — then we fall through to the app.
 *
 * It's a real overlay, not a page: the login card stays mounted underneath so
 * the transition reads as *unlocking this screen* rather than navigating away.
 * `onDone` fires once the choreography has landed (the parent then redirects);
 * reduced-motion collapses the whole thing to a calm fade + a settled check,
 * and still calls `onDone` on the same budget so sign-in never stalls.
 */
export default function UnlockOverlay({ label = 'Welcome back', onDone }) {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    const t = setTimeout(() => onDone?.(), reduce ? 650 : 1180);
    return () => clearTimeout(t);
  }, [onDone, reduce]);

  return (
    <Box
      role="status"
      aria-live="assertive"
      aria-label="Authenticated. Signing you in."
      sx={{
        position: 'fixed', inset: 0, zIndex: 2100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        // Frost the app behind us so the burst has a stage without hiding context.
        backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
        background: (t) => t.palette.mode === 'dark'
          ? 'radial-gradient(circle at 50% 42%, rgba(12,14,24,0.62), rgba(6,7,12,0.86))'
          : 'radial-gradient(circle at 50% 42%, rgba(244,247,252,0.72), rgba(228,233,242,0.92))',
        animation: reduce ? 'unlockFade 240ms ease both' : 'unlockFade 320ms ease both',
        '@keyframes unlockFade': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <Box sx={{ position: 'relative', width: 128, height: 128, display: 'grid', placeItems: 'center' }}>
        {/* Expanding shockwave rings — the "authentication pulse". */}
        {!reduce && [0, 1, 2].map((i) => (
          <Box key={i} aria-hidden sx={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${accents.cyan}`,
            animation: `unlockRing 1100ms cubic-bezier(0.16,0.84,0.44,1) ${180 + i * 140}ms both`,
            '@keyframes unlockRing': {
              from: { transform: 'scale(0.55)', opacity: 0.65 },
              to: { transform: 'scale(2.6)', opacity: 0 },
            },
          }} />
        ))}

        {/* Soft aura that swells as the lock opens. */}
        <Box aria-hidden sx={{
          position: 'absolute', inset: -18, borderRadius: '50%',
          background: `radial-gradient(circle, ${accents.mint}66, ${accents.cyan}22 55%, transparent 72%)`,
          filter: 'blur(10px)',
          animation: reduce ? 'none' : 'unlockAura 1100ms cubic-bezier(0.16,0.84,0.44,1) both',
          '@keyframes unlockAura': {
            '0%': { transform: 'scale(0.6)', opacity: 0 },
            '45%': { transform: 'scale(1)', opacity: 1 },
            '100%': { transform: 'scale(1.15)', opacity: 0.9 },
          },
        }} />

        {/* The lock disc that clicks open. */}
        <Box sx={{
          position: 'relative', width: 92, height: 92, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          background: `linear-gradient(145deg, ${accents.mint}, ${accents.cyan})`,
          boxShadow: `0 18px 44px -12px ${accents.mint}, inset 0 1px 0 rgba(255,255,255,0.45)`,
          animation: reduce ? 'unlockDiscR 300ms ease both' : 'unlockDisc 900ms cubic-bezier(0.34,1.56,0.64,1) both',
          '@keyframes unlockDisc': {
            '0%': { transform: 'scale(0.2) rotate(-14deg)', opacity: 0 },
            '55%': { transform: 'scale(1.08) rotate(3deg)', opacity: 1 },
            '100%': { transform: 'scale(1) rotate(0)', opacity: 1 },
          },
          '@keyframes unlockDiscR': { from: { transform: 'scale(0.7)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        }}>
          <UnlockGlyph reduce={reduce} />
        </Box>
      </Box>

      <Typography sx={{
        mt: 4, fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em',
        animation: reduce ? 'unlockFade 240ms 120ms ease both' : 'unlockText 520ms 360ms cubic-bezier(0.32,0.72,0,1) both',
        '@keyframes unlockText': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{
        mt: 0.5,
        animation: reduce ? 'unlockFade 240ms 200ms ease both' : 'unlockText 520ms 480ms cubic-bezier(0.32,0.72,0,1) both',
      }}>
        Taking you to your dashboard…
      </Typography>
    </Box>
  );
}

/** The padlock whose shackle lifts open, then a check settles in its place. */
function UnlockGlyph({ reduce }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      {/* Shackle — hinges up and out as it unlocks. */}
      <path
        d="M14 20 V15 a8 8 0 0 1 16 0 V20"
        stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none"
        style={{
          transformOrigin: '30px 15px',
          animation: reduce ? 'none' : 'shackleOpen 640ms 220ms cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      />
      {/* Body */}
      <rect x="10" y="19" width="24" height="18" rx="4.5" fill="#fff" opacity="0.96" />
      {/* Check that draws inside the body once it's open. */}
      <path
        d="M16.5 28.5 l3.6 3.6 l7.4 -7.6"
        stroke={accents.mint} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
        style={{
          strokeDasharray: 20, strokeDashoffset: reduce ? 0 : 20,
          animation: reduce ? 'none' : 'checkDraw 340ms 620ms ease forwards',
        }}
      />
      <style>{`
        @keyframes shackleOpen {
          from { transform: rotate(0) translateY(0); }
          to   { transform: rotate(38deg) translateY(-1px); }
        }
        @keyframes checkDraw { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}
