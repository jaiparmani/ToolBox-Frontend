import React from 'react';
import {
  Box, Button, Chip, Collapse, Dialog, IconButton, InputBase, Slide, Stack,
  Switch, TextField, Typography, useMediaQuery, FormControlLabel, CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { accents, motion as motionTokens } from '../../theme/tokens';
import { money } from './money';

/**
 * The add / edit expense composer.
 *
 * Two ways in, one sheet. A "Smart add" line at the top takes plain language and
 * lets the parse decide the shape: type one thing ("20 coffee") and it fills the
 * form below for a glance-and-save; paste or type many ("20 coffee, 500
 * groceries, 1200 dinner with Raj") and it flips into a review list you confirm
 * as a batch — no separate import panel. Below that is the classic amount-first
 * form for when you'd rather tap it in.
 *
 * Nothing is written until you confirm: a single lands in the editable form, a
 * batch waits behind "Add all". Full-screen sheet on a phone, dialog on desktop.
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
  onSmartParse, onAddBatch, onAddOne,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [showMore, setShowMore] = React.useState(false);
  const amountRef = React.useRef(null);

  // Smart-add state
  const [nlText, setNlText] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [batch, setBatch] = React.useState([]);
  const [nlError, setNlError] = React.useState(null);
  const [committing, setCommitting] = React.useState(false);
  const [addingIdx, setAddingIdx] = React.useState(null);

  const activeType = TYPES.find(t => t.id === (data.transactionType || 'expense')) || TYPES[0];
  const heroColor = activeType.color;
  // Categories are typed on the backend, and it rejects a save whose type and
  // category type disagree. So only offer categories that match the chosen type
  // — otherwise you could pick an expense category for an income and get a 400.
  const visibleCats = categories.filter(c => (c.transaction_type || 'expense') === activeType.id);

  React.useEffect(() => {
    if (open) {
      setShowMore(false);
      setNlText(''); setBatch([]); setNlError(null); setParsing(false); setCommitting(false);
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

  const matchCat = (name) => categories.find(c => (c.name || '').toLowerCase() === (name || '').toLowerCase())?.id || '';

  // Parse the natural-language line; one item fills the form, many become a batch.
  const runParse = async () => {
    const text = nlText.trim();
    if (!text || !onSmartParse || parsing) return;
    setParsing(true); setNlError(null);
    try {
      const res = await onSmartParse(text);
      if (!res || !res.count) {
        setNlError(res?.detail || 'Couldn’t find an expense in that. Try “20 coffee”.');
      } else if (res.count === 1) {
        const it = res.items[0];
        onChange({
          amount: String(it.amount ?? ''), description: it.description || '',
          transactionType: it.transaction_type || 'expense',
          date: it.date || new Date(), categoryId: matchCat(it.category_name),
        });
        setNlText(''); setBatch([]);
      } else {
        setBatch(res.items); setNlText('');
      }
    } catch (e) {
      setNlError(e.message || 'Could not read that.');
    } finally {
      setParsing(false);
    }
  };

  const runBatch = async () => {
    if (!onAddBatch || !batch.length || committing) return;
    setCommitting(true);
    try { await onAddBatch(batch); } // parent handles success + close
    catch (e) { setNlError(e.message || 'Could not save those.'); setCommitting(false); }
  };

  // Add just one row from the batch, in place — the composer stays open on the
  // rest so you can pick and choose. Closes once the list is emptied.
  const addOne = async (it, i) => {
    if (!onAddOne || addingIdx !== null || committing) return;
    setAddingIdx(i); setNlError(null);
    try {
      await onAddOne(it);
      setBatch(prev => {
        const next = prev.filter((_, j) => j !== i);
        if (next.length === 0) onClose?.();
        return next;
      });
    } catch (e) { setNlError(e.message || 'Could not add that.'); }
    finally { setAddingIdx(null); }
  };

  const batchMode = batch.length > 0;
  const batchTotal = batch.reduce((s, i) => s + (Number(i.amount) || 0), 0);

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
      {/* Hero */}
      <Box
        sx={{
          position: 'relative', px: 2.5, pt: fullScreen ? 'calc(env(safe-area-inset-top) + 14px)' : 3, pb: 3,
          transition: `background ${motionTokens.slow}ms ${motionTokens.ease}`,
          background: batchMode
            ? `linear-gradient(160deg, ${accents.blue}2e, transparent 70%)`
            : `linear-gradient(160deg, ${heroColor}2e, transparent 70%)`,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <IconButton onClick={onClose} size="small" sx={{ ml: -0.5 }}><CloseIcon /></IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>
            {batchMode ? `Add ${batch.length} transactions` : editing ? 'Edit expense' : 'New expense'}
          </Typography>
          <Box sx={{ width: 34 }} />
        </Box>

        {/* Smart add — natural language, one or many */}
        {!editing && onSmartParse && (
          <Box sx={{ mb: batchMode ? 0 : 2.5 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.5, py: 0.5,
              borderRadius: 3, border: '1.5px solid', borderColor: `${accents.violet}66`,
              backgroundColor: `${accents.violet}0f`,
            }}>
              <AutoAwesomeRoundedIcon sx={{ color: accents.violet, fontSize: 20, flexShrink: 0 }} />
              <InputBase
                fullWidth multiline maxRows={3}
                placeholder="Smart add — type one or many, e.g. 20 coffee, 500 groceries"
                value={nlText}
                onChange={(e) => { setNlText(e.target.value); setNlError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runParse(); } }}
                sx={{ fontSize: 15 }}
              />
              <IconButton onClick={runParse} disabled={!nlText.trim() || parsing}
                aria-label="Parse"
                sx={{ flexShrink: 0, width: 34, height: 34, bgcolor: nlText.trim() ? accents.violet : 'action.disabledBackground', color: nlText.trim() ? '#fff' : 'text.disabled', '&:hover': { bgcolor: accents.violet } }}>
                {parsing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
            {nlError && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, px: 0.5 }}>{nlError}</Typography>}
          </Box>
        )}

        {batchMode ? (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.03em', color: accents.blue }}>
              {money(batchTotal)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{batch.length} transactions · review below</Typography>
          </Box>
        ) : (
          <>
            {/* Type pills */}
            <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
              {TYPES.map((t) => {
                const active = t.id === activeType.id;
                return (
                  <Chip key={t.id} label={t.label} onClick={() => {
                      // Drop a category that no longer matches the new type, so
                      // the payload never carries a mismatched pair.
                      const cur = categories.find(c => c.id === data.categoryId);
                      const keep = cur && (cur.transaction_type || 'expense') === t.id;
                      set(keep ? { transactionType: t.id } : { transactionType: t.id, categoryId: '' });
                    }}
                    sx={{
                      flexShrink: 0, fontWeight: 600, borderRadius: 999, border: '1.5px solid',
                      borderColor: active ? t.color : 'divider',
                      color: active ? '#fff' : 'text.secondary',
                      backgroundColor: active ? t.color : 'transparent',
                      transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                      '&:hover': { backgroundColor: active ? t.color : `${t.color}1f` },
                    }} />
                );
              })}
            </Stack>

            {/* The big amount */}
            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}
              onClick={() => amountRef.current?.focus()} sx={{ cursor: 'text' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '2.4rem', color: heroColor, opacity: 0.9 }}>₹</Typography>
              <InputBase
                inputRef={amountRef} type="number" placeholder="0" value={data.amount}
                onChange={(e) => set({ amount: e.target.value })}
                inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' } }}
                sx={{
                  '& input': {
                    fontSize: '3.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: heroColor,
                    width: `${Math.max((String(data.amount).length || 1), 1) + 1}ch`,
                    minWidth: '2ch', maxWidth: '8ch', padding: 0, MozAppearance: 'textfield',
                  },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2.5, overflowY: 'auto', flex: 1 }}>
        {batchMode ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Add all, or one at a time with +</Typography>
              <Typography variant="caption" sx={{ color: accents.violet, fontWeight: 650, cursor: 'pointer' }}
                onClick={() => { setBatch([]); setNlError(null); }}>Start over</Typography>
            </Box>
            <Stack spacing={0.5}>
              {batch.map((it, i) => {
                const income = it.transaction_type === 'income';
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderBottom: i < batch.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{it.description || 'Expense'}</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                        {it.category_name && <Chip label={it.category_name} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
                        <Typography variant="caption" color="text.secondary">{it.date || 'today'}</Typography>
                      </Stack>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: income ? accents.green : 'text.primary', flexShrink: 0 }}>
                      {income ? '+' : ''}{money(it.amount)}
                    </Typography>
                    {onAddOne && (
                      <IconButton size="small" onClick={() => addOne(it, i)} disabled={addingIdx !== null || committing}
                        aria-label={`Add ${it.description || 'this'}`}
                        sx={{ flexShrink: 0, width: 30, height: 30, color: accents.violet, border: '1px solid', borderColor: `${accents.violet}44` }}>
                        {addingIdx === i ? <CircularProgress size={14} sx={{ color: accents.violet }} /> : <AddRoundedIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </>
        ) : (
          <>
            <TextField
              fullWidth placeholder="What was it for?" value={data.description}
              onChange={(e) => set({ description: e.target.value })}
              sx={{ mb: 2.5 }} inputProps={{ style: { fontSize: 16 } }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>Category</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {visibleCats.map((cat) => {
                const active = data.categoryId === cat.id;
                return (
                  <Chip key={cat.id} label={cat.name}
                    icon={active ? <CheckIcon sx={{ fontSize: 16, color: '#fff !important' }} /> : undefined}
                    onClick={() => set({ categoryId: cat.id })}
                    sx={{
                      fontWeight: 600, borderRadius: 999, border: '1.5px solid',
                      borderColor: active ? (cat.color || heroColor) : 'divider',
                      backgroundColor: active ? (cat.color || heroColor) : 'transparent',
                      color: active ? '#fff' : 'text.primary',
                      transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                      '&:active': { transform: 'scale(0.94)' },
                    }} />
                );
              })}
              {visibleCats.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No {activeType.label.toLowerCase()} categories yet — add one first.
                </Typography>
              )}
            </Box>

            <Box onClick={() => setShowMore(s => !s)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>More details</Typography>
              <ExpandMoreIcon sx={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: `transform ${motionTokens.normal}ms ${motionTokens.ease}`, color: 'text.secondary' }} />
            </Box>
            <Collapse in={showMore}>
              <Stack spacing={2} sx={{ pt: 1.5 }}>
                <TextField fullWidth size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                  value={dateValue} onChange={(e) => set({ date: e.target.value })} />
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
          </>
        )}
      </Box>

      {/* Sticky save */}
      <Box sx={{ px: 2.5, py: 2, pb: fullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {batchMode ? (
          <Button fullWidth size="large" variant="contained" onClick={runBatch} disabled={committing}
            sx={{ py: 1.4, fontSize: '1rem', fontWeight: 650, background: `linear-gradient(135deg, ${accents.blue}, ${accents.blue}cc)`, boxShadow: `0 10px 24px ${accents.blue}55` }}>
            {committing ? 'Adding…' : batch.length === 1 ? 'Add it' : `Add all ${batch.length}`}
          </Button>
        ) : (
          <Button fullWidth size="large" variant="contained" onClick={onSave} disabled={saving || !canSave}
            sx={{
              py: 1.4, fontSize: '1rem', fontWeight: 650,
              background: canSave ? `linear-gradient(135deg, ${heroColor}, ${heroColor}cc)` : undefined,
              boxShadow: canSave ? `0 10px 24px ${heroColor}55` : 'none',
            }}>
            {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${activeType.label.toLowerCase()}`}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
