import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import AnimatedNumber from './AnimatedNumber';
import { type } from '../../theme/tokens';

/**
 * The four headline figures — as an editorial stat row, not glossy cards.
 *
 * The premium read here comes from restraint: no card, no glow, no bezel. Big
 * confident figures in the display face, a small labelled cue above each, and a
 * hairline between them. Data breathes in plain layout (heavy card containers on
 * dense metrics is an AI tell). Colour is a small accent on the label, not a
 * wash on the number; figures count to their real value and line up in tabular
 * digits. On a phone it stays a single swipeable line.
 */
export default function SummaryStrip({ stats }) {
  return (
    <Stack
      direction="row"
      divider={<Divider orientation="vertical" flexItem sx={{ my: 1, borderColor: 'divider' }} />}
      sx={{
        overflowX: 'auto', scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
      }}
    >
      {stats.map((stat) => (
        <Box key={stat.label} sx={{ flex: { xs: '0 0 auto', md: 1 }, minWidth: { xs: 118, md: 0 }, px: { xs: 1.75, sm: 2.25 }, py: 0.5, scrollSnapAlign: 'start' }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
            <stat.icon sx={{ fontSize: 14, color: stat.color }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }} noWrap>
              {stat.label}
            </Typography>
          </Stack>
          <Typography
            component="div"
            sx={{
              fontFamily: type.displayFamily, fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.9rem' }, letterSpacing: '-0.035em', lineHeight: 1,
              color: stat.tone || 'text.primary', fontVariantNumeric: 'tabular-nums',
            }}
            noWrap
          >
            {stat.raw === undefined
              ? <AnimatedNumber value={stat.value} format="plain" />
              : <AnimatedNumber value={stat.raw} format="smart" />}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
