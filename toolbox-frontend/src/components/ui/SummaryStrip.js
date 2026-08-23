import React from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import { moneySmart } from './money';

/**
 * The four headline figures.
 *
 * On a phone these were a 2x2 grid of tall cards that pushed the actual
 * expenses below the fold - the thing you opened the app to see. Here they
 * become one swipeable row that costs a single line of vertical space, and
 * only spread out when there's width to spare.
 */
export default function SummaryStrip({ stats }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        overflowX: 'auto',
        pb: 0.5,
        // Snap so a half-cut card doesn't look like a rendering bug.
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 0 },
      }}
    >
      {stats.map((stat) => (
        <Card
          key={stat.label}
          elevation={0}
          sx={{
            flex: { xs: '0 0 auto', md: 1 },
            minWidth: { xs: 132, md: 0 },
            p: 1.75,
            borderRadius: 3,
            scrollSnapAlign: 'start',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
            <Box
              sx={{
                width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                backgroundColor: `${stat.color}1f`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <stat.icon sx={{ color: stat.color, fontSize: 15 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500 }}>
              {stat.label}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 650,
              // Shrinks on narrow phones instead of wrapping mid-number.
              fontSize: { xs: '1.15rem', sm: '1.3rem' },
              letterSpacing: '-0.02em',
              color: stat.tone || 'text.primary',
            }}
            noWrap
          >
            {stat.raw === undefined ? stat.value : moneySmart(stat.raw)}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
}
