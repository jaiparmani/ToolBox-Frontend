import React, { useState } from 'react';
import {
  Box, Button, Dialog, TextField, Alert, IconButton, Stack, InputBase,
  Switch, FormControlLabel, Autocomplete, useMediaQuery, Slide,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  CallSplit as CallSplitIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion as framerMotion } from 'framer-motion';
import AutocompleteComponent from '../ReusableComponents/AutocompleteComponent';
import { accents, color, motion, radius, type } from '../../theme/tokens';
import { money } from './money';
import { createSplitManually, searchSplitUsers } from '../rest/expenseTrackerApis';

const SlideUp = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);
const MotionBox = framerMotion.create(Box);
const numSx = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' };

const emptyForm = {
  saving: false, amount: '', description: '', categoryId: '',
  splitWithMe: true, paidBy: '', addToExpenses: true,
  people: [], userOptions: [], searching: false, error: null,
};

/**
 * Split a bill with exact numbers — no model call. Fully self-contained: owns
 * its own form state and talks to the API directly, so any page can drop it
 * in and just handle what happens after (onCreated).
 */
export default function ManualSplitDialog({ open, onClose, categories = [], onCreated }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(emptyForm);

  // Reseed a clean form, and prime the people picker, each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    searchSplitUsers('').then(userOptions =>
      setForm(prev => ({ ...prev, userOptions }))).catch(() => {});
  }, [open]);

  const searchUsers = async (term) => {
    setForm(prev => ({ ...prev, searching: true }));
    try {
      const userOptions = await searchSplitUsers(term);
      setForm(prev => ({ ...prev, userOptions, searching: false }));
    } catch (error) {
      setForm(prev => ({ ...prev, searching: false }));
    }
  };

  // What each person will owe, worked out the same way the server will, so
  // the form shows the real numbers before anything is saved.
  const previewShares = () => {
    const total = parseFloat(form.amount);
    if (!total || total <= 0 || form.people.length === 0) return null;
    const explicit = form.people.filter(p => p.amount);
    const paise = Math.round(total * 100);
    if (explicit.length) {
      const named = explicit.reduce((sum, p) => sum + Math.round(parseFloat(p.amount) * 100), 0);
      if (named > paise) return { error: 'Those shares add up to more than the bill' };
      const rest = form.people.filter(p => !p.amount);
      const each = rest.length ? Math.floor((paise - named) / rest.length) : 0;
      return {
        shares: form.people.map(p => ({
          label: p.label,
          amount: p.amount ? parseFloat(p.amount) : each / 100
        })),
        yours: (paise - named - each * rest.length) / 100
      };
    }
    const ways = form.people.length + (form.splitWithMe ? 1 : 0);
    const base = Math.floor(paise / ways);
    const remainder = paise - base * ways;
    return {
      shares: form.people.map(p => ({ label: p.label, amount: base / 100 })),
      yours: form.splitWithMe ? (base + remainder) / 100 : 0
    };
  };

  const save = async () => {
    const preview = previewShares();
    if (!preview || preview.error) {
      setForm(prev => ({ ...prev, error: preview?.error || 'Enter an amount and at least one person' }));
      return;
    }
    if (!form.description.trim()) {
      setForm(prev => ({ ...prev, error: 'What was the expense for?' }));
      return;
    }
    setForm(prev => ({ ...prev, saving: true, error: null }));
    try {
      const result = await createSplitManually({
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        categoryId: form.categoryId || undefined,
        splitWithMe: form.splitWithMe,
        paidBy: form.paidBy || undefined,
        addToExpenses: form.addToExpenses,
        participants: form.people.map(p => ({
          userId: p.userId, name: p.label, amount: p.amount || undefined
        }))
      });
      window.dispatchEvent(new Event('toolbox:notify-refresh'));
      setForm(prev => ({ ...prev, saving: false }));
      onCreated?.(result);
      onClose();
    } catch (error) {
      setForm(prev => ({ ...prev, saving: false, error: error.message || 'Could not create the split' }));
    }
  };

  const preview = previewShares();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
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
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative', px: 2.5,
          pt: fullScreen ? 'calc(env(safe-area-inset-top) + 12px)' : 2.5,
          pb: 3,
          background: `linear-gradient(168deg, ${accents.amber}14 0%, transparent 60%)`,
        }}
      >
        {/* ── Title bar ── */}
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <IconButton
            onClick={onClose} size="small"
            aria-label="Close split dialog"
            sx={{
              ml: -0.5, width: 36, height: 36,
              borderRadius: `${radius.md}px`,
              bgcolor: color.sunken.dark, border: '1px solid', borderColor: color.hairline.dark,
              color: 'text.secondary',
              '&:hover': { bgcolor: color.raised.dark },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 28, height: 28, borderRadius: `${radius.sm}px`,
                bgcolor: `${accents.amber}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CallSplitIcon sx={{ color: accents.amber, fontSize: 16 }} />
            </Box>
            <Box
              sx={{
                fontSize: 13, fontWeight: 650, letterSpacing: '-0.01em',
                color: 'text.secondary',
              }}
            >
              Split a bill
            </Box>
          </Stack>
          <Box sx={{ width: 36 }} />
        </Box>

        {/* ── Hero amount ── */}
        <Box
          sx={{
            cursor: 'text', textAlign: 'center', py: 1,
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25,
          }}
        >
          <Box
            sx={{
              ...numSx, fontWeight: 600,
              fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
              color: accents.amber, opacity: 0.45,
              lineHeight: 1,
            }}
          >
            {'₹'}
          </Box>
          <InputBase
            type="number" placeholder="0" value={form.amount}
            onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
            inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' }, 'aria-label': 'Total amount' }}
            sx={{
              '& input': {
                ...numSx,
                fontSize: 'clamp(2.8rem, 10vw, 4rem)', fontWeight: 700,
                lineHeight: 1,
                color: accents.amber,
                width: `${Math.max((String(form.amount).length || 1), 1) + 1}ch`,
                minWidth: '2ch', maxWidth: '8ch', padding: 0,
                MozAppearance: 'textfield',
              },
              '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                WebkitAppearance: 'none', margin: 0,
              },
              '& input::placeholder': { color: `${accents.amber}33` },
            }}
          />
        </Box>
      </Box>

      {/* ── Hairline separator ── */}
      <Box sx={{ height: '1px', bgcolor: color.hairline.dark }} />

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, overflowY: 'auto', flex: 1 }}>
        <Stack spacing={2.5}>
          {form.error && (
            <Alert severity="warning" onClose={() => setForm(prev => ({ ...prev, error: null }))} sx={{ borderRadius: `${radius.md}px` }}>
              {form.error}
            </Alert>
          )}

          {/* ── Description field ── */}
          <TextField
            fullWidth label="What for? *"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: `${radius.md}px`,
                '& fieldset': { borderColor: color.hairline.dark },
                '&:hover fieldset': { borderColor: 'text.disabled' },
                '&.Mui-focused fieldset': { borderColor: `${accents.amber}66`, borderWidth: 1 },
              },
            }}
          />

          {/* ── Category ── */}
          <AutocompleteComponent
            options={categories.map(cat => ({ label: cat.name, id: cat.id }))}
            label="Category"
            value={form.categoryId}
            onChange={(value) => setForm(prev => ({ ...prev, categoryId: value }))}
          />

          {/* ── People search ── */}
          <Autocomplete
            multiple
            freeSolo
            options={form.userOptions}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : option.username}
            filterSelectedOptions
            loading={form.searching}
            onInputChange={(e, value, reason) => {
              if (reason === 'input' && value.length >= 2) searchUsers(value);
            }}
            onChange={(e, values) => {
              setForm(prev => ({
                ...prev,
                // An option from the list carries a userId, so the split
                // reaches that account's panel; free text is a name only.
                people: values.map(v => {
                  const existing = prev.people.find(p =>
                    p.label === (typeof v === 'string' ? v : v.username));
                  if (existing) return existing;
                  return typeof v === 'string'
                    ? { label: v, userId: null, amount: '' }
                    : { label: v.username, userId: v.userId, amount: '' };
                })
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Split with *"
                placeholder="Search accounts, or type a name"
                helperText="People with an account see the split in their own panel"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: `${radius.md}px`,
                    '& fieldset': { borderColor: color.hairline.dark },
                    '&:hover fieldset': { borderColor: 'text.disabled' },
                    '&.Mui-focused fieldset': { borderColor: `${accents.amber}66`, borderWidth: 1 },
                  },
                }}
              />
            )}
          />

          {/* ── People details (animated in) ── */}
          <AnimatePresence initial={false}>
            {form.people.length > 0 && (
              <MotionBox
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motion.normal / 1000, ease: [0.32, 0.72, 0, 1] }}
              >
                <Stack spacing={2}>
                  {/* ── Toggles ── */}
                  <Box
                    sx={{
                      borderRadius: `${radius.lg}px`,
                      bgcolor: color.sunken.dark,
                      border: '1px solid', borderColor: color.hairline.dark,
                      px: 2, py: 0.75,
                      display: 'flex', flexWrap: 'wrap', gap: 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.splitWithMe}
                          onChange={(e) => setForm(prev => ({ ...prev, splitWithMe: e.target.checked }))}
                          size="small"
                        />
                      }
                      label={<Box sx={{ fontSize: 13, fontWeight: 500 }}>I shared this too</Box>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.addToExpenses}
                          onChange={(e) => setForm(prev => ({ ...prev, addToExpenses: e.target.checked }))}
                          size="small"
                        />
                      }
                      label={<Box sx={{ fontSize: 13, fontWeight: 500 }}>Add to my expenses</Box>}
                    />
                  </Box>

                  {/* ── Who paid? toggle group ── */}
                  <Box>
                    <Box
                      sx={{
                        fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'text.secondary', mb: 1,
                      }}
                    >
                      Who paid?
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {[{ label: 'I paid', value: '' }, ...form.people.map(p => ({ label: p.label, value: p.label }))].map(opt => {
                        const selected = form.paidBy === opt.value;
                        return (
                          <Box
                            key={opt.value || '__me'}
                            onClick={() => setForm(prev => ({ ...prev, paidBy: opt.value }))}
                            role="radio"
                            aria-checked={selected}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setForm(prev => ({ ...prev, paidBy: opt.value })); }}}
                            sx={{
                              px: 1.5, py: 0.625,
                              borderRadius: `${radius.pill}px`,
                              border: '1.5px solid',
                              borderColor: selected ? accents.amber : color.hairline.dark,
                              bgcolor: selected ? `${accents.amber}18` : 'transparent',
                              color: selected ? accents.amber : 'text.secondary',
                              fontSize: 13, fontWeight: selected ? 650 : 500,
                              cursor: 'pointer', userSelect: 'none',
                              transition: `all ${motion.fast}ms ${motion.ease}`,
                              '&:hover': {
                                borderColor: selected ? accents.amber : 'text.disabled',
                                bgcolor: selected ? `${accents.amber}22` : color.sunken.dark,
                              },
                            }}
                          >
                            {opt.label}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  {/* ── Per-person share rows ── */}
                  <Box>
                    <Box
                      sx={{
                        fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'text.secondary', mb: 1,
                      }}
                    >
                      Individual shares
                    </Box>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      Leave blank to divide evenly, or set a fixed share
                    </Box>
                    <Stack spacing={1}>
                      <AnimatePresence initial={false}>
                        {form.people.map((person, index) => (
                          <MotionBox
                            key={person.label}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: motion.fast / 1000, ease: [0.32, 0.72, 0, 1] }}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              px: 1.5, py: 1,
                              borderRadius: `${radius.md}px`,
                              bgcolor: color.sunken.dark,
                              border: '1px solid', borderColor: color.hairline.dark,
                            }}
                          >
                            {/* Person avatar circle */}
                            <Box
                              sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                bgcolor: person.userId ? `${accents.blue}22` : `${accents.violet}18`,
                                border: '1.5px solid',
                                borderColor: person.userId ? `${accents.blue}44` : `${accents.violet}33`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <PersonIcon sx={{
                                fontSize: 16,
                                color: person.userId ? accents.blue : accents.violet,
                              }} />
                            </Box>
                            {/* Name */}
                            <Box
                              sx={{
                                flex: 1, fontSize: 14, fontWeight: 550,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
                              {person.label}
                            </Box>
                            {/* Amount input */}
                            <Box
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                px: 1, py: 0.25,
                                borderRadius: `${radius.sm}px`,
                                bgcolor: 'background.default',
                                border: '1px solid', borderColor: color.hairline.dark,
                                width: 120,
                                transition: `border-color ${motion.fast}ms ${motion.ease}`,
                                '&:focus-within': { borderColor: `${accents.amber}55` },
                              }}
                            >
                              <Box sx={{ fontSize: 13, color: 'text.disabled', fontWeight: 500, flexShrink: 0 }}>₹</Box>
                              <InputBase
                                type="number" placeholder="even"
                                value={person.amount}
                                onChange={(e) => setForm(prev => {
                                  const people = [...prev.people];
                                  people[index] = { ...people[index], amount: e.target.value };
                                  return { ...prev, people };
                                })}
                                inputProps={{ inputMode: 'decimal', 'aria-label': `Share for ${person.label}` }}
                                sx={{
                                  flex: 1,
                                  '& input': {
                                    ...numSx, fontSize: 14, fontWeight: 600,
                                    py: 0.5, px: 0, color: 'text.primary',
                                    MozAppearance: 'textfield',
                                  },
                                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none', margin: 0,
                                  },
                                  '& input::placeholder': { fontWeight: 400, color: 'text.disabled' },
                                }}
                              />
                            </Box>
                          </MotionBox>
                        ))}
                      </AnimatePresence>
                    </Stack>
                  </Box>

                  {/* ── Preview: Who owes what ── */}
                  {preview && (preview.error ? (
                    <Alert severity="warning" sx={{ borderRadius: `${radius.md}px` }}>{preview.error}</Alert>
                  ) : (
                    <MotionBox
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: motion.normal / 1000, ease: [0.32, 0.72, 0, 1] }}
                    >
                      <Box
                        sx={{
                          p: 2, borderRadius: `${radius.lg}px`,
                          background: `linear-gradient(135deg, ${accents.amber}0a 0%, ${accents.violet}08 100%)`,
                          border: '1px solid', borderColor: `${accents.amber}22`,
                        }}
                      >
                        <Box
                          sx={{
                            fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: 'text.secondary', mb: 1.25,
                          }}
                        >
                          Who owes what
                        </Box>
                        <Stack spacing={0.75}>
                          {preview.shares.map((share) => (
                            <Box key={share.label} display="flex" justifyContent="space-between" alignItems="center">
                              <Box sx={{ fontSize: 14, fontWeight: 500 }}>{share.label}</Box>
                              <Box sx={{ ...numSx, fontSize: 14, fontWeight: 650, color: accents.amber }}>
                                {money(share.amount)}
                              </Box>
                            </Box>
                          ))}
                          <Box sx={{ height: '1px', bgcolor: color.hairline.dark, my: 0.25 }} />
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}>you</Box>
                            <Box sx={{ ...numSx, fontSize: 14, fontWeight: 650, color: 'text.secondary' }}>
                              {money(preview.yours)}
                            </Box>
                          </Box>
                        </Stack>
                      </Box>
                    </MotionBox>
                  ))}
                </Stack>
              </MotionBox>
            )}
          </AnimatePresence>
        </Stack>
      </Box>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 2.5, pt: 1.5,
          pb: fullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2,
          borderTop: '1px solid', borderColor: color.hairline.dark,
          display: 'flex', justifyContent: 'flex-end', gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: 'text.secondary', fontWeight: 600,
            borderRadius: `${radius.md}px`,
            '&:hover': { bgcolor: color.sunken.dark },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={save}
          variant="contained"
          disabled={form.saving || !form.amount || form.people.length === 0}
          sx={{
            borderRadius: `${radius.md}px`,
            bgcolor: accents.amber,
            color: '#000',
            fontWeight: 650,
            px: 3,
            textTransform: 'none',
            boxShadow: `0 4px 14px -4px ${accents.amber}66`,
            '&:hover': { bgcolor: accents.amber, filter: 'brightness(1.08)' },
            '&.Mui-disabled': { bgcolor: `${accents.amber}33`, color: 'rgba(0,0,0,0.3)' },
          }}
        >
          {form.saving ? 'Saving...' : 'Create split'}
        </Button>
      </Box>
    </Dialog>
  );
}
