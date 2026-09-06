import React from 'react';
import { Box } from '@mui/material';
import ScrollFade from './ScrollFade';
import usePressSpring from './usePressSpring';
import { accents, motion, radius } from '../../theme/tokens';

const NEUTRAL_DOT = '#8A8A8E';

/**
 * One filter chip. Defined at module scope, not inside the list component:
 * a component declared during render is a brand-new type on every render, so
 * React would unmount and remount every chip (throwing away the press hook's
 * element ref, and any in-flight spring with it).
 *
 * The press scale fires on pointer-DOWN and springs back on release (Apple
 * Design §1), with cancel-by-dragging-away handled by the hook — which matters
 * here because this row also scrolls horizontally, so a press that turns into
 * a scroll must not read as a tap.
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
      {color !== null && (
        <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: color || NEUTRAL_DOT }} />
      )}
      {label}
    </Box>
  );
}

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

  return (
    <ScrollFade sx={{ gap: 0.75, alignItems: 'center', pb: 0.5, mb: 2.25 }}>
      <Chip label="All" color={null} isSelected={!selected} onToggle={() => onSelect('')} />
      {list.map((c) => {
        const isSelected = String(selected) === String(c.id);
        return (
          <Chip
            key={c.id}
            label={c.name}
            color={c.color}
            isSelected={isSelected}
            onToggle={() => onSelect(isSelected ? '' : String(c.id))}
          />
        );
      })}
    </ScrollFade>
  );
}
