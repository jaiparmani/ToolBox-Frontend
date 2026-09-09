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
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { accents, motion as motionTokens, type, radius, color } from '../../theme/tokens';
import { money } from './money';
import { createCategory, createTag } from '../rest/expenseTrackerApis';

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

/**
 * Every kind a row can be, with the label and tint to render it in.
 *
 * The add path only ever *chooses* between two of these (see CHOOSABLE): an
 * expense is the whole point of the screen, so it's the default and needs no
 * control at all, and income lives one level deeper under More details —
 * without it the dashboard's money-in/out card and `total_income` would be
 * permanently zero, which would be killing a working feature rather than
 * simplifying one (Apple Design §16: common path first, the rest one level
 * down).
 *
 * Debt and credit are gone from the add path — but they're real values on rows
 * already in the database, so they keep their entry here. Opening an old debt
 * for edit still shows it as a Debt, tinted amber, and saves it back as a debt;
 * the composer just won't mint new ones.
 */
const TYPE_META = {
  expense: { id: 'expense', label: 'Expense', color: accents.red },
  income: { id: 'income', label: 'Income', color: accents.green },
  debt: { id: 'debt', label: 'Debt', color: accents.amber },
  credit: { id: 'credit', label: 'Credit', color: accents.blue },
};
const DEFAULT_TYPE = TYPE_META.expense;
/** The only kinds the composer lets you pick. */
const CHOOSABLE = ['expense', 'income'];

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
    '& fieldset': { borderColor: (t) => color.hairline[t.palette.mode] },
    '&:hover fieldset': { borderColor: 'text.disabled' },
    '&.Mui-focused fieldset': { borderColor: `${heroColor}66`, borderWidth: 1 },
  },
});

/**
 * Colours a label created from this sheet can take.
 *
 * The same accents the Labels dialog offers, so a category minted here looks
 * like one minted there and the charts stay in the app's palette. Picked by a
 * stable hash of the name rather than at random, so "Pet care" is the same
 * violet whenever it's coined and two labels made in a row don't collide.
 */
const LABEL_COLORS = [
  accents.blue, accents.violet, accents.cyan, accents.mint,
  accents.amber, accents.red, accents.purple,
];
const colorForLabel = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
};

/** A label name, tidied the way the server tidies model-suggested ones. */
const cleanLabel = (name) => String(name || '').replace(/\s+/g, ' ').trim();
const sameLabel = (a, b) => cleanLabel(a).toLowerCase() === cleanLabel(b).toLowerCase();

/**
 * Make a category or tag without leaving the sheet.
 *
 * Lives inside the chip row it belongs to and behaves like one more chip: it
 * opens on click, takes a name, and commits on Enter. Escape closes it and
 * hands focus back to the chip that opened it, so a keyboard never gets
 * stranded inside a field the user didn't mean to open.
 */
function InlineLabelCreate({
  openLabel, addLabel, placeholder, tone, value, onValue, onSubmit, onCancel,
  busy, error, isOpen, onOpen, height = 32,
}) {
  const inputRef = React.useRef(null);
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), motionTokens.instant);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  const cancel = () => { onCancel(); triggerRef.current?.focus(); };

  if (!isOpen) {
    return (
      <Chip
        ref={triggerRef}
        label={addLabel}
        icon={<AddRoundedIcon sx={{ fontSize: 15, color: `${tone} !important` }} />}
        onClick={onOpen}
        size="small"
        aria-label={openLabel}
        sx={{
          fontWeight: 600, fontSize: height > 28 ? 12.5 : 12, height, px: 0.25,
          borderRadius: `${radius.pill}px`,
          border: '1px dashed', borderColor: `${tone}66`,
          bgcolor: 'transparent', color: tone,
          transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
          '&:hover': { bgcolor: `${tone}0d`, borderColor: tone },
          '&:active': { transform: 'scale(0.95)' },
          '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 2 },
        }}
      />
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, pl: 1.5, pr: 0.5, py: 0.25,
          borderRadius: `${radius.pill}px`, border: '1px solid', borderColor: `${tone}66`,
          bgcolor: (t) => color.sunken[t.palette.mode],
        }}
      >
        <InputBase
          inputRef={inputRef}
          value={value}
          placeholder={placeholder}
          disabled={busy}
          inputProps={{ 'aria-label': openLabel, maxLength: 40 }}
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
          }}
          sx={{ fontSize: 13.5, flex: 1, minWidth: 0 }}
        />
        <IconButton
          size="small" onClick={onSubmit} disabled={busy || !cleanLabel(value)}
          aria-label={`Create ${cleanLabel(value) || 'label'}`}
          sx={{
            width: 26, height: 26, borderRadius: `${radius.sm}px`, color: tone,
            '&.Mui-disabled': { color: 'text.disabled' },
          }}
        >
          {busy
            ? <CircularProgress size={13} sx={{ color: tone }} />
            : <CheckIcon sx={{ fontSize: 15 }} />}
        </IconButton>
        <IconButton
          size="small" onClick={cancel} disabled={busy} aria-label="Cancel"
          sx={{ width: 26, height: 26, borderRadius: `${radius.sm}px`, color: 'text.disabled' }}
        >
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>
      {error && (
        <Typography role="alert" variant="caption" color="error" sx={{ display: 'block', mt: 0.5, px: 1, fontSize: 12 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default function ExpenseComposer({
  open, editing, data, onChange, onClose, onSave, saving, categories = [], tags = [],
  onSmartParse, onAddBatch, onAddOne, onLabelsChanged,
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
  const bodyRef = React.useRef(null);
  const reduce = useReducedMotion();

  // Labels made from inside this sheet. The parent owns the canonical lists and
  // reloads them on its own schedule, so they're held here too — otherwise a
  // category you just created would vanish from the row you created it in.
  const [madeCats, setMadeCats] = React.useState([]);
  const [madeTags, setMadeTags] = React.useState([]);
  const [catDraft, setCatDraft] = React.useState(null);   // null = closed
  const [tagDraft, setTagDraft] = React.useState(null);
  const [makingCat, setMakingCat] = React.useState(false);
  const [makingTag, setMakingTag] = React.useState(false);
  const [catError, setCatError] = React.useState(null);
  const [tagError, setTagError] = React.useState(null);

  const typeId = data.transactionType || 'expense';
  const activeType = TYPE_META[typeId] || DEFAULT_TYPE;
  const heroColor = activeType.color;
  const isIncome = typeId === 'income';
  // An existing debt/credit row. Its kind is shown, never offered — nothing in
  // here may quietly rewrite what that record already is.
  const legacyType = !CHOOSABLE.includes(typeId);
  // The parent's lists plus anything made in this sheet since it opened. Once
  // the parent reloads its labels the same row arrives from both sides, so
  // dedupe on id.
  const allCats = React.useMemo(() => {
    const known = new Set(categories.map(c => c.id));
    return [...categories, ...madeCats.filter(c => !known.has(c.id))];
  }, [categories, madeCats]);
  const allTags = React.useMemo(() => {
    const known = new Set(tags.map(t => t.id));
    return [...tags, ...madeTags.filter(t => !known.has(t.id))];
  }, [tags, madeTags]);

  // Categories are typed on the backend, and it rejects a save whose type and
  // category type disagree. So only offer categories that match the chosen type
  // — otherwise you could pick an expense category for an income and get a 400.
  const visibleCats = allCats.filter(c => (c.transaction_type || 'expense') === activeType.id);

  React.useEffect(() => {
    if (open) {
      setShowMore(false);
      setNlText(''); setBatch([]); setNlError(null); setParsing(false); setCommitting(false);
      setMadeCats([]); setMadeTags([]);
      setCatDraft(null); setTagDraft(null); setCatError(null); setTagError(null);
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

  /* ── Labels made on the spot ──────────────────────────────────────────
     Match before creating, and match the way the server does: case- and
     space-insensitively, and for categories only within the same transaction
     type, since a name may legitimately exist as both an expense and an
     income category. Anything already there is selected, never duplicated. */
  const findCat = (name, typeId) => allCats.find(
    (c) => sameLabel(c.name, name) && (c.transaction_type || 'expense') === typeId);
  const findTag = (name) => allTags.find((t) => sameLabel(t.name, name));

  const makeCategory = async (rawName, typeId) => {
    const name = cleanLabel(rawName);
    if (!name) return null;
    const existing = findCat(name, typeId);
    if (existing) return existing;
    const created = await createCategory({
      name, description: '', color: colorForLabel(name), icon: 'category',
      transactionType: typeId,
    });
    setMadeCats((prev) => [...prev, created]);
    onLabelsChanged?.();
    return created;
  };

  const makeTag = async (rawName) => {
    const name = cleanLabel(rawName);
    if (!name) return null;
    const existing = findTag(name);
    if (existing) return existing;
    const created = await createTag({ name, color: colorForLabel(name) });
    setMadeTags((prev) => [...prev, created]);
    onLabelsChanged?.();
    return created;
  };

  const submitCat = async () => {
    if (makingCat || !cleanLabel(catDraft)) return;
    setMakingCat(true); setCatError(null);
    try {
      const cat = await makeCategory(catDraft, activeType.id);
      set({ categoryId: cat.id });
      setCatDraft(null);
    } catch (e) {
      setCatError(e?.message || 'Could not create that category.');
    } finally { setMakingCat(false); }
  };

  const submitTag = async () => {
    if (makingTag || !cleanLabel(tagDraft)) return;
    setMakingTag(true); setTagError(null);
    try {
      const tag = await makeTag(tagDraft);
      set({ tagIds: [...new Set([...(data.tagIds || []), tag.id])] });
      setTagDraft(null);
    } catch (e) {
      setTagError(e?.message || 'Could not create that tag.');
    } finally { setMakingTag(false); }
  };

  // Flip between expense and income. The backend rejects a save whose type and
  // category type disagree, so a category that no longer matches is dropped —
  // and because that quietly changes the section further up the sheet, we take
  // the reader back to the top, where the new tint, title and category chips
  // are (Apple Design §16 wayfinding). Reduced motion gets the same jump
  // without the travel.
  const setType = (id) => {
    const cur = categories.find(c => c.id === data.categoryId);
    const keep = cur && (cur.transaction_type || 'expense') === id;
    set(keep ? { transactionType: id } : { transactionType: id, categoryId: '' });
    bodyRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

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
        const typeId = it.transaction_type || 'expense';
        // The parse is allowed to coin a category or tag the account doesn't
        // have yet — every other write path creates it. This one used to drop
        // the name on the floor, which left the sheet with no category and the
        // save button switched off, so a good parse looked like a failed one.
        let categoryId = findCat(it.category_name, typeId)?.id || '';
        const tagIds = [];
        try {
          if (!categoryId) categoryId = (await makeCategory(it.category_name, typeId))?.id || '';
          const names = Array.isArray(it.tags) ? it.tags : [];
          for (let i = 0; i < names.length; i += 1) {
            // Sequential on purpose: two new tags racing can't both read the
            // same "does it exist yet" answer and create the name twice.
            // eslint-disable-next-line no-await-in-loop
            const tag = await makeTag(names[i]);
            if (tag) tagIds.push(tag.id);
          }
        } catch (e) {
          // A label that wouldn't save is not worth losing the parse over —
          // the fields still land, the user picks the label by hand.
          setNlError(e?.message || 'Added the details, but a new label could not be created.');
        }
        onChange({
          amount: String(it.amount ?? ''), description: it.description || '',
          transactionType: typeId,
          date: it.date || new Date(), categoryId, tagIds,
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
              bgcolor: (t) => color.sunken[t.palette.mode], border: '1px solid', borderColor: (t) => color.hairline[t.palette.mode],
              color: 'text.secondary',
              '&:hover': { bgcolor: (t) => color.raised[t.palette.mode] },
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
            {batchMode
              ? `Add ${batch.length} transactions`
              : `${editing ? 'Edit' : 'New'} ${activeType.label.toLowerCase()}`}
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
                borderColor: (t) => color.hairline[t.palette.mode],
                bgcolor: (t) => color.sunken[t.palette.mode],
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
            {/* ── Kind, only when it isn't the plain expense this sheet is for.
                   A label, not a control: an income says so, and an old debt or
                   credit keeps its own name and tint while you edit it. ── */}
            {(isIncome || legacyType) && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Typography
                  component="p"
                  sx={{
                    fontSize: 11, fontWeight: 650, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    px: 1.25, py: 0.4,
                    borderRadius: `${radius.pill}px`,
                    border: '1px solid', borderColor: `${heroColor}44`,
                    color: heroColor, bgcolor: `${heroColor}12`,
                    transition: `color ${motionTokens.slow}ms ${motionTokens.ease}`,
                  }}
                >
                  {activeType.label}
                </Typography>
              </Box>
            )}

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
      <Box sx={{ height: '1px', bgcolor: (t) => color.hairline[t.palette.mode] }} />

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <Box ref={bodyRef} sx={{ px: 2.5, pt: 2.5, pb: 2, overflowY: 'auto', overflowX: 'hidden', flex: 1, minWidth: 0 }}>
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
                border: '1px solid', borderColor: (t) => color.hairline[t.palette.mode],
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
                        borderColor: (t) => color.hairline[t.palette.mode],
                        transition: `background ${motionTokens.fast}ms ${motionTokens.ease}`,
                        '&:hover': { bgcolor: (t) => color.sunken[t.palette.mode] },
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
                                bgcolor: (t) => color.sunken[t.palette.mode],
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
                border: '1px solid', borderColor: (t) => color.hairline[t.palette.mode],
                bgcolor: (t) => color.sunken[t.palette.mode],
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
                        borderColor: active ? chipColor : (t) => color.hairline[t.palette.mode],
                        bgcolor: active ? chipColor : 'transparent',
                        color: active ? '#fff' : 'text.secondary',
                        transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                        '&:hover': { bgcolor: active ? chipColor : `${chipColor}0d` },
                        '&:active': { transform: 'scale(0.95)' },
                      }}
                    />
                  );
                })}
                {/* Make the right one here rather than abandoning the sheet
                    for the Labels tab. It lands selected, so the next tap is
                    Save. */}
                <InlineLabelCreate
                  isOpen={catDraft !== null}
                  onOpen={() => { setCatDraft(''); setCatError(null); }}
                  onCancel={() => { setCatDraft(null); setCatError(null); }}
                  openLabel={`New ${activeType.label.toLowerCase()} category`}
                  addLabel={visibleCats.length === 0 ? 'Add a category' : 'New'}
                  placeholder={`Name this ${activeType.label.toLowerCase()} category`}
                  tone={heroColor}
                  value={catDraft || ''}
                  onValue={(v) => { setCatDraft(v); setCatError(null); }}
                  onSubmit={submitCat}
                  busy={makingCat}
                  error={catError}
                />
              </Box>
            </Box>

            {/* Tags sit beside Category, not behind the disclosure: they're
                the other label you pick at add time, and a tag you can't see
                is a tag you never apply. */}
            <Box sx={{ mb: 3 }}>
              <Eyebrow sx={{ mb: 1.25 }}>Tags</Eyebrow>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {allTags.map((tag) => {
                  const on = selectedTags.has(tag.id);
                  const tagColor = tag.color || heroColor;
                  return (
                    <Chip
                      key={tag.id} label={tag.name} size="small"
                      icon={on ? <CheckIcon sx={{ fontSize: 14, color: '#fff !important' }} /> : undefined}
                      onClick={() => {
                        const next = new Set(selectedTags);
                        on ? next.delete(tag.id) : next.add(tag.id);
                        set({ tagIds: [...next] });
                      }}
                      sx={{
                        fontWeight: 600, fontSize: 12.5, height: 32, px: 0.25,
                        borderRadius: `${radius.pill}px`,
                        border: '1px solid',
                        borderColor: on ? tagColor : (t) => color.hairline[t.palette.mode],
                        bgcolor: on ? tagColor : 'transparent',
                        color: on ? '#fff' : 'text.secondary',
                        transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
                        '&:hover': { bgcolor: on ? tagColor : `${tagColor}0d` },
                        '&:active': { transform: 'scale(0.95)' },
                      }}
                    />
                  );
                })}
                <InlineLabelCreate
                  isOpen={tagDraft !== null}
                  onOpen={() => { setTagDraft(''); setTagError(null); }}
                  onCancel={() => { setTagDraft(null); setTagError(null); }}
                  openLabel="New tag"
                  addLabel={allTags.length === 0 ? 'Add a tag' : 'New'}
                  placeholder="Name this tag"
                  tone={accents.violet}
                  value={tagDraft || ''}
                  onValue={(v) => { setTagDraft(v); setTagError(null); }}
                  onSubmit={submitTag}
                  busy={makingTag}
                  error={tagError}
                />
              </Box>
            </Box>

            {/* ── More details collapsible ── */}
            <Box
              sx={{
                border: '1px solid', borderColor: (t) => color.hairline[t.palette.mode],
                borderRadius: `${radius.lg}px`,
                overflow: 'hidden',
              }}
            >
              <Box
                role="button" tabIndex={0} aria-expanded={showMore}
                onClick={() => setShowMore(s => !s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowMore(s => !s); }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                  cursor: 'pointer', px: 2, py: 1.5,
                  transition: `background ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:hover': { bgcolor: (t) => color.sunken[t.palette.mode] },
                  '&:focus-visible': { outline: `2px solid ${heroColor}`, outlineOffset: -2 },
                }}
              >
                <Eyebrow sx={{ flexShrink: 0 }}>More details</Eyebrow>
                {/* Say what's behind the disclosure, so the one kind that
                    moved down here is still findable without opening it. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  {!showMore && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }} noWrap>
                      {legacyType ? 'Date, location, payment' : 'Date, income, location'}
                    </Typography>
                  )}
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 20, flexShrink: 0,
                      color: 'text.disabled',
                      transform: showMore ? 'rotate(180deg)' : 'none',
                      transition: `transform ${motionTokens.normal}ms ${motionTokens.emphasis}`,
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    }}
                  />
                </Box>
              </Box>
              <Collapse in={showMore}>
                <Stack spacing={2} sx={{ px: 2, pt: 0.5, pb: 2, minWidth: 0, overflow: 'hidden' }}>
                  {/* Hairline between toggle and content */}
                  <Box sx={{ height: '1px', bgcolor: (t) => color.hairline[t.palette.mode], mx: -2, width: 'calc(100% + 32px)' }} />

                  {/* The one other kind you can still add. Kept down here, not
                      on the amount screen, because adding an expense is what
                      this sheet is for — but income has to stay reachable or
                      the dashboard's money-in figure can never move. */}
                  {!legacyType && (
                    <Box
                      sx={{
                        borderRadius: `${radius.md}px`, border: '1px solid',
                        borderColor: isIncome ? `${accents.green}44` : (t) => color.hairline[t.palette.mode],
                        px: 2,
                        transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}`,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isIncome}
                            onChange={(e) => setType(e.target.checked ? 'income' : 'expense')}
                            inputProps={{ 'aria-label': 'Record this as income instead of an expense' }}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: accents.green },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accents.green },
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 550, color: 'text.secondary' }}>
                              This is money in
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                              Counts as income, not spending
                            </Typography>
                          </Box>
                        }
                        sx={{ py: 0.75, mr: 0 }}
                      />
                    </Box>
                  )}

                  <TextField
                    fullWidth size="small" type="date" label="Date"
                    InputLabelProps={{ shrink: true }}
                    value={dateValue} onChange={(e) => set({ date: e.target.value })}
                    sx={{
                      ...fieldSx(heroColor),
                      minWidth: 0,
                      '& .MuiInputBase-input': {
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}
                  />


                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth size="small" label="Location"
                      value={data.location || ''}
                      onChange={(e) => set({ location: e.target.value })}
                      sx={{ ...fieldSx(heroColor), minWidth: 0 }}
                    />
                    <TextField
                      fullWidth size="small" label="Payment"
                      value={data.paymentMethod || ''}
                      onChange={(e) => set({ paymentMethod: e.target.value })}
                      sx={{ ...fieldSx(heroColor), minWidth: 0 }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: `${radius.md}px`, border: '1px solid',
                      borderColor: (t) => color.hairline[t.palette.mode], px: 2,
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
              '&.Mui-disabled': { bgcolor: (t) => color.raised[t.palette.mode], color: 'text.disabled', boxShadow: 'none' },
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
              '&.Mui-disabled': { bgcolor: (t) => color.raised[t.palette.mode], color: 'text.disabled', boxShadow: 'none' },
            }}
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${activeType.label.toLowerCase()}`}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
