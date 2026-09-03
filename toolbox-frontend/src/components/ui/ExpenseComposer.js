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
import { AnimatePresence, motion } from 'framer-motion';
import { accents, motion as motionTokens, type, radius, color } from '../../theme/tokens';
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

/* Shared number style — tabular, display face, tight tracking */
const numSx = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' };

/* Eyebrow label — consistent with SummaryStrip / DashWeekCompare */
const Eyebrow = ({ children, sx: extra }) => (
  <Typography
    sx={{
      fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'text.secondary', ...extra,
    }}
  >
    {children}
  </Typography>
);

/* framer-motion wrapper for animated batch rows */
const MotionBox = motion.create(Box);

/* Shared field styling for TextFields in More Details */
const fieldSx = (heroColor) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: `${radius.md}px`,
    '& fieldset': { borderColor: color.hairline.dark },
    '&:hover fieldset': { borderColor: 'text.disabled' },
    '&.Mui-focused fieldset': { borderColor: `${heroColor}66`, borderWidth: 1 },
  },
});

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
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : `${radius.xl}px`,
          overflow: 'hidden',
          bgcolor: 'background.default',
          backgroundImage: 'none',
        },
      }}
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative', px: 2.5,
          pt: fullScreen ? 'calc(env(safe-area-inset-top) + 12px)' : 2.5,
          pb: 3.5,
          transition: `background ${motionTokens.slow}ms ${motionTokens.ease}`,
          background: batchMode
            ? `linear-gradient(168deg, ${accents.blue}14 0%, transparent 60%)`
            : `linear-gradient(168deg, ${heroColor}14 0%, transparent 60%)`,
        }}
      >
        {/* ── Title bar ── */}
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <IconButton
            onClick={onClose} size="small"
            sx={{
              ml: -0.5, width: 36, height: 36,
              bgcolor: color.sunken.dark, border: '1px solid', borderColor: color.hairline.dark,
              color: 'text.secondary',
              '&:hover': { bgcolor: color.raised.dark },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography
            sx={{
              fontSize: 13, fontWeight: 650, letterSpacing: '-0.01em',
              color: 'text.secondary',
            }}
          >
            {batchMode ? `Add ${batch.length} transactions` : editing ? 'Edit expense' : 'New expense'}
          </Typography>
          <Box sx={{ width: 36 }} />
        </Box>

        {/* ── Smart add — natural language, one or many ── */}
        {!editing && onSmartParse && (
          <Box sx={{ mb: batchMode ? 0 : 3 }}>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.5, py: 0.5,
                borderRadius: `${radius.xl}px`, border: '1px solid',
                borderColor: color.hairline.dark,
                bgcolor: color.sunken.dark,
                transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
                '&:focus-within': {
                  borderColor: `${accents.violet}55`,
                  boxShadow: `0 0 0 3px ${accents.violet}14`,
                },
              }}
            >
              <AutoAwesomeRoundedIcon sx={{ color: accents.violet, fontSize: 18, flexShrink: 0, opacity: 0.8 }} />
              <InputBase
                fullWidth multiline maxRows={3}
                placeholder="Smart add — type one or many, e.g. 20 coffee, 500 groceries"
                value={nlText}
                onChange={(e) => { setNlText(e.target.value); setNlError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runParse(); } }}
                sx={{ fontSize: 15, '& textarea': { lineHeight: 1.45 } }}
              />
              <IconButton
                onClick={runParse} disabled={!nlText.trim() || parsing}
                aria-label="Parse"
                sx={{
                  flexShrink: 0, width: 34, height: 34,
                  borderRadius: `${radius.md}px`,
                  bgcolor: nlText.trim() ? accents.violet : 'transparent',
                  color: nlText.trim() ? '#fff' : 'text.disabled',
                  transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:hover': { bgcolor: nlText.trim() ? accents.violet : 'transparent' },
                }}
              >
                {parsing
                  ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                  : <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
            {nlError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, px: 0.5, fontSize: 12 }}>
                {nlError}
              </Typography>
            )}
          </Box>
        )}

        {batchMode ? (
          /* ── Batch hero total ── */
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography
              sx={{
                ...numSx, fontWeight: 700,
                fontSize: 'clamp(2.2rem, 8vw, 3rem)',
                lineHeight: 1, color: accents.blue,
              }}
            >
              {money(batchTotal)}
            </Typography>
            <Typography
              sx={{
                fontSize: 12, fontWeight: 550, color: 'text.disabled', mt: 1,
                letterSpacing: '0.02em',
              }}
            >
              {batch.length} transaction{batch.length !== 1 ? 's' : ''} · review below
            </Typography>
          </Box>
        ) : (
          <>
            {/* ── Type pills ── */}
            <Stack
              direction="row" spacing={0.75}
              sx={{
                mb: 3, overflowX: 'auto', pb: 0.5,
                '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
              }}
            >
              {TYPES.map((t) => {
                const active = t.id === activeType.id;
                return (
                  <Chip
                    key={t.id} label={t.label}
                    onClick={() => {
                      // Drop a category that no longer matches the new type, so
                      // the payload never carries a mismatched pair.
                      const cur = categories.find(c => c.id === data.categoryId);
                      const keep = cur && (cur.transaction_type || 'expense') === t.id;
                      set(keep ? { transactionType: t.id } : { transactionType: t.id, categoryId: '' });
                    }}
                    sx={{
                      flexShrink: 0, fontWeight: 600, fontSize: 13,
                      height: 34, px: 0.5,
                      borderRadius: `${radius.pill}px`,
                      border: '1px solid',
                      borderColor: active ? t.color : color.hairline.dark,
                      color: active ? '#fff' : 'text.secondary',
                      bgcolor: active ? t.color : 'transparent',
                      transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                      '&:hover': { bgcolor: active ? t.color : `${t.color}0d` },
                      '&:active': { transform: 'scale(0.95)' },
                    }}
                  />
                );
              })}
            </Stack>

            {/* ── The hero amount ── */}
            <Box
              onClick={() => amountRef.current?.focus()}
              sx={{
                cursor: 'text', textAlign: 'center', py: 1,
                display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25,
              }}
            >
              <Typography
                sx={{
                  ...numSx, fontWeight: 600,
                  fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
                  color: heroColor, opacity: 0.45,
                  lineHeight: 1,
                  transition: `color ${motionTokens.slow}ms ${motionTokens.ease}`,
                }}
              >
                {'₹'}
              </Typography>
              <InputBase
                inputRef={amountRef} type="number" placeholder="0" value={data.amount}
                onChange={(e) => set({ amount: e.target.value })}
                inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' } }}
                sx={{
                  '& input': {
                    ...numSx,
                    fontSize: 'clamp(2.8rem, 10vw, 4rem)', fontWeight: 700,
                    lineHeight: 1,
                    color: heroColor,
                    width: `${Math.max((String(data.amount).length || 1), 1) + 1}ch`,
                    minWidth: '2ch', maxWidth: '8ch', padding: 0,
                    MozAppearance: 'textfield',
                    transition: `color ${motionTokens.slow}ms ${motionTokens.ease}`,
                  },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none', margin: 0,
                  },
                  '& input::placeholder': { color: `${heroColor}33` },
                }}
              />
            </Box>
          </>
        )}
      </Box>

      {/* ── Hairline separator ── */}
      <Box sx={{ height: '1px', bgcolor: color.hairline.dark }} />

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, overflowY: 'auto', flex: 1 }}>
        {batchMode ? (
          /* ── Batch review list ── */
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Eyebrow>Review</Eyebrow>
              <Typography
                sx={{
                  fontSize: 12, fontWeight: 600, color: accents.violet,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => { setBatch([]); setNlError(null); }}
              >
                Start over
              </Typography>
            </Box>
            <Box
              sx={{
                border: '1px solid', borderColor: color.hairline.dark,
                borderRadius: `${radius.lg}px`, overflow: 'hidden',
              }}
            >
              <AnimatePresence initial={false}>
                {batch.map((it, i) => {
                  const income = it.transaction_type === 'income';
                  return (
                    <MotionBox
                      key={`${it.description}-${i}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: motionTokens.normal / 1000, ease: [0.32, 0.72, 0, 1] }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25,
                        px: 2, py: 1.5,
                        borderBottom: i < batch.length - 1 ? '1px solid' : 'none',
                        borderColor: color.hairline.dark,
                        transition: `background ${motionTokens.fast}ms ${motionTokens.ease}`,
                        '&:hover': { bgcolor: color.sunken.dark },
                      }}
                    >
                      {/* Type color dot */}
                      <Box
                        aria-hidden
                        sx={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          bgcolor: income ? accents.green : accents.red,
                          opacity: 0.7,
                        }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }} noWrap>
                          {it.description || 'Expense'}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                          {it.category_name && (
                            <Typography
                              sx={{
                                fontSize: 11, fontWeight: 550, color: 'text.disabled',
                                px: 0.75, py: 0.15,
                                borderRadius: `${radius.sm}px`,
                                bgcolor: color.sunken.dark,
                              }}
                            >
                              {it.category_name}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                            {it.date || 'today'}
                          </Typography>
                        </Stack>
                      </Box>
                      <Typography
                        sx={{
                          ...numSx, fontWeight: 650, fontSize: 15,
                          color: income ? accents.green : 'text.primary', flexShrink: 0,
                        }}
                      >
                        {income ? '+' : ''}{money(it.amount)}
                      </Typography>
                      {onAddOne && (
                        <IconButton
                          size="small" onClick={() => addOne(it, i)}
                          disabled={addingIdx !== null || committing}
                          aria-label={`Add ${it.description || 'this'}`}
                          sx={{
                            flexShrink: 0, width: 30, height: 30,
                            borderRadius: `${radius.sm}px`,
                            color: accents.violet,
                            border: '1px solid', borderColor: `${accents.violet}33`,
                            transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                            '&:hover': { bgcolor: `${accents.violet}14`, borderColor: `${accents.violet}55` },
                            '&:active': { transform: 'scale(0.92)' },
                          }}
                        >
                          {addingIdx === i
                            ? <CircularProgress size={14} sx={{ color: accents.violet }} />
                            : <AddRoundedIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      )}
                    </MotionBox>
                  );
                })}
              </AnimatePresence>
            </Box>
          </>
        ) : (
          /* ── Single-entry form ── */
          <>
            {/* Description input — styled as a cohesive surface */}
            <Box
              sx={{
                mb: 3, px: 1.75, py: 0.25,
                borderRadius: `${radius.lg}px`,
                border: '1px solid', borderColor: color.hairline.dark,
                bgcolor: color.sunken.dark,
                transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
                '&:focus-within': {
                  borderColor: `${heroColor}44`,
                  boxShadow: `0 0 0 3px ${heroColor}0d`,
                },
              }}
            >
              <InputBase
                fullWidth placeholder="What was it for?"
                value={data.description}
                onChange={(e) => set({ description: e.target.value })}
                sx={{ fontSize: 16, py: 1.25 }}
              />
            </Box>

            {/* Category section */}
            <Box sx={{ mb: 3 }}>
              <Eyebrow sx={{ mb: 1.25 }}>Category</Eyebrow>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {visibleCats.map((cat) => {
                  const active = data.categoryId === cat.id;
                  const chipColor = cat.color || heroColor;
                  return (
                    <Chip
                      key={cat.id} label={cat.name}
                      icon={active ? <CheckIcon sx={{ fontSize: 14, color: '#fff !important' }} /> : undefined}
                      onClick={() => set({ categoryId: cat.id })}
                      size="small"
                      sx={{
                        fontWeight: 600, fontSize: 12.5, height: 32, px: 0.25,
                        borderRadius: `${radius.pill}px`,
                        border: '1px solid',
                        borderColor: active ? chipColor : color.hairline.dark,
                        bgcolor: active ? chipColor : 'transparent',
                        color: active ? '#fff' : 'text.secondary',
                        transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                        '&:hover': { bgcolor: active ? chipColor : `${chipColor}0d` },
                        '&:active': { transform: 'scale(0.95)' },
                      }}
                    />
                  );
                })}
                {visibleCats.length === 0 && (
                  <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                    No {activeType.label.toLowerCase()} categories yet — add one first.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* ── More details collapsible ── */}
            <Box
              sx={{
                border: '1px solid', borderColor: color.hairline.dark,
                borderRadius: `${radius.lg}px`,
                overflow: 'hidden',
              }}
            >
              <Box
                onClick={() => setShowMore(s => !s)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', px: 2, py: 1.5,
                  transition: `background ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:hover': { bgcolor: color.sunken.dark },
                }}
              >
                <Eyebrow>More details</Eyebrow>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 20,
                    color: 'text.disabled',
                    transform: showMore ? 'rotate(180deg)' : 'none',
                    transition: `transform ${motionTokens.normal}ms ${motionTokens.emphasis}`,
                  }}
                />
              </Box>
              <Collapse in={showMore}>
                <Stack spacing={2} sx={{ px: 2, pt: 0.5, pb: 2 }}>
                  {/* Hairline between toggle and content */}
                  <Box sx={{ height: '1px', bgcolor: color.hairline.dark, mx: -2, width: 'calc(100% + 32px)' }} />

                  <TextField
                    fullWidth size="small" type="date" label="Date"
                    InputLabelProps={{ shrink: true }}
                    value={dateValue} onChange={(e) => set({ date: e.target.value })}
                    sx={fieldSx(heroColor)}
                  />

                  {tags.length > 0 && (
                    <Box>
                      <Eyebrow sx={{ mb: 1 }}>Tags</Eyebrow>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {tags.map((tag) => {
                          const on = selectedTags.has(tag.id);
                          const tagColor = tag.color || heroColor;
                          return (
                            <Chip
                              key={tag.id} label={tag.name} size="small"
                              onClick={() => {
                                const next = new Set(selectedTags);
                                on ? next.delete(tag.id) : next.add(tag.id);
                                set({ tagIds: [...next] });
                              }}
                              sx={{
                                height: 28, fontSize: 12, fontWeight: 550,
                                borderRadius: `${radius.pill}px`,
                                border: '1px solid',
                                borderColor: on ? tagColor : color.hairline.dark,
                                bgcolor: on ? tagColor : 'transparent',
                                color: on ? '#fff' : 'text.secondary',
                                transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                                '&:hover': { bgcolor: on ? tagColor : `${tagColor}0d` },
                                '&:active': { transform: 'scale(0.95)' },
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      fullWidth size="small" label="Location"
                      value={data.location || ''}
                      onChange={(e) => set({ location: e.target.value })}
                      sx={fieldSx(heroColor)}
                    />
                    <TextField
                      fullWidth size="small" label="Payment"
                      value={data.paymentMethod || ''}
                      onChange={(e) => set({ paymentMethod: e.target.value })}
                      sx={fieldSx(heroColor)}
                    />
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: `${radius.md}px`, border: '1px solid',
                      borderColor: color.hairline.dark, px: 2,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!data.isRecurring}
                          onChange={(e) => set({ isRecurring: e.target.checked })}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: accents.mint },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accents.mint },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 14, fontWeight: 550, color: 'text.secondary' }}>
                          Recurring
                        </Typography>
                      }
                    />
                  </Box>
                </Stack>
              </Collapse>
            </Box>
          </>
        )}
      </Box>

      {/* ── Sticky save ─────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2.5, py: 2,
          pb: fullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2,
        }}
      >
        {batchMode ? (
          <Button
            fullWidth size="large" variant="contained" onClick={runBatch} disabled={committing}
            sx={{
              py: 1.6, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              borderRadius: `${radius.lg}px`,
              bgcolor: accents.blue,
              background: `linear-gradient(135deg, ${accents.blue}, ${accents.blue}dd)`,
              boxShadow: `0 8px 24px -4px ${accents.blue}44`,
              textTransform: 'none',
              transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${accents.blue}, ${accents.blue}cc)`,
                boxShadow: `0 12px 32px -4px ${accents.blue}55`,
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0) scale(0.99)' },
              '&.Mui-disabled': { bgcolor: color.raised.dark, color: 'text.disabled', boxShadow: 'none' },
            }}
          >
            {committing ? 'Adding…' : batch.length === 1 ? 'Add it' : `Add all ${batch.length}`}
          </Button>
        ) : (
          <Button
            fullWidth size="large" variant="contained" onClick={onSave}
            disabled={saving || !canSave}
            sx={{
              py: 1.6, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              borderRadius: `${radius.lg}px`,
              bgcolor: canSave ? heroColor : undefined,
              background: canSave ? `linear-gradient(135deg, ${heroColor}, ${heroColor}dd)` : undefined,
              boxShadow: canSave ? `0 8px 24px -4px ${heroColor}44` : 'none',
              textTransform: 'none',
              transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
              '&:hover': canSave ? {
                background: `linear-gradient(135deg, ${heroColor}, ${heroColor}cc)`,
                boxShadow: `0 12px 32px -4px ${heroColor}55`,
                transform: 'translateY(-1px)',
              } : {},
              '&:active': { transform: 'translateY(0) scale(0.99)' },
              '&.Mui-disabled': { bgcolor: color.raised.dark, color: 'text.disabled', boxShadow: 'none' },
            }}
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${activeType.label.toLowerCase()}`}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
