import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { type, radius } from '../../theme/tokens';

/**
 * Consistent page title block: a neutral hairline icon chip, title, optional
 * subtitle, and right-aligned actions. One per screen.
 *
 * Restrained by design — no gradient or glow; hierarchy comes from the title's
 * size, weight and leading as a set (Apple Design §15), with the subtitle
 * pulled to a smaller size, lighter weight *and* looser leading so the two
 * lines read as a pair rather than as two competing headings. The
 * `gradient`/`glow` props are accepted-and-ignored for back-compat.
 *
 * The title is now a real `<h1>` (override with `titleComponent`). Every screen
 * has to answer "where am I?" (§16 wayfinding), and a screen-reader user was
 * getting that answer from an anonymous `<div>` — the page had no heading at
 * all to jump to.
 */
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  titleComponent = 'h1',
  sx,
  ...rest
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      sx={{ mb: 2.5, ...sx }}
      {...rest}
    >
      <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
        {Icon && (
          <Box
            aria-hidden
            sx={{
              width: 40, height: 40, borderRadius: `${radius.md}px`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
            }}
          >
            <Icon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component={titleComponent}
            sx={{
              fontFamily: type.displayFamily,
              fontSize: '1.35rem', fontWeight: 650,
              // Negative tracking because the figure is large; the caption below
              // takes none. One value for both would be wrong for one of them.
              letterSpacing: '-0.02em', lineHeight: 1.12, m: 0,
            }}
            noWrap
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', letterSpacing: '0.01em', lineHeight: 1.45 }}
              noWrap
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Box>
  );
}

/**
 * The divider between sections of a page. `count` is rendered as a distinct
 * tabular chip rather than "(3)" inside the label: it's a figure, and figures
 * in this app are set in tabular numerals and separated from prose. It stays
 * inside the heading element so the accessible name still reads
 * "Recent activity 12".
 */
export function SectionHeader({ title, count, action, headingComponent = 'h2', sx, ...rest }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25, ...sx }} {...rest}>
      <Typography
        component={headingComponent}
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600, letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 0.75, m: 0 }}
      >
        {title}
        {count != null && (
          <Box
            component="span"
            sx={{
              px: 0.7, py: 0.1, borderRadius: `${radius.pill}px`,
              fontSize: '0.68rem', fontWeight: 650, lineHeight: 1.6,
              fontVariantNumeric: 'tabular-nums',
              bgcolor: 'action.hover', color: 'text.secondary',
            }}
          >
            {count}
          </Box>
        )}
      </Typography>
      {action}
    </Box>
  );
}
