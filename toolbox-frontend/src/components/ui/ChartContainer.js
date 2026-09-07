import React, { useId } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import Panel from './Panel';
import { type } from '../../theme/tokens';

/**
 * A titled frame around a visualisation — optional header, legend slot and a
 * consistent inner padding so every chart in the app sits in the same shell.
 *
 * Two things it now carries that a chart shell has to:
 *
 * - **Landmark and name.** It renders as a `<section>` labelled by its own
 *   title, so a screen-reader user can list the charts on a report page and
 *   jump between them. Untitled containers (the loading and empty frames on
 *   Reports) stay unlabelled rather than announcing an empty region.
 * - **Header type that matches the money type.** The title takes the display
 *   face with tracking tightened for its size, and the subtitle is set smaller,
 *   lighter *and* looser — hierarchy from the set, not from size alone
 *   (Apple Design §15). The legend is a real list.
 */
export default function ChartContainer({ title, subtitle, action, legend, children, tint, sx, ...rest }) {
  const id = useId();
  const titleId = title ? `chart-title-${id}` : undefined;

  return (
    <Panel
      component="section"
      aria-labelledby={titleId}
      tint={tint}
      sx={{ p: { xs: 2, sm: 2.5 }, ...sx }}
      {...rest}
    >
      {(title || action) && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography
                id={titleId}
                component="h3"
                sx={{
                  fontFamily: type.displayFamily,
                  fontWeight: 650, fontSize: '1rem',
                  letterSpacing: '-0.012em', lineHeight: 1.25, m: 0,
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', letterSpacing: '0.01em', lineHeight: 1.45, mt: 0.25 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      {children}
      {legend && (
        <Box
          role="list"
          sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}
        >
          {legend}
        </Box>
      )}
    </Panel>
  );
}
