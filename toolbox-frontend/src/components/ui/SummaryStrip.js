import React from 'react';
import { Box, Typography } from '@mui/material';
import AnimatedNumber from './AnimatedNumber';
import ScrollFade from './ScrollFade';
import { type } from '../../theme/tokens';

/**
 * The headline figures — restrained. A quiet uppercase label over one large,
 * confident, tabular number that counts to its real value. No tilt, sheen,
 * bloom, or glow: hierarchy comes from type and space, colour only carries
 * meaning (a caller may pass `tone`). Flat hairline surface.
 */
function StatCard({ stat }) {
  return (
    <Box
      sx={{
        flex: { xs: '0 0 auto', md: 1 }, minWidth: { xs: 160, md: 0 }, scrollSnapAlign: 'start',
        p: { xs: 2, sm: 2.25 }, borderRadius: 3, border: '1px solid', borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography
        sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}
        noWrap
      >
        {stat.label}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontFamily: type.displayFamily, fontWeight: 650,
          fontSize: { xs: '1.5rem', sm: '1.85rem' }, letterSpacing: '-0.03em', lineHeight: 1,
          color: stat.tone || 'text.primary', fontVariantNumeric: 'tabular-nums',
        }}
        noWrap
      >
        {stat.raw === undefined
          ? <AnimatedNumber value={stat.value} format="plain" />
          : <AnimatedNumber value={stat.raw} format="smart" />}
      </Typography>
    </Box>
  );
}

/**
 * On a phone these four cards overflow. ScrollFade replaces the hard cut at the
 * viewport edge with a gradient mask that only appears on the side that has
 * more content (Apple Design §12: a scroll-edge effect rather than a hard
 * divider), so the strip says "there's more" instead of looking truncated —
 * and it reuses the same primitive the category chip row already uses, rather
 * than a second, differently-behaving scroller.
 */
export default function SummaryStrip({ stats }) {
  return (
    <ScrollFade
      sx={{
        gap: 1.25, pb: 0.5,
        scrollSnapType: 'x mandatory',
        mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
      }}
    >
      {stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
    </ScrollFade>
  );
}
