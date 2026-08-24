import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

/**
 * Consistent page title block: a gradient icon badge, title, optional subtitle,
 * and right-aligned actions. One per screen.
 */
export default function PageHeader({ icon: Icon, title, subtitle, gradient = 'linear-gradient(135deg, #0A84FF, #7C5CFF)', glow = 'rgba(10,132,255,0.4)', actions, sx }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5} sx={{ mb: 2.5, ...sx }}>
      <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
        {Icon && (
          <Box sx={{ width: 44, height: 44, borderRadius: '13px', flexShrink: 0, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${glow}` }}>
            <Icon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.15 }} noWrap>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>}
        </Box>
      </Box>
      {actions && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>{actions}</Stack>}
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
