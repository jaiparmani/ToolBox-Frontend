import React from 'react';
import {
  Avatar, Box, Button, Chip, Dialog, Divider, IconButton, Slide, Stack, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentIcon from '@mui/icons-material/Payment';
import CategoryIcon from '@mui/icons-material/Category';
import EventIcon from '@mui/icons-material/Event';
import { money } from './money';
import { accents } from '../../theme/tokens';

/**
 * Transaction Story - a single transaction, told in full.
 *
 * Tapping a row opens this sheet: the merchant/category identity up top with
 * the amount large, the facts (when, how paid, where, tags) laid out, and a bit
 * of context computed from the rest of the list - where this sits among the
 * month's spend in its category - so a transaction reads as part of a pattern,
 * not an isolated number. Edit and delete live here too.
 *
 * `context` is optional and derived by the caller (it has the full list).
 */
const SlideUp = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

export default function TransactionStory({ open, expense, context, onClose, onEdit, onDelete }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  if (!expense) return null;

  const isIncome = expense.transaction_type === 'income' || expense.type === 'income';
  const cat = expense.category;
  const tone = isIncome ? accents.mint : (cat?.color || accents.blue);
  const tags = expense.tags || [];
  const dateObj = expense.date instanceof Date ? expense.date : new Date(expense.date);

  return (
    <Dialog
      open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth
      TransitionComponent={fullScreen ? SlideUp : undefined}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 4, overflow: 'hidden' } }}
    >
      {/* Identity hero */}
      <Box sx={{
        position: 'relative', px: 3, pt: fullScreen ? 'calc(env(safe-area-inset-top) + 18px)' : 3, pb: 3,
        background: `linear-gradient(165deg, ${tone}2c, transparent 72%)`,
      }}>
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', top: 12, right: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Avatar sx={{ width: 56, height: 56, mb: 1.5, fontSize: '1.5rem', fontWeight: 700, bgcolor: `${tone}2a`, color: tone }}>
          {(cat?.name || expense.description || '?').charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.2 }}>{expense.description}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '2.2rem', letterSpacing: '-0.03em', color: tone, mt: 0.5 }}>
          {isIncome ? '+' : ''}{money(expense.amount)}
        </Typography>
        {cat && (
          <Chip label={cat.name} size="small"
            sx={{ mt: 1, bgcolor: `${cat.color || tone}`, color: '#fff', fontWeight: 600 }} />
        )}
      </Box>

      <Box sx={{ px: 3, py: 2.5 }}>
        {/* Facts */}
        <Stack spacing={1.5}>
          <Fact icon={<EventIcon />} label="When"
            value={dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <Fact icon={<CategoryIcon />} label="Type" value={(expense.transaction_type || expense.type || 'expense')} sx={{ textTransform: 'capitalize' }} />
          {expense.payment_method && <Fact icon={<PaymentIcon />} label="Paid with" value={expense.payment_method} />}
          {expense.location && <Fact icon={<PlaceIcon />} label="Where" value={expense.location} />}
        </Stack>

        {tags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
              {tags.map(t => (
                <Chip key={t.id} label={t.name} size="small"
                  sx={{ bgcolor: `${t.color}26`, color: t.color, fontWeight: 600 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Context - where this sits in the month */}
        {context && (
          <Box sx={{ mt: 2, p: 1.75, borderRadius: 3, backgroundColor: 'action.hover' }}>
            <Typography variant="body2" color="text.secondary">
              {context}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1.5}>
          <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => { onClose(); onEdit?.(expense); }}>
            Edit
          </Button>
          <Button fullWidth color="error" variant="outlined" startIcon={<DeleteIcon />}
            onClick={() => { onClose(); onDelete?.(expense.id); }}>
            Delete
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

function Fact({ icon, label, value, sx }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5}>
      <Box sx={{ color: 'text.disabled', display: 'flex' }}>{React.cloneElement(icon, { sx: { fontSize: 18 } })}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, ...sx }} noWrap>{value}</Typography>
      </Box>
    </Box>
  );
}
