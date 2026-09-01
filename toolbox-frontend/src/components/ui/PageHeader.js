import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { type } from '../../theme/tokens';

/**
 * Consistent page title block: a gradient icon badge, title, optional subtitle,
 * and right-aligned actions. One per screen.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, sx }) {
  // Restrained: a neutral hairline icon chip (no gradient/glow); hierarchy from
  // the title's size/weight. `gradient`/`glow` props are accepted-and-ignored
  // for back-compat with existing callers.
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5} sx={{ mb: 2.5, ...sx }}>
      <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
        {Icon && (
          <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <Icon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: type.displayFamily, fontSize: '1.35rem', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.1 }} noWrap>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>}
        </Box>
      </Box>
      {actions && <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>{actions}</Stack>}
    </Box>
  );
}

export function SectionHeader({ title, count, action, sx }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25, ...sx }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}{count != null ? ` (${count})` : ''}
      </Typography>
      {action}
    </Box>
  );
}
