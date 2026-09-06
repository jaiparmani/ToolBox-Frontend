import React from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AnimatePresence, motion as framerMotion, useReducedMotion } from 'framer-motion';
import usePressSpring from './usePressSpring';
import { feedback } from './feedback';
import { accents, type, motion, radius, color } from '../../theme/tokens';

const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' };
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Critically damped — the pill arrives at the new segment without bouncing past it. */
const PILL_SPRING = { type: 'spring', stiffness: 520, damping: 40 };

const monthLabelSx = { ...num, fontSize: 13, fontWeight: 600, textAlign: 'center', color: 'text.primary', whiteSpace: 'nowrap' };

/**
 * Turn a scope descriptor into the {dateFrom, dateTo} the existing fetch wants.
 * Dates are formatted in local time so a month boundary isn't dragged across by
 * a UTC offset. 'all' clears the range, restoring the un-scoped list.
 */
export function scopeRange(scope) {
  if (!scope || scope.mode === 'all') return { dateFrom: '', dateTo: '' };
  if (scope.mode === 'last30') {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }
  // month
  const from = new Date(scope.year, scope.month, 1);
  const to = new Date(scope.year, scope.month + 1, 0);
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

/** A scope descriptor for the month containing today. */
export function currentMonthScope() {
  const now = new Date();
  return { mode: 'month', year: now.getFullYear(), month: now.getMonth() };
}

const SEGMENTS = [
  { id: 'month', label: 'This month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'all', label: 'All' },
];

/**
 * One segment. Press feedback fires on pointer-DOWN (Apple Design §1) and the
 * scale lives on an inner wrapper so the sliding pill is measured against an
 * untransformed box.
 */
function Segment({ seg, active, reduce, onSelect, onKeyDown, itemRef }) {
  const press = usePressSpring({ pressScale: 0.94 });
  return (
    <Box
      component="button"
      type="button"
      role="tab"
      ref={itemRef}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      {...press.bindEvents}
      sx={{
        position: 'relative', border: 'none', background: 'transparent', font: 'inherit',
        px: { xs: 1.5, sm: 2 }, py: { xs: 0.85, sm: 0.85 },
        borderRadius: radius.pill, cursor: 'pointer',
        fontSize: { xs: 12.5, sm: 13 }, fontWeight: active ? 650 : 500,
        letterSpacing: '-0.01em', whiteSpace: 'nowrap', userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        color: active ? 'text.primary' : 'text.secondary',
        transition: `color ${motion.fast}ms ${motion.ease}`,
        '&:hover': { color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
      }}
    >
      {/* The active state is ONE pill that physically travels between segments
          (Apple Design §7) rather than a background that blinks off here and on
          there. Reduced motion gets the same pill, placed instantly. */}
      {active && (
        <Box
          component={reduce ? 'div' : framerMotion.div}
          layoutId={reduce ? undefined : 'activity-scope-pill'}
          transition={reduce ? undefined : PILL_SPRING}
          aria-hidden
          sx={{
            position: 'absolute', inset: 0, zIndex: 0, borderRadius: radius.pill,
            bgcolor: 'background.paper',
            boxShadow: (t) => t.palette.mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.4)'
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}
        />
      )}
      <Box ref={press.ref} sx={{ position: 'relative', zIndex: 1 }}>{seg.label}</Box>
    </Box>
  );
}

/** A stepper arrow that answers on press instead of on release. */
function StepButton({ onClick, disabled, label, children }) {
  const press = usePressSpring({ pressScale: 0.86, disabled });
  return (
    <IconButton
      size="small"
      ref={press.ref}
      {...press.bindEvents}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      sx={{ width: 32, height: 32, WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </IconButton>
  );
}

/**
 * Restrained scope control: a monochrome segmented pill (This month / Last 30 /
 * All) with month prev/next stepping when a month is in view. Selecting a
 * segment or stepping a month calls onScope with a fresh descriptor; the page
 * maps it through scopeRange into the same date filter the list already reads,
 * so the SPENT/INCOME/BALANCE header and the timeline move together.
 *
 * Motion notes: the active mark is a shared-layout pill that slides between
 * segments (§7), every control responds on pointer-down (§1), and stepping a
 * month moves the label in the direction you stepped — back slides in from the
 * left, forward from the right (§7/§8), so the control tells you which way time
 * just went. All of it collapses to instant state changes under reduced motion.
 */
export default function ActivityScopeBar({ scope, onScope }) {
  const reduce = useReducedMotion();
  const inMonth = scope?.mode === 'month';
  const now = new Date();
  const atCurrentMonth = inMonth && scope.year === now.getFullYear() && scope.month === now.getMonth();
  const itemRefs = React.useRef([]);
  // Which way the last month step went, so the label can enter from that side.
  const [stepDir, setStepDir] = React.useState(0);

  const activeIndex = Math.max(0, SEGMENTS.findIndex((s) => s.id === scope?.mode));

  const pick = (id) => {
    if (id === scope?.mode) return;
    feedback('snap');
    if (id === 'month') onScope(currentMonthScope());
    else if (id === 'last30') onScope({ mode: 'last30' });
    else onScope({ mode: 'all' });
  };

  const onKeyDown = (e) => {
    const last = SEGMENTS.length - 1;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = activeIndex >= last ? 0 : activeIndex + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = activeIndex <= 0 ? last : activeIndex - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    pick(SEGMENTS[next].id);
    itemRefs.current[next]?.focus();
  };

  const stepMonth = (delta) => {
    setStepDir(delta);
    const d = new Date(scope.year, scope.month + delta, 1);
    onScope({ mode: 'month', year: d.getFullYear(), month: d.getMonth() });
  };

  const monthKey = inMonth ? `${scope.year}-${scope.month}` : '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
      {/* segmented pill — taller touch targets, distinct active state */}
      <Box
        role="tablist"
        aria-label="Date scope"
        sx={{
          display: 'inline-flex', p: '3px', borderRadius: radius.pill,
          border: '1px solid', borderColor: 'divider',
          bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
        }}
      >
        {SEGMENTS.map((seg, i) => (
          <Segment
            key={seg.id}
            seg={seg}
            active={seg.id === scope?.mode}
            reduce={reduce}
            onSelect={() => pick(seg.id)}
            onKeyDown={onKeyDown}
            itemRef={(node) => { itemRefs.current[i] = node; }}
          />
        ))}
      </Box>

      {/* month stepper — wraps gracefully on narrow screens */}
      {inMonth && (
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.25,
            border: '1px solid', borderColor: 'divider', borderRadius: radius.pill,
            bgcolor: 'background.paper', pl: 0.5, pr: 0.5,
            flexShrink: 0, minWidth: 0,
          }}
        >
          <StepButton onClick={() => stepMonth(-1)} label="Previous month">
            <ChevronLeftIcon fontSize="small" />
          </StepButton>

          {/* aria-live so the month is announced even though only the visual
              label moves; the moving copy itself is hidden from the reader so
              enter/exit pairs aren't read twice. */}
          <Box
            aria-live="polite"
            sx={{
              position: 'relative', minWidth: 76, height: 20, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Box component="span" className="sr-only" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
              {MONTHS[scope.month]} {scope.year}
            </Box>
            {reduce ? (
              <Box aria-hidden sx={{ ...monthLabelSx }}>{MONTHS[scope.month]} {scope.year}</Box>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                <Box
                  key={monthKey}
                  aria-hidden
                  component={framerMotion.div}
                  initial={{ opacity: 0, x: stepDir * 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: stepDir * -14 }}
                  transition={{ type: 'spring', stiffness: 560, damping: 44 }}
                  sx={{ position: 'absolute', ...monthLabelSx }}
                >
                  {MONTHS[scope.month]} {scope.year}
                </Box>
              </AnimatePresence>
            )}
          </Box>

          <StepButton onClick={() => stepMonth(1)} disabled={atCurrentMonth} label="Next month">
            <ChevronRightIcon fontSize="small" />
          </StepButton>
        </Box>
      )}
    </Box>
  );
}
