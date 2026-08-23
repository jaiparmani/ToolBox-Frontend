import React from 'react';
import {
  Avatar, Box, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { money, relativeDay } from './money';

/**
 * One expense, as a row that works at any width.
 *
 * The table this replaces needed six columns and scrolled sideways on a phone,
 * which made the amount - the one thing worth glancing at - the first casualty.
 * Here the amount is always visible and right-aligned, and the details wrap
 * underneath instead of off-screen.
 *
 * Edit and delete sit behind an overflow menu rather than two 20px icons: at
 * 44px the tap target is honest about being a tap target.
 */
export default function ExpenseItem({ expense, onEdit, onDelete }) {
  const [menu, setMenu] = React.useState(null);
  const isIncome = expense.transaction_type === 'income' || expense.type === 'income';
  const category = expense.category;
  const tags = expense.tags || [];

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: { xs: 0.25, sm: 1.5 }, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
        transition: 'background-color 0.15s ease',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Avatar
        sx={{
          width: 40, height: 40, flexShrink: 0,
          fontSize: '0.95rem', fontWeight: 600,
          bgcolor: category?.color ? `${category.color}26` : 'action.selected',
          color: category?.color || 'text.secondary',
        }}
      >
        {(category?.name || expense.description || '?').charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {expense.description}
        </Typography>
        {/* Built as one string: as separate flex children each part got its
            own squeeze and every one ended up an ellipsis ("Yeste... - Sha..."),
            which told you nothing. Truncating one line at least keeps the
            leading words readable. */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {[relativeDay(expense.date), category?.name].filter(Boolean).join(' · ')}
          </Typography>
          {tags.slice(0, 1).map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              sx={{
                height: 18, fontSize: '0.65rem', flexShrink: 0,
                bgcolor: `${tag.color}26`, color: tag.color,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          ))}
        </Stack>
      </Box>

      <Typography
        sx={{
          fontWeight: 650, flexShrink: 0, letterSpacing: '-0.01em',
          fontSize: { xs: '0.95rem', sm: '1rem' },
          color: isIncome ? 'success.main' : 'text.primary',
        }}
      >
        {isIncome ? '+' : ''}{money(expense.amount)}
      </Typography>

      <IconButton
        size="small"
        onClick={(e) => setMenu(e.currentTarget)}
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
