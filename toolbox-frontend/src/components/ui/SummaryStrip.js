import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import AnimatedNumber from './AnimatedNumber';
import ScrollFade from './ScrollFade';
import { money } from './money';
import { type, radius } from '../../theme/tokens';
import { resolveToneColor, srOnly } from './StatusBadge';

/**
 * The geometry of one headline card, exported so the loading placeholder can be
 * built from exactly the same box rather than from a guessed height.
 *
 * The skeleton and the real card have to occupy identical space or the page
 * jumps at the moment data lands (Apple Design §7) — and a hardcoded
 * `height={84}` next to a card whose height comes from padding + type is a
 * promise that breaks the first time either changes.
 */
export const STAT_CARD_SX = {
  flex: { xs: '0 0 auto', md: 1 },
  minWidth: { xs: 160, md: 0 },
  scrollSnapAlign: 'start',
  p: { xs: 2, sm: 2.25 },
  // The same corner Panel uses, so a stat tile and a card in the same column
  // read as the same material instead of two different roundnesses.
  borderRadius: `${radius.xl}px`,
  border: '1px solid',
  borderColor: 'divider',
  backgroundColor: 'background.paper',
};

export const STAT_LABEL_SX = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'text.secondary',
  lineHeight: 1.3, mb: 1,
};

export const STAT_VALUE_SX = {
  fontFamily: type.displayFamily, fontWeight: 650,
  fontSize: { xs: '1.5rem', sm: '1.85rem' },
  // Large figures need the tracking pulled in; the 11px label above takes
  // positive tracking instead. Size-specific, never one value for both (§15).
  letterSpacing: '-0.03em', lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

/**
 * The headline figures — restrained. A quiet uppercase label over one large,
 * confident, tabular number that counts to its real value. No tilt, sheen,
 * bloom, or glow: hierarchy comes from type and space, colour only carries
 * meaning (a caller may pass `tone`). Flat hairline surface.
 */
function StatCard({ stat }) {
  const theme = useTheme();
  // Callers pass raw `accents.*`, which are tuned for the dark canvas; on light
  // they resolve to the token file's light-mode twin instead.
  const tone = resolveToneColor(stat.tone, theme.palette.mode);
  const isMoney = stat.raw !== undefined;
  // The exact figure, never the compact form the tile shows — moneySmart()
  // rounds ₹1,24,500 to "₹1.2L", which is a fine label and a wrong number.
  const spoken = isMoney ? money(stat.raw) : String(stat.value ?? '');

  return (
    <Box role="listitem" sx={STAT_CARD_SX}>
      <Typography sx={STAT_LABEL_SX} noWrap>{stat.label}</Typography>
      <Box component="span" sx={srOnly}>{spoken}</Box>
      <Typography
        component="div"
        aria-hidden
        sx={{ ...STAT_VALUE_SX, color: tone || 'text.primary' }}
        noWrap
      >
        {isMoney
          ? <AnimatedNumber value={stat.raw} format="smart" />
          : <AnimatedNumber value={stat.value} format="plain" />}
      </Typography>
    </Box>
  );
}

/**
 * On a phone these cards overflow. ScrollFade replaces the hard cut at the
 * viewport edge with a gradient mask that only appears on the side that has
 * more content (Apple Design §12: a scroll-edge effect rather than a hard
 * divider), so the strip says "there's more" instead of looking truncated —
 * and it reuses the same primitive the category chip row already uses, rather
 * than a second, differently-behaving scroller.
 *
 * With no stats it renders nothing at all. An empty row of empty tiles would be
 * a shape that implies figures we do not have.
 */
export default function SummaryStrip({ stats, ariaLabel = 'Headline figures' }) {
  if (!stats || !stats.length) return null;
  return (
    <ScrollFade
      role="list"
      aria-label={ariaLabel}
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
