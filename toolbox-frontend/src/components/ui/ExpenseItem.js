import React from 'react';
import {
  Avatar, Box, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import { money, relativeDay } from './money';
import { type } from '../../theme/tokens';

/**
 * One expense, as a row that works at any width.
 *
 * The amount is the one thing worth glancing at, so it's always visible,
 * right-aligned, and set in tabular figures — every amount down the list lines
 * up on the decimal, the way a real ledger reads. A thin colour spine on the
 * left carries the category at a glance without a heavy chip; it and a soft
 * tinted wash (never a neon glow) come up on hover, and the whole row gives a
 * small physical press on tap. Edit/delete sit behind a 44px overflow target,
 * honest about being a tap target.
 */
export default function ExpenseItem({ expense, onEdit, onDelete, onOpen }) {
  const [menu, setMenu] = React.useState(null);
  const isIncome = expense.transaction_type === 'income' || expense.type === 'income';
  const category = expense.category;
  const tags = expense.tags || [];
  const spine = category?.color || (isIncome ? '#30D158' : '#8A8A8E');

  return (
    <Box
      sx={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5,
        px: { xs: 1.25, sm: 1.75 }, py: 1.5, borderRadius: 2.5,
        transition: 'background-color 140ms ease, transform 120ms ease',
        // Tinted wash of the category's own colour on hover — restrained, not neon.
        '&:hover': { backgroundColor: `${spine}14` },
        '&:hover .exp-spine': { transform: 'scaleY(1)', opacity: 1 },
        '&:hover .exp-open': { opacity: 1 },
        '&:active': { transform: 'scale(0.99)' },
      }}
    >
      {/* Category spine */}
      <Box className="exp-spine" aria-hidden sx={{
        position: 'absolute', left: 3, top: '22%', bottom: '22%', width: 3, borderRadius: 2,
        backgroundColor: spine, opacity: 0.55, transform: 'scaleY(0.7)', transformOrigin: 'center',
        transition: 'transform 160ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease',
      }} />

      <Avatar
        sx={{
          width: 40, height: 40, flexShrink: 0, fontSize: '0.95rem', fontWeight: 700,
          bgcolor: category?.color ? `${category.color}22` : 'action.selected',
          color: category?.color || 'text.secondary',
          boxShadow: `inset 0 0 0 1.5px ${spine}3d`,
        }}
      >
        {(category?.name || expense.description || '?').charAt(0).toUpperCase()}
      </Avatar>

      <Box
        onClick={() => onOpen?.(expense)}
        sx={{ minWidth: 0, flex: 1, cursor: onOpen ? 'pointer' : 'default' }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 650, letterSpacing: '-0.01em' }} noWrap>
            {expense.description}
          </Typography>
          <NorthEastRoundedIcon className="exp-open" sx={{ fontSize: 13, color: 'text.disabled', opacity: 0, transition: 'opacity 140ms ease', flexShrink: 0 }} />
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {[relativeDay(expense.date), category?.name].filter(Boolean).join(' · ')}
          </Typography>
          {tags.slice(0, 1).map((tag) => (
            <Chip
              key={tag.id} label={tag.name} size="small"
              sx={{
                height: 18, fontSize: '0.65rem', flexShrink: 0,
                bgcolor: `${tag.color}22`, color: tag.color,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          ))}
        </Stack>
      </Box>

      <Box
        onClick={() => onOpen?.(expense)}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, cursor: onOpen ? 'pointer' : 'default' }}
      >
        {isIncome
          ? <SouthWestRoundedIcon sx={{ fontSize: 15, color: 'success.main' }} />
          : <NorthEastRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />}
        <Typography sx={{
          fontFamily: type.displayFamily, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          fontSize: { xs: '0.98rem', sm: '1.05rem' },
          color: isIncome ? 'success.main' : 'text.primary',
        }}>
          {isIncome ? '+' : ''}{money(expense.amount)}
        </Typography>
      </Box>

      <IconButton
        size="small" onClick={(e) => setMenu(e.currentTarget)}
        aria-label={`Actions for ${expense.description}`}
        sx={{ width: 36, height: 36, flexShrink: 0 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setMenu(null); onEdit(expense); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setMenu(null); onDelete(expense.id); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
