import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { SectionHeader } from './PageHeader';

/**
 * Attention Layer — the app's "what needs me" rail. Not a wall of cards: a row
 * of intelligent *events*, each with a tone, a plain title, a supporting line
 * and an action. Fed by whatever screen mounts it (dashboard, inbox, insights),
 * so the logic that decides what's worth surfacing lives with the data.
 *
 * `items`: [{ id, icon, tone, title, detail, onClick }]. Empty renders a calm,
 * designed "all clear" — never a blank gap.
 */
export default function AttentionLayer({ items = [], loading }) {
  if (loading) {
    return (
      <Box>
        <SectionHeader title="Needs attention" />
        <Stack direction="row" spacing={1.25}>
          {[0, 1].map(i => (
            <Box key={i} sx={{ flex: 1, height: 92, borderRadius: 3, border: '1px solid', borderColor: 'divider', opacity: 0.4 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Box>
        <SectionHeader title="Needs attention" />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.75, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Nothing needs you right now</Typography>
            <Typography variant="caption" color="text.secondary">No unusual spend, bills, or open settlements.</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <SectionHeader title="Needs attention" count={items.length} />
      <Box
        sx={{
          display: 'grid', gap: 1.25, gridAutoFlow: 'column',
          gridAutoColumns: { xs: '78%', sm: 'minmax(240px, 1fr)' },
          overflowX: 'auto', pb: 0.5, mx: { xs: -0.5, sm: 0 }, px: { xs: 0.5, sm: 0 },
          scrollSnapType: 'x mandatory',
          '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        }}
      >
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Box
              key={it.id}
              role="button"
              tabIndex={0}
              onClick={it.onClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick?.(); } }}
              aria-label={`${it.title}. ${it.detail}`}
              sx={{
                scrollSnapAlign: 'start', position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', gap: 1.25, p: 1.75, borderRadius: 3, cursor: 'pointer',
                border: '1px solid', borderColor: `${it.tone}44`,
                background: `linear-gradient(120deg, ${it.tone}14, transparent 75%)`,
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', borderColor: `${it.tone}aa` },
                '&:focus-visible': { outline: `2px solid ${it.tone}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ width: 38, height: 38, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${it.tone}22` }}>
                <Icon sx={{ fontSize: 20, color: it.tone }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.2 }} noWrap>{it.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{it.detail}</Typography>
              </Box>
              <ChevronRightRoundedIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
