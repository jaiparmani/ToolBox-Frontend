import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import AnimatedNumber from './AnimatedNumber';

/**
 * The four headline figures — as machined hardware, not flat chips.
 *
 * On a phone these were a 2x2 grid of tall cards that pushed the actual
 * expenses below the fold; here they're one swipeable row that costs a single
 * line of vertical space and only spreads out when there's width to spare.
 *
 * The premium read comes from a nested "double-bezel" build (a glass core
 * sitting in a subtle tray, concentric radii, an inset top highlight) plus a
 * whisper of the stat's own colour as ambient glow — never a hard border. The
 * figures count to their value so a change is felt, and every number is the
 * real one, straight from the summary.
 */
export default function SummaryStrip({ stats }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        overflowX: 'auto', pt: 0.5, pb: 1,
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
      }}
    >
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{
            flex: { xs: '0 0 auto', md: 1 }, minWidth: { xs: 140, md: 0 },
            scrollSnapAlign: 'start',
            // Outer shell — the "tray" the glass core sits in.
            p: '5px', borderRadius: '20px',
            background: dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
            boxShadow: dark
              ? `0 1px 0 rgba(255,255,255,0.05) inset, 0 10px 26px -12px ${stat.color}55`
              : `0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 26px -14px ${stat.color}66`,
          }}
        >
          {/* Inner core */}
          <Box
            sx={{
              position: 'relative', overflow: 'hidden',
              p: 1.75, borderRadius: '15px',
              background: dark
                ? `linear-gradient(160deg, ${stat.color}1c, rgba(24,24,30,0.92) 55%)`
                : `linear-gradient(160deg, ${stat.color}14, #ffffff 60%)`,
              boxShadow: dark
                ? 'inset 0 1px 0 rgba(255,255,255,0.10)'
                : 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            {/* Faint corner glow of the stat's own colour */}
            <Box aria-hidden sx={{
              position: 'absolute', top: -22, right: -22, width: 70, height: 70, borderRadius: '50%',
              background: `radial-gradient(circle, ${stat.color}44, transparent 70%)`, filter: 'blur(8px)', pointerEvents: 'none',
            }} />

            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1, position: 'relative' }}>
              {/* Nested-bezel icon */}
              <Box sx={{
                width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${stat.color}26`, boxShadow: `inset 0 0 0 1px ${stat.color}3d`,
              }}>
                <stat.icon sx={{ color: stat.color, fontSize: 16 }} />
              </Box>
              <Typography sx={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'text.secondary',
              }} noWrap>
                {stat.label}
              </Typography>
            </Box>

            <Typography
              component="div"
              sx={{
                position: 'relative', fontWeight: 800,
                fontSize: { xs: '1.3rem', sm: '1.5rem' }, letterSpacing: '-0.03em', lineHeight: 1.05,
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
      ))}
    </Stack>
  );
}
