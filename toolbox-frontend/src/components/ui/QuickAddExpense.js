import React from 'react';
import { Box, Typography, TextField, Button, InputBase, Modal, Backdrop } from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ScrollFade from './ScrollFade';
import { addExpenseApi, getEntrySuggestions } from '../rest/expenseTrackerApis';
import { feedback } from './feedback';
import { accents, type, motion as motionTokens, radius, color } from '../../theme/tokens';

/**
 * The dashboard's hero action — add an expense in seconds.
 *
 * Apple §7 (Spatial Consistency): when an `originRect` is provided (the FAB's
 * bounding rect), the dialog scales out from that exact point so the spatial
 * relationship between trigger and surface is obvious. On dismiss it shrinks
 * back to the same point. The mental model: the sheet lives inside the FAB.
 *
 * Description comes before category on purpose (moved up from a trailing
 * "Note" field): typing "what was it for" is what lets entry_suggestions
 * pick the category for you, the same lookup the full composer already
 * uses. A category tapped by hand is never second-guessed — the suggestion
 * only ever fills a category that's still blank.
 */
export default function QuickAddExpense({ open, onClose, categories = [], onAdded, originRect, initialDate }) {
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [categoryId, setCategoryId] = React.useState(null);
  const [date, setDate] = React.useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [duplicateWarning, setDuplicateWarning] = React.useState(null);
  const [descriptions, setDescriptions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const amountRef = React.useRef(null);
  const suggestDebounce = React.useRef(null);
  const reduce = useReducedMotion();

  const expenseCats = React.useMemo(
    () => (categories || []).filter((c) => (c.transaction_type || 'expense') === 'expense'),
    [categories],
  );
  const suggestionList = React.useMemo(() => {
    const current = description.trim().toLowerCase();
    return descriptions.filter((d) => d.toLowerCase() !== current);
  }, [descriptions, description]);

  React.useEffect(() => {
    if (open) {
      setAmount(''); setDescription(''); setCategoryId(null); setError(null); setDuplicateWarning(null);
      setDescriptions([]); setShowSuggestions(false);
      // A day tapped on the spend calendar arrives here pre-dated; every
      // other way in (the hero button, the FAB) leaves initialDate unset, so
      // this still defaults to today exactly as it always has.
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      const t = setTimeout(() => amountRef.current?.focus(), 160);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, initialDate]);

  // Debounced: past descriptions that match, plus the category most often
  // paired with them. Two characters minimum — anything shorter matches
  // almost everything and suggests nothing useful.
  React.useEffect(() => {
    const text = description.trim();
    clearTimeout(suggestDebounce.current);
    if (!open || text.length < 2) { setDescriptions([]); return undefined; }
    suggestDebounce.current = setTimeout(() => {
      getEntrySuggestions(text, 'expense')
        .then((res) => {
          setDescriptions(res?.descriptions || []);
          if (categoryId == null && res?.category_id != null
            && expenseCats.some((c) => c.id === res.category_id)) {
            setCategoryId(res.category_id);
          }
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(suggestDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, open]);

  const amountNum = parseFloat(amount);
  const canSave = amountNum > 0 && categoryId != null && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      const created = await addExpenseApi({ amount: amountNum, categoryId, description: description.trim(), date, transactionType: 'expense' });
      feedback('success');
      onAdded?.();
      // A likely duplicate stays on screen for a beat instead of vanishing
      // with the rest of the sheet — the save already happened either way.
      if (created?.duplicateWarning) {
        const d = created.duplicateWarning;
        setDuplicateWarning(`Looks like a duplicate of "${d.description}" added moments ago.`);
        setSaving(false);
      } else {
        onClose?.();
      }
    } catch (e) {
      setError(e?.message || 'Could not save that expense.');
      feedback('error');
      setSaving(false);
    }
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
            }} onKeyDown={(e) => {
              if (e.key === 'Enter') { if (duplicateWarning) onClose?.(); else if (canSave) save(); }
              if (e.key === 'Escape' && !saving) onClose?.();
            }}>
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

              {/* what was it for — description first, so a match can fill the
                  category below before you have to tap anything */}
              <Box sx={{ position: 'relative', mt: 2 }}>
                <TextField
                  size="small" fullWidth placeholder="What was it for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setShowSuggestions(false)}
                  inputProps={{ 'aria-label': 'Description' }}
                  sx={{
                    '& .MuiOutlinedInput-root': showSuggestions && suggestionList.length > 0
                      ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : undefined,
                  }}
                />
                {showSuggestions && suggestionList.length > 0 && (
                  <Box
                    sx={{
                      position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 2,
                      border: '1px solid', borderTop: 'none', borderColor: (t) => color.hairline[t.palette.mode],
                      borderRadius: `0 0 ${radius.md}px ${radius.md}px`,
                      bgcolor: (t) => color.raised[t.palette.mode],
                      boxShadow: '0 8px 20px -6px rgba(0,0,0,0.35)',
                      overflow: 'hidden',
                    }}
                  >
                    {suggestionList.map((desc) => (
                      <Box
                        key={desc}
                        role="button" tabIndex={-1}
                        // mousedown, not click: fires before the input's blur,
                        // so the dropdown is still there to be picked from.
                        onMouseDown={(e) => { e.preventDefault(); setDescription(desc); setShowSuggestions(false); }}
                        sx={{
                          px: 1.75, py: 1, fontSize: 13.5, cursor: 'pointer', color: 'text.secondary',
                          transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
                          '&:hover': { bgcolor: (t) => color.sunken[t.palette.mode], color: 'text.primary' },
                        }}
                      >
                        {desc}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* category chips — silently pre-filled from the description
                  above when a match arrives and nothing's been tapped yet */}
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
              </Box>

              {error && <Typography sx={{ mt: 1.5, fontSize: 12.5, color: accents.red }}>{error}</Typography>}
              {duplicateWarning && (
                <Box sx={{
                  mt: 1.5, px: 1.5, py: 1, borderRadius: `${radius.md}px`, fontSize: 12.5,
                  border: '1px solid', borderColor: `${accents.amber}55`, bgcolor: `${accents.amber}14`, color: accents.amber,
                }}>
                  {duplicateWarning}
                </Box>
              )}

              {duplicateWarning ? (
                <Button fullWidth variant="outlined" color="inherit" onClick={onClose} sx={{ mt: 2.5, py: 1.2, borderRadius: 2 }}>
                  Got it
                </Button>
              ) : (
                <>
                  <Button fullWidth variant="contained" onClick={save} disabled={!canSave} sx={{ mt: 2.5, py: 1.2, bgcolor: accents.mint, color: '#04150e', '&:hover': { bgcolor: accents.mint }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
                    {saving ? 'Saving…' : 'Add expense'}
                  </Button>
                  <Typography sx={{ mt: 1, textAlign: 'center', fontSize: 11, color: 'text.disabled' }}>Enter to save · Esc to close</Typography>
                </>
              )}
            </Box>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
