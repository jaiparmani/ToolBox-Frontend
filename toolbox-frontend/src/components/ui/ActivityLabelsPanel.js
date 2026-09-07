import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import { accents, motion, radius, type } from '../../theme/tokens';
import ActivityBarRow from './ActivityBarRow';
import Reveal from './Reveal';
import usePressSpring from './usePressSpring';
import { feedback } from './feedback';
import { money } from './money';

/**
 * Two real <button>s with a shared moving pill — the same indicator language
 * SectionNav uses one level up, so the page has one way of showing "you are
 * here". Real buttons because the kit's SegmentedControl is a div with a
 * role and no tab stop, and this switch has to survive the keyboard.
 */
function LabelSwitch({ options, value, onChange }) {
  const reduce = useReducedMotion();
  return (
    <Box role="group" aria-label="Label kind" sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <SwitchButton
            key={opt.id}
            option={opt}
            active={active}
            reduce={reduce}
            onSelect={() => { if (!active) { onChange(opt.id); feedback('snap'); } }}
          />
        );
      })}
    </Box>
  );
}

function SwitchButton({ option, active, reduce, onSelect }) {
  const press = usePressSpring({ pressScale: 0.96 });
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={active}
      ref={press.ref}
      {...press.bindEvents}
      onClick={onSelect}
      sx={{
        position: 'relative', appearance: 'none', border: '1px solid',
        borderColor: active ? `${option.color}55` : 'divider',
        bgcolor: 'transparent', cursor: 'pointer', font: 'inherit',
        px: 2, py: 0.85, borderRadius: `${radius.pill}px`,
        fontSize: '0.82rem', fontWeight: 650, letterSpacing: '-0.01em',
        color: active ? 'text.primary' : 'text.secondary',
        transition: `color ${motion.fast}ms ${motion.ease}, border-color ${motion.fast}ms ${motion.ease}`,
        '&:hover': { color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${option.color}`, outlineOffset: 2 },
      }}
    >
      {active && (
        <Box
          aria-hidden
          component={reduce ? 'div' : framerMotion.div}
          layoutId={reduce ? undefined : 'activity-label-switch'}
          transition={reduce ? undefined : { type: 'spring', stiffness: 520, damping: 40 }}
          sx={{
            position: 'absolute', inset: 0, borderRadius: `${radius.pill}px`, zIndex: 0,
            background: `linear-gradient(180deg, ${option.color}2e, ${option.color}12)`,
          }}
        />
      )}
      <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{option.label}</Box>
    </Box>
  );
}

/**
 * Categories and tags, in one place, with the numbers attached.
 *
 * They used to be two near-identical tabs of MUI cards showing a name, an
 * icon and nothing else — two thirds of the tab bar spent on the same CRUD
 * screen twice, and neither told you whether a category mattered. Folding
 * them into one "Labels" tab is the simplicity call (§16.6): same object,
 * same actions, one place. The segmented control keeps both one tap away.
 *
 * Data-true: a category's figure is the server's own category_breakdown total
 * for the active date scope — the exact number the Insights tab shows for the
 * same row. Categories with no spend in the scope say so in words rather than
 * displaying a fabricated ₹0 bar. Tags carry no per-tag total from the API, so
 * none is invented; they simply show no figure.
 */
export default function ActivityLabelsPanel({
  categories = [],
  tags = [],
  breakdown = [],
  scopeLabel,
  segment,
  onSegmentChange,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddTag,
  onEditTag,
  onDeleteTag,
  onSelectCategory,
}) {
  const spendByName = React.useMemo(() => {
    const map = new Map();
    (breakdown || []).forEach((c) => {
      const amt = Math.abs(Number(c.amount) || 0);
      if (amt > 0) map.set(c.name, amt);
    });
    return map;
  }, [breakdown]);

  const scopeTotal = React.useMemo(
    () => Array.from(spendByName.values()).reduce((s, v) => s + v, 0),
    [spendByName],
  );

  // Spent categories first, biggest first; the unused ones keep their own
  // alphabetical order at the bottom instead of being scattered through.
  const orderedCategories = React.useMemo(() => {
    const withSpend = [];
    const without = [];
    categories.forEach((c) => {
      const amount = spendByName.get(c.name);
      (amount ? withSpend : without).push({ ...c, amount });
    });
    withSpend.sort((a, b) => b.amount - a.amount);
    without.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return [...withSpend, ...without];
  }, [categories, spendByName]);

  const isCategories = segment === 'categories';
  const list = isCategories ? orderedCategories : tags;

  const rowActions = (item, onEdit, onDelete, noun) => (
    <>
      <Tooltip title={`Edit ${noun}`}>
        <IconButton
          size="small"
          aria-label={`Edit ${item.name}`}
          onClick={() => onEdit(item)}
          sx={{
            color: 'text.disabled', p: 0.6,
            transition: `color ${motion.fast}ms ${motion.ease}`,
            '&:hover': { color: 'text.primary' },
            '&:focus-visible': { outline: `2px solid ${accents.blue}`, outlineOffset: 1 },
          }}
        >
          <EditIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={`Delete ${noun}`}>
        <IconButton
          size="small"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
          sx={{
            color: 'text.disabled', p: 0.6,
            transition: `color ${motion.fast}ms ${motion.ease}`,
            '&:hover': { color: accents.red },
            '&:focus-visible': { outline: `2px solid ${accents.red}`, outlineOffset: 1 },
          }}
        >
          <DeleteIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, flexWrap: 'wrap', mb: 2.5,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontFamily: type.displayFamily, fontSize: '1.3rem', fontWeight: 650, letterSpacing: '-0.02em' }}
          >
            Labels
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {isCategories
              ? `What each category cost you · ${scopeLabel}`
              : 'Cross-category tags for slicing the timeline'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={isCategories ? onAddCategory : onAddTag}
          sx={{ borderRadius: `${radius.pill}px`, px: 2 }}
        >
          {isCategories ? 'New category' : 'New tag'}
        </Button>
      </Box>

      <LabelSwitch
        options={[
          { id: 'categories', label: `Categories · ${categories.length}`, color: accents.purple },
          { id: 'tags', label: `Tags · ${tags.length}`, color: accents.amber },
        ]}
        value={segment}
        onChange={onSegmentChange}
      />

      {list.length === 0 ? (
        <Box
          sx={{
            p: 4, borderRadius: `${radius.lg}px`, textAlign: 'center',
            border: '1px dashed', borderColor: 'divider',
          }}
        >
          {isCategories
            ? <CategoryIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            : <TagIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />}
          <Typography sx={{ fontWeight: 600 }}>
            {isCategories ? 'No categories yet' : 'No tags yet'}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 320, mx: 'auto', mt: 0.5, mb: 2 }}>
            {isCategories
              ? 'Categories are how every expense gets grouped — and how the Insights breakdown is built.'
              : 'A tag cuts across categories: mark a trip, a project, or a person and filter the timeline by it.'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={isCategories ? onAddCategory : onAddTag}
            sx={{ borderRadius: `${radius.pill}px` }}
          >
            {isCategories ? 'Add your first category' : 'Add your first tag'}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 }, py: 0.5, borderRadius: `${radius.lg}px`,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            '& > div + div': { borderTop: '1px solid', borderColor: 'divider' },
          }}
        >
          {isCategories
            ? orderedCategories.map((c, i) => (
              <Reveal key={c.id} index={i} step={26} maxDelay={260}>
                <ActivityBarRow
                  index={i}
                  color={c.color || accents.violet}
                  label={c.name}
                  sublabel={c.amount
                    ? (c.description || `${money(c.amount)} ${scopeLabel.toLowerCase()}`)
                    : (c.description || `Nothing spent ${scopeLabel.toLowerCase()}`)}
                  amount={c.amount}
                  pct={c.amount && scopeTotal ? (c.amount / scopeTotal) * 100 : null}
                  onSelect={c.amount ? () => onSelectCategory(c.id) : undefined}
                  selectHint="Opens these transactions"
                  actions={rowActions(c, onEditCategory, onDeleteCategory, 'category')}
                />
              </Reveal>
            ))
            : tags.map((t, i) => (
              <Reveal key={t.id} index={i} step={26} maxDelay={260}>
                <ActivityBarRow
                  index={i}
                  dense
                  color={t.color || accents.amber}
                  label={t.name}
                  actions={rowActions(t, onEditTag, onDeleteTag, 'tag')}
                />
              </Reveal>
            ))}
        </Box>
      )}

      {isCategories && scopeTotal > 0 && (
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.5, display: 'block' }}>
          Shares are of {money(scopeTotal)} tracked {scopeLabel.toLowerCase()}.
        </Typography>
      )}
    </Box>
  );
}
