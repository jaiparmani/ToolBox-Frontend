import React from 'react';
import { Box } from '@mui/material';
import ScrollFade from './ScrollFade';
import usePressSpring from './usePressSpring';
import { accents, motion, radius } from '../../theme/tokens';

const NEUTRAL_DOT = '#8A8A8E';

/**
 * One filter chip. Defined at module scope for the same reason as
 * ActivityCategoryChips's — a component declared during render is a new type
 * every render, which would remount the chip and drop the press hook's ref.
 */
function Chip({ label, color, isSelected, onToggle }) {
  const press = usePressSpring({ pressScale: 0.94 });
  return (
    <Box
      component="button"
      type="button"
      ref={press.ref}
      {...press.bindEvents}
      aria-pressed={isSelected}
      onClick={onToggle}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
        px: { xs: 1.5, sm: 1.5 }, py: { xs: 0.75, sm: 0.7 },
        borderRadius: radius.pill, cursor: 'pointer', userSelect: 'none',
        font: 'inherit',
        fontSize: { xs: 13, sm: 13 }, fontWeight: isSelected ? 650 : 500,
        letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        border: '1px solid',
        borderColor: isSelected ? accents.mint : 'divider',
        color: isSelected ? accents.mint : 'text.secondary',
        bgcolor: isSelected ? `${accents.mint}14` : 'background.paper',
        transition: `color ${motion.fast}ms ${motion.ease}, border-color ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}`,
        '&:hover': { borderColor: isSelected ? accents.mint : 'text.disabled', color: isSelected ? accents.mint : 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
      }}
    >
      <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: color || NEUTRAL_DOT }} />
      {label}
    </Box>
  );
}

/**
 * A horizontal row of tag quick-filters, multi-select — unlike the single
 * category filter, a transaction can honestly carry more than one tag, so
 * picking "groceries" and "reimbursable" together narrows to expenses
 * carrying both, not either. Drives the page's existing filters.tags array
 * directly; no separate data flow.
 */
export default function ActivityTagChips({ tags = [], selected = [], onChange }) {
  if (tags.length === 0) return null;
  const selectedIds = (selected || []).map(String);

  const toggle = (id) => {
    const key = String(id);
    const next = selectedIds.includes(key)
      ? selectedIds.filter((v) => v !== key)
      : [...selectedIds, key];
    onChange(next);
  };

  return (
    <ScrollFade sx={{ gap: 0.75, alignItems: 'center', pb: 0.5, mb: 2.25 }}>
      {selectedIds.length > 0 && (
        <Chip label="Clear" color={null} isSelected={false} onToggle={() => onChange([])} />
      )}
      {tags.map((t) => (
        <Chip
          key={t.id}
          label={t.name}
          color={t.color}
          isSelected={selectedIds.includes(String(t.id))}
          onToggle={() => toggle(t.id)}
        />
      ))}
    </ScrollFade>
  );
}
