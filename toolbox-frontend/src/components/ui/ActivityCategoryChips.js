import React from 'react';
import { Box } from '@mui/material';
import { accents, motion, radius } from '../../theme/tokens';

const NEUTRAL_DOT = '#8A8A8E';

/**
 * A horizontal row of category quick-filters. "All" clears; each other chip
 * narrows the timeline to one category by driving the page's existing
 * filters.category — no separate data flow. The selected chip is the one place
 * the mint accent appears here; the rest stay monochrome hairline pills with a
 * small dot in the category's own colour for identity.
 *
 * Income-only categories are dropped: this is a spending stream. If the API
 * hasn't tagged a category with a type, it's kept rather than hidden.
 */
export default function ActivityCategoryChips({ categories = [], selected = '', onSelect }) {
  const list = categories.filter((c) => c.transaction_type !== 'income');
  if (list.length === 0) return null;

  const Chip = ({ id, label, color, isSelected }) => (
    <Box
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onClick={() => onSelect(isSelected ? '' : id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(isSelected ? '' : id); } }}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
        px: { xs: 1.5, sm: 1.5 }, py: { xs: 0.75, sm: 0.7 },
        borderRadius: radius.pill, cursor: 'pointer', userSelect: 'none',
        fontSize: { xs: 13, sm: 13 }, fontWeight: isSelected ? 650 : 500,
        letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        border: '1px solid',
        borderColor: isSelected ? accents.mint : 'divider',
        color: isSelected ? accents.mint : 'text.secondary',
        bgcolor: isSelected ? `${accents.mint}14` : 'background.paper',
        transition: `color ${motion.fast}ms ${motion.ease}, border-color ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}`,
        '&:hover': { borderColor: isSelected ? accents.mint : 'text.disabled', color: isSelected ? accents.mint : 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
      }}
    >
      {color !== null && (
        <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: color || NEUTRAL_DOT }} />
      )}
      {label}
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'relative', mb: 2.25,
        /* fade mask on the right edge to hint at scrollable content */
        '&::after': {
          content: '""', position: 'absolute',
          top: 0, right: 0, bottom: 0, width: 32,
          background: (t) => t.palette.mode === 'dark'
            ? 'linear-gradient(to right, transparent, #0b0b10)'
            : 'linear-gradient(to right, transparent, #eef0f4)',
          pointerEvents: 'none', zIndex: 1,
          borderRadius: `0 ${radius.sm}px ${radius.sm}px 0`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex', gap: 0.75, alignItems: 'center',
          overflowX: 'auto', pb: 0.5,
          pr: 4, /* breathing room so the last chip isn't under the fade */
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Chip id="" label="All" color={null} isSelected={!selected} />
        {list.map((c) => (
          <Chip
            key={c.id}
            id={String(c.id)}
            label={c.name}
            color={c.color}
            isSelected={String(selected) === String(c.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
