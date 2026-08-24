import React from 'react';
import {
  Box, Button, Chip, Collapse, Dialog, IconButton, InputBase, Slide, Stack,
  Switch, TextField, Typography, useMediaQuery, FormControlLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import { accents, motion as motionTokens } from '../../theme/tokens';

/**
 * The add / edit expense composer.
 *
 * Built around the amount, the way a banking or calculator app is: you type a
 * big number first, everything else is secondary. The transaction type is a
 * colour-shifting pill row that tints the whole hero, category is a row of
 * tappable chips rather than a dropdown, and the fiddly fields (date, location,
 * payment, tags, recurring) hide behind "More" so the common path is three
 * taps. Full-screen sheet on a phone, centred dialog on desktop.
 */

const TYPES = [
  { id: 'expense', label: 'Expense', color: accents.red },
  { id: 'income', label: 'Income', color: accents.green },
  { id: 'debt', label: 'Debt', color: accents.amber },
  { id: 'credit', label: 'Credit', color: accents.blue },
];

const SlideUp = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

export default function ExpenseComposer({
  open, editing, data, onChange, onClose, onSave, saving, categories = [], tags = [],
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [showMore, setShowMore] = React.useState(false);
  const amountRef = React.useRef(null);

  const activeType = TYPES.find(t => t.id === (data.transactionType || 'expense')) || TYPES[0];
  const heroColor = activeType.color;

  // Focus the amount as soon as the sheet opens - typing a number is step one.
  React.useEffect(() => {
    if (open) {
      setShowMore(false);
      const t = setTimeout(() => amountRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const set = (patch) => onChange(patch);
  const dateValue = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : (typeof data.date === 'string' ? data.date.slice(0, 10) : '');

  const canSave = data.amount && parseFloat(data.amount) > 0
    && (data.description || '').trim().length >= 3 && data.categoryId;

  const selectedTags = new Set(data.tagIds || []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      TransitionComponent={fullScreen ? SlideUp : undefined}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 4, overflow: 'hidden' } }}
    >
      {/* Hero: type + amount, tinted by the transaction type */}
      <Box
        sx={{
          position: 'relative', px: 2.5, pt: fullScreen ? 'calc(env(safe-area-inset-top) + 14px)' : 3, pb: 3,
          transition: `background ${motionTokens.slow}ms ${motionTokens.ease}`,
          background: `linear-gradient(160deg, ${heroColor}2e, transparent 70%)`,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <IconButton onClick={onClose} size="small" sx={{ ml: -0.5 }}><CloseIcon /></IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>
            {editing ? 'Edit expense' : 'New expense'}
          </Typography>
          <Box sx={{ width: 34 }} />
        </Box>

        {/* Type pills */}
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          {TYPES.map((t) => {
            const active = t.id === activeType.id;
            return (
              <Chip
                key={t.id}
                label={t.label}
                onClick={() => set({ transactionType: t.id })}
                sx={{
                  flexShrink: 0, fontWeight: 600, borderRadius: 999,
                  border: '1.5px solid',
                  borderColor: active ? t.color : 'divider',
                  color: active ? '#fff' : 'text.secondary',
                  backgroundColor: active ? t.color : 'transparent',
                  transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:hover': { backgroundColor: active ? t.color : `${t.color}1f` },
                }}
              />
            );
          })}
        </Stack>

        {/* The big amount */}
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}
          onClick={() => amountRef.current?.focus()} sx={{ cursor: 'text' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '2.4rem', color: heroColor, opacity: 0.9 }}>₹</Typography>
          <InputBase
            inputRef={amountRef}
            type="number"
            placeholder="0"
            value={data.amount}
            onChange={(e) => set({ amount: e.target.value })}
            inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' } }}
            sx={{
              '& input': {
                fontSize: '3.4rem', fontWeight: 700, letterSpacing: '-0.03em',
                color: heroColor, width: `${Math.max((String(data.amount).length || 1), 1) + 1}ch`,
                minWidth: '2ch', maxWidth: '8ch', padding: 0,
                // hide number spinners
                MozAppearance: 'textfield',
              },
              '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                WebkitAppearance: 'none', margin: 0,
              },
            }}
          />
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2.5, overflowY: 'auto', flex: 1 }}>
        <TextField
          fullWidth
          placeholder="What was it for?"
          value={data.description}
          onChange={(e) => set({ description: e.target.value })}
          sx={{ mb: 2.5 }}
          inputProps={{ style: { fontSize: 16 } }}
        />

        {/* Category as chips */}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
          Category
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {categories.map((cat) => {
            const active = data.categoryId === cat.id;
            return (
              <Chip
                key={cat.id}
                label={cat.name}
                icon={active ? <CheckIcon sx={{ fontSize: 16, color: '#fff !important' }} /> : undefined}
                onClick={() => set({ categoryId: cat.id })}
                sx={{
                  fontWeight: 600, borderRadius: 999, border: '1.5px solid',
                  borderColor: active ? (cat.color || heroColor) : 'divider',
                  backgroundColor: active ? (cat.color || heroColor) : 'transparent',
                  color: active ? '#fff' : 'text.primary',
                  transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:active': { transform: 'scale(0.94)' },
                }}
              />
            );
          })}
          {categories.length === 0 && (
            <Typography variant="body2" color="text.secondary">No categories yet — add one first.</Typography>
          )}
        </Box>

        {/* More details */}
        <Box
          onClick={() => setShowMore(s => !s)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 1 }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>More details</Typography>
          <ExpandMoreIcon sx={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: `transform ${motionTokens.normal}ms ${motionTokens.ease}`, color: 'text.secondary' }} />
        </Box>
        <Collapse in={showMore}>
          <Stack spacing={2} sx={{ pt: 1.5 }}>
            <TextField
              fullWidth size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
              value={dateValue}
              onChange={(e) => set({ date: e.target.value })}
            />
            {tags.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>Tags</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {tags.map((tag) => {
                    const on = selectedTags.has(tag.id);
                    return (
                      <Chip key={tag.id} label={tag.name} size="small"
                        onClick={() => {
                          const next = new Set(selectedTags);
                          on ? next.delete(tag.id) : next.add(tag.id);
                          set({ tagIds: [...next] });
                        }}
                        sx={{
                          borderRadius: 999, border: '1px solid',
                          borderColor: on ? (tag.color || heroColor) : 'divider',
                          backgroundColor: on ? `${tag.color || heroColor}` : 'transparent',
                          color: on ? '#fff' : 'text.secondary',
                        }} />
                    );
                  })}
                </Box>
              </Box>
            )}
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth size="small" label="Location" value={data.location || ''}
                onChange={(e) => set({ location: e.target.value })} />
              <TextField fullWidth size="small" label="Payment" value={data.paymentMethod || ''}
                onChange={(e) => set({ paymentMethod: e.target.value })} />
            </Stack>
            <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', px: 2 }}>
              <FormControlLabel
                control={<Switch checked={!!data.isRecurring} onChange={(e) => set({ isRecurring: e.target.checked })} />}
                label="Recurring" />
            </Box>
          </Stack>
        </Collapse>
      </Box>

      {/* Sticky save */}
      <Box sx={{ px: 2.5, py: 2, pb: fullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          fullWidth size="large" variant="contained" onClick={onSave} disabled={saving || !canSave}
          sx={{
            py: 1.4, fontSize: '1rem', fontWeight: 650,
            background: canSave ? `linear-gradient(135deg, ${heroColor}, ${heroColor}cc)` : undefined,
            boxShadow: canSave ? `0 10px 24px ${heroColor}55` : 'none',
          }}
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${activeType.label.toLowerCase()}`}
        </Button>
      </Box>
    </Dialog>
  );
}
