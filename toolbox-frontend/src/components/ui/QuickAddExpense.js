import React from 'react';
import { Box, Typography, TextField, Button, InputBase, Modal, Backdrop } from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ScrollFade from './ScrollFade';
import { addExpenseApi } from '../rest/expenseTrackerApis';
import { feedback } from './feedback';
import { accents, type } from '../../theme/tokens';

/**
 * The dashboard's hero action — add an expense in seconds.
 *
 * Apple §7 (Spatial Consistency): when an `originRect` is provided (the FAB's
 * bounding rect), the dialog scales out from that exact point so the spatial
 * relationship between trigger and surface is obvious. On dismiss it shrinks
 * back to the same point. The mental model: the sheet lives inside the FAB.
 */
export default function QuickAddExpense({ open, onClose, categories = [], onAdded, originRect }) {
  const [amount, setAmount] = React.useState('');
  const [categoryId, setCategoryId] = React.useState(null);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const amountRef = React.useRef(null);
  const reduce = useReducedMotion();

  const expenseCats = React.useMemo(
    () => (categories || []).filter((c) => (c.transaction_type || 'expense') === 'expense'),
    [categories],
  );

  React.useEffect(() => {
    if (open) {
      setAmount(''); setCategoryId(null); setNote(''); setError(null);
      setDate(new Date().toISOString().slice(0, 10));
      const t = setTimeout(() => amountRef.current?.focus(), 160);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const amountNum = parseFloat(amount);
  const canSave = amountNum > 0 && categoryId != null && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      await addExpenseApi({ amount: amountNum, categoryId, description: note.trim(), date, transactionType: 'expense' });
      feedback('success');
      onAdded?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Could not save that expense.');
      feedback('error');
    } finally { setSaving(false); }
  };

  // Compute transform-origin from the FAB's position
  const originStyle = React.useMemo(() => {
    if (!originRect) return {};
    const cx = originRect.left + originRect.width / 2;
    const cy = originRect.top + originRect.height / 2;
    return { transformOrigin: `${cx}px ${cy}px` };
  }, [originRect]);

  const springTransition = {
    type: 'spring',
    stiffness: 440,
    damping: 38,
    mass: 0.8,
  };

  const variants = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.55, filter: 'blur(8px)' },
        visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.55, filter: 'blur(8px)' },
      };

  return (
    <AnimatePresence>
      {open && (
        <Modal
          open
          onClose={saving ? undefined : onClose}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' } } }}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}
        >
          <motion.div
            key="quick-add"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            transition={reduce ? { duration: 0.15 } : springTransition}
            style={{
              ...originStyle,
              width: 'min(420px, 92vw)',
              outline: 'none',
            }}
          >
            <Box sx={{
              borderRadius: '20px', border: '1px solid', borderColor: 'divider',
              bgcolor: 'background.paper', backgroundImage: 'none',
              boxShadow: '0 24px 64px -16px rgba(0,0,0,0.5)',
              p: { xs: 2.5, sm: 3 },
            }} onKeyDown={(e) => { if (e.key === 'Enter' && canSave) save(); if (e.key === 'Escape' && !saving) onClose?.(); }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled' }}>Add expense</Typography>

              {/* amount hero */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 2, mb: 0.5 }}>
                <Typography sx={{ fontFamily: type.displayFamily, fontSize: '2.6rem', fontWeight: 500, color: amountNum > 0 ? 'text.primary' : 'text.disabled', lineHeight: 1 }}>₹</Typography>
                <InputBase
                  inputRef={amountRef}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                  placeholder="0"
                  inputProps={{ inputMode: 'decimal', 'aria-label': 'Amount', style: { textAlign: 'left', padding: 0 } }}
                  sx={{
                    '& input': {
                      fontFamily: type.displayFamily, fontSize: '3.4rem', fontWeight: 600, letterSpacing: '-0.03em',
                      fontVariantNumeric: 'tabular-nums', color: 'text.primary', width: `${Math.max(1, amount.length || 1)}ch`, minWidth: '1ch', maxWidth: '7ch',
                    },
                  }}
                />
              </Box>

              {/* category chips */}
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500, mt: 2, mb: 1 }}>Category</Typography>
              <ScrollFade sx={{ gap: 0.75, pb: 0.5 }}>
                {expenseCats.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>No categories yet.</Typography>}
                {expenseCats.map((c) => {
                  const on = categoryId === c.id;
                  return (
                    <Box key={c.id} role="button" tabIndex={0} onClick={() => setCategoryId(c.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategoryId(c.id); } }}
                      sx={{ flexShrink: 0, px: 1.5, py: 0.75, borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 550, whiteSpace: 'nowrap',
                        border: '1px solid', borderColor: on ? accents.mint : 'divider',
                        bgcolor: on ? `${accents.mint}1f` : 'transparent', color: on ? accents.mint : 'text.secondary',
                        transition: 'border-color .12s ease, background-color .12s ease, transform 60ms ease-out',
                        '&:hover': { borderColor: on ? accents.mint : 'text.disabled' },
                        '&:active': { transform: 'scale(0.96)' },
                        '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 } }}>
                      {c.name}
                    </Box>
                  );
                })}
              </ScrollFade>

              {/* secondary */}
              <Box sx={{ display: 'flex', gap: 1.25, mt: 2 }}>
                <TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} sx={{ width: 160 }} inputProps={{ 'aria-label': 'Date' }} />
                <TextField size="small" fullWidth placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ 'aria-label': 'Note' }} />
              </Box>

              {error && <Typography sx={{ mt: 1.5, fontSize: 12.5, color: accents.red }}>{error}</Typography>}

              <Button fullWidth variant="contained" onClick={save} disabled={!canSave} sx={{ mt: 2.5, py: 1.2, bgcolor: accents.mint, color: '#04150e', '&:hover': { bgcolor: accents.mint }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
                {saving ? 'Saving…' : 'Add expense'}
              </Button>
              <Typography sx={{ mt: 1, textAlign: 'center', fontSize: 11, color: 'text.disabled' }}>Enter to save · Esc to close</Typography>
            </Box>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
