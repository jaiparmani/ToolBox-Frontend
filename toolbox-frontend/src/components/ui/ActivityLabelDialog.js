import React from 'react';
import {
  Box, Button, Dialog, IconButton, InputBase, Slide, Stack, TextField, Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Category as CategoryIcon,
  Tag as TagIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { accents, color as colorRole, motion, radius, type } from '../../theme/tokens';
import usePressSpring from './usePressSpring';

const SlideUp = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

/**
 * The swatch set. A raw <input type="color"> is a native OS picker with none
 * of the app's colours in it, and it made every new category a different
 * arbitrary hue. These are the palette the rest of the app draws with, so the
 * chart and the label always agree. The last chip keeps the native picker for
 * anyone who wants a colour that isn't here.
 */
const SWATCHES = [
  accents.blue, accents.violet, accents.cyan, accents.mint,
  accents.amber, accents.red, accents.purple, '#8E8E93',
  '#e8724f', '#c4a248', '#4f9d7a', '#d55181',
];

function Swatch({ value, active, onSelect }) {
  const press = usePressSpring({ pressScale: 0.86 });
  return (
    <Box
      component="button"
      type="button"
      ref={press.ref}
      {...press.bindEvents}
      onClick={() => onSelect(value)}
      aria-label={`Use colour ${value}`}
      aria-pressed={active}
      sx={{
        width: 30, height: 30, p: 0, borderRadius: '50%', cursor: 'pointer',
        bgcolor: value, border: '2px solid', borderColor: active ? 'text.primary' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `border-color ${motion.fast}ms ${motion.ease}`,
        '&:focus-visible': { outline: `2px solid ${value}`, outlineOffset: 2 },
      }}
    >
      {active && <CheckIcon sx={{ fontSize: 15, color: '#fff' }} />}
    </Box>
  );
}

function TypeChoice({ options, value, onChange, tone }) {
  return (
    <Box role="group" aria-label="Transaction type" sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Box
            key={opt.id}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            sx={{
              px: 1.75, py: 0.7, borderRadius: `${radius.pill}px`, cursor: 'pointer',
              font: 'inherit', fontSize: 13, fontWeight: 600,
              border: '1px solid', borderColor: active ? `${tone}66` : 'divider',
              bgcolor: active ? `${tone}1f` : 'transparent',
              color: active ? 'text.primary' : 'text.secondary',
              transition: `background-color ${motion.fast}ms ${motion.ease}, border-color ${motion.fast}ms ${motion.ease}`,
              '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 2 },
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * One dialog for a category and for a tag.
 *
 * Both used to have their own near-identical stock MUI dialog: a floating
 * label textfield, a native colour input, and a chip preview stuck in a grid
 * cell. This is the same shape as the split composer — tinted hero header,
 * hairline, quiet body — so the page's dialogs feel like one family (§7), and
 * the header *is* the preview: the icon well, the tint and the typed name all
 * carry the chosen colour live, so there is nothing to preview separately.
 *
 * Reduced motion is handled by MUI's own transition plus the press springs,
 * which no-op under `prefers-reduced-motion`.
 */
export default function ActivityLabelDialog({
  open, kind = 'category', editing, data = {}, saving, onClose, onChange, onSave,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isCategory = kind === 'category';
  const tone = data.color || (isCategory ? accents.violet : accents.amber);
  const Icon = isCategory ? CategoryIcon : TagIcon;
  const nameRef = React.useRef(null);
  const hairline = colorRole.hairline[theme.palette.mode];

  const canSave = !!String(data.name || '').trim();

  const submit = (e) => {
    e.preventDefault();
    if (canSave && !saving) onSave();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
      TransitionComponent={fullScreen ? SlideUp : undefined}
      aria-label={`${editing ? 'Edit' : 'New'} ${kind}`}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : `${radius.xl}px`,
          overflow: 'hidden', bgcolor: 'background.default', backgroundImage: 'none',
        },
      }}
    >
      <Box component="form" onSubmit={submit}>
        {/* ── Hero header: it is the live preview ──────────────────────── */}
        <Box
          sx={{
            position: 'relative', px: 2.5,
            pt: fullScreen ? 'calc(env(safe-area-inset-top) + 12px)' : 2.5,
            pb: 2.5,
            background: `linear-gradient(168deg, ${tone}1f 0%, transparent 62%)`,
            transition: `background ${motion.normal}ms ${motion.ease}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Close"
              sx={{
                ml: -0.5, width: 34, height: 34, borderRadius: `${radius.md}px`,
                border: '1px solid', borderColor: hairline, color: 'text.secondary',
              }}
            >
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: 'text.secondary' }}>
              {editing ? `Edit ${kind}` : `New ${kind}`}
            </Typography>
            <Box sx={{ width: 34 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              aria-hidden
              onClick={() => nameRef.current?.focus()}
              sx={{
                width: 44, height: 44, borderRadius: `${radius.md}px`, flexShrink: 0,
                bgcolor: `${tone}26`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `background-color ${motion.normal}ms ${motion.ease}`,
              }}
            >
              <Icon sx={{ color: tone, fontSize: 22, transition: `color ${motion.normal}ms ${motion.ease}` }} />
            </Box>
            <InputBase
              inputRef={nameRef}
              autoFocus
              value={data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={isCategory ? 'Groceries' : 'goa-trip'}
              inputProps={{ 'aria-label': `${kind} name`, maxLength: 60 }}
              sx={{
                flex: 1, minWidth: 0,
                '& input': {
                  fontFamily: type.displayFamily, fontSize: 'clamp(1.4rem, 6vw, 1.75rem)',
                  fontWeight: 650, letterSpacing: '-0.025em', p: 0, color: 'text.primary',
                },
                '& input::placeholder': { color: 'text.disabled', opacity: 1 },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ height: '1px', bgcolor: hairline }} />

        {/* ── Body ────────────────────────────────────────────────────── */}
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography
                component="label"
                sx={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', mb: 1.25 }}
              >
                Colour
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {SWATCHES.map((c) => (
                  <Swatch key={c} value={c} active={String(data.color).toLowerCase() === c.toLowerCase()} onSelect={(v) => onChange({ color: v })} />
                ))}
                <Box
                  component="label"
                  sx={{
                    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px dashed', borderColor: 'text.disabled',
                    fontSize: 15, color: 'text.disabled',
                    '&:focus-within': { outline: `2px solid ${tone}`, outlineOffset: 2 },
                  }}
                >
                  +
                  <Box
                    component="input"
                    type="color"
                    aria-label="Pick a custom colour"
                    value={data.color || tone}
                    onChange={(e) => onChange({ color: e.target.value })}
                    sx={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
                  />
                </Box>
              </Box>
            </Box>

            {isCategory && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  label="What belongs here (optional)"
                  value={data.description || ''}
                  onChange={(e) => onChange({ description: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: `${radius.md}px`,
                      '& fieldset': { borderColor: hairline },
                      '&.Mui-focused fieldset': { borderColor: `${tone}88`, borderWidth: 1 },
                    },
                  }}
                />
                <Box>
                  <Typography
                    sx={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', mb: 1.25 }}
                  >
                    Used for
                  </Typography>
                  <TypeChoice
                    tone={tone}
                    value={data.transactionType || 'expense'}
                    onChange={(v) => onChange({ transactionType: v })}
                    options={[
                      { id: 'expense', label: 'Expenses' },
                      { id: 'income', label: 'Income' },
                      { id: 'both', label: 'Both' },
                    ]}
                  />
                </Box>
              </>
            )}
          </Stack>
        </Box>

        {/* ── Commit ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            px: 2.5, py: 2, display: 'flex', gap: 1.25, justifyContent: 'flex-end',
            borderTop: '1px solid', borderColor: hairline,
            pb: fullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2,
          }}
        >
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: `${radius.pill}px` }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSave || saving}
            sx={{ borderRadius: `${radius.pill}px`, px: 2.5 }}
          >
            {saving ? 'Saving…' : editing ? 'Save' : `Add ${kind}`}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
