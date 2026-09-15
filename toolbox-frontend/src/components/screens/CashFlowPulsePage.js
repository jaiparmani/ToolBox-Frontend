/**
 * Pulse — a computational portrait of spending behaviour.
 *
 * The field fills the viewport. Bezel instruments sit at the corners:
 *   top-left      identity + active lens
 *   top-right     live state readout (spending in window / focused item)
 *   right edge    LENS column (desktop) / bottom pill bar (mobile)
 *   bottom-left   SCALE ladder
 *   bottom-centre touch prompt → minimal legend after engagement
 *   bottom-right  DATA & INTERPRETATION disclosure
 *
 * Design principle: field = spectacle, chrome = clarity.
 * Every bezel element uses frosted glass so it reads against any field state.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { getExpenses } from '../rest/expenseTrackerApis';
import { EmptyState } from '../ui';
import { buildSpendingField } from '../ui/spendingField';
import SpendingFieldView, { LENSES, SCALES } from '../ui/SpendingFieldView';
import { moneySmart } from '../ui/money';
import { accents } from '../../theme/tokens';

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';
const FETCH_DAYS = 120;

const iso = (d) => d.toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// Frosted glass panel — the shared base for every bezel block.
const GLASS = {
  background: 'rgba(4,5,10,0.70)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
  border: '1px solid rgba(100,210,255,0.10)',
  borderRadius: '12px',
};

export default function CashFlowPulsePage() {
  const [expenses, setExpenses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [lens, setLens] = useState('HABITS');
  const [scale, setScale] = useState('MONTH');
  const [focus, setFocus] = useState(null);
  const [pull, setPull] = useState(null);
  const [touched, setTouched] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today.getTime() - FETCH_DAYS * 86400000);
    getExpenses({ dateFrom: iso(from), dateTo: iso(today), pageSize: 500, ordering: 'date' })
      .then(d => setExpenses(d.results || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const transactions = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .filter(e => (e.type || 'expense') !== 'income')
      .map(e => ({
        amount: Math.abs(Number(e.amount) || 0),
        date: typeof e.date === 'string' ? e.date.slice(0, 10)
          : e.date instanceof Date ? e.date.toISOString().slice(0, 10) : '',
        description: e.description || e.note || e.title || '',
        category: e.category || { name: 'Uncategorised' },
      }))
      .filter(e => e.amount > 0 && e.date);
  }, [expenses]);

  const field = useMemo(() => buildSpendingField(transactions), [transactions]);

  const windowInfo = useMemo(() => {
    if (!field) return null;
    const days = (SCALES.find(s => s.id === scale) || SCALES[1]).days;
    const startDay = field.maxDay - (days - 1);
    const inWindow = field.events.filter(e => e.dayNum >= startDay);
    const toDate = (dn) => iso(new Date(dn * 86400000));
    return {
      from: prettyDate(toDate(startDay)),
      to: prettyDate(toDate(field.maxDay)),
      days,
      events: inWindow.length,
      spent: inWindow.reduce((a, e) => a + e.amount, 0),
      outliers: inWindow.filter(e => e.isOutlier).length,
      covered: inWindow.length
        ? Math.min(field.maxDay - Math.min(...inWindow.map(e => e.dayNum)) + 1, days)
        : 0,
    };
  }, [field, scale]);

  const activeLens = LENSES.find(l => l.id === lens) || LENSES[0];
  const hasData = !!field;
  const engage = useCallback(() => setTouched(true), []);

  useEffect(() => {
    if (!hasData) return;
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (aboutOpen) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= LENSES.length) { setLens(LENSES[n - 1].id); setTouched(true); return; }
      if (e.key === '[' || e.key === ']') {
        const i = SCALES.findIndex(s => s.id === scale);
        const next = e.key === ']' ? Math.min(i + 1, SCALES.length - 1) : Math.max(i - 1, 0);
        setScale(SCALES[next].id); setTouched(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasData, scale, aboutOpen]);

  return (
    <Box sx={{
      position: 'relative', bgcolor: '#04050a',
      mx: { xs: -1, sm: -2, md: -3 }, mt: -2, mb: -3,
      height: 'calc(100vh - 56px)', overflow: 'hidden',
    }}>
      {loading ? (
        <Boot />
      ) : hasData ? (
        <Box sx={{ position: 'absolute', inset: 0 }} onPointerDown={engage} onWheel={engage}>
          <SpendingFieldView
            field={field}
            lens={lens}
            scale={scale}
            onFocusChange={setFocus}
            onPullChange={setPull}
            height="100%"
          />

          {/* ── bezel ───────────────────────────────────────────────────── */}
          <Identity lens={activeLens} scale={scale} />
          <StateBlock field={field} windowInfo={windowInfo} pull={pull} focus={focus} />

          {/* Lens switcher: right column on desktop, pill bar on mobile */}
          <LensColumn value={lens} onChange={(v) => { setLens(v); setTouched(true); }} />
          <LensPillBar value={lens} onChange={(v) => { setLens(v); setTouched(true); }} />

          <ScaleLadder value={scale} onChange={(v) => { setScale(v); setTouched(true); }} />
          <BottomBar touched={touched} />
          <AboutTrigger onClick={() => setAboutOpen(true)} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title={failed ? 'The field is unreachable' : 'The field is empty'}
            description={failed
              ? 'Pulse could not load your spending history. Check your connection and try again.'
              : 'Log some spending and your field will form — every purchase becomes a body, every habit a lattice, every burst of spending a shockwave.'}
          />
        </Box>
      )}

      {aboutOpen && <AboutOverlay onClose={() => setAboutOpen(false)} />}
    </Box>
  );
}

/* ─── Bezel: Identity (top-left) ────────────────────────────────────────── */

function Identity({ lens, scale }) {
  return (
    <Box sx={{
      position: 'absolute', top: { xs: 12, sm: 18 }, left: { xs: 12, sm: 20 },
      pointerEvents: 'none', zIndex: 2,
    }}>
      <Box sx={{ ...GLASS, px: { xs: 1.75, sm: 2 }, py: { xs: 1.25, sm: 1.5 }, maxWidth: { xs: 200, sm: 300 } }}>
        {/* Brand line */}
        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 7, sm: 8 }, letterSpacing: '0.44em',
          color: 'rgba(180,200,235,0.45)', textTransform: 'uppercase', lineHeight: 1,
        }}>
          MONEY OS
        </Typography>

        {/* PULSE wordmark */}
        <Typography sx={{
          fontSize: { xs: 22, sm: 32 }, fontWeight: 200, letterSpacing: '0.16em',
          color: '#e8ecf5', lineHeight: 1, mt: 0.4, mb: 1,
        }}>
          PULSE
        </Typography>

        {/* Active lens pill */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          bgcolor: `${accents.cyan}18`, border: `1px solid ${accents.cyan}40`,
          borderRadius: '6px', px: 1, py: 0.4,
        }}>
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: accents.cyan, boxShadow: `0 0 6px ${accents.cyan}` }} />
          <Typography sx={{
            fontFamily: MONO, fontSize: { xs: 8, sm: 9 }, letterSpacing: '0.22em',
            color: accents.cyan, textTransform: 'uppercase', lineHeight: 1,
          }}>
            {lens.label}
          </Typography>
          <Typography sx={{
            fontFamily: MONO, fontSize: { xs: 7.5, sm: 8.5 }, letterSpacing: '0.18em',
            color: 'rgba(100,210,255,0.5)', lineHeight: 1,
          }}>
            · {scale}
          </Typography>
        </Box>

        {/* Lens blurb — human-readable in sans-serif */}
        <Typography sx={{
          fontSize: { xs: 11, sm: 12 }, color: 'rgba(200,218,245,0.65)',
          mt: 0.9, lineHeight: 1.45, letterSpacing: '0.01em',
          display: { xs: 'none', sm: 'block' },
        }}>
          {lens.blurb}
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── Bezel: State readout (top-right on desktop, below identity on mobile) ── */

// On narrow phones the state block tucks below the identity.
const STATE_POS = {
  top: { xs: 130, sm: 18 },
  right: { xs: 'auto', sm: 20 },
  left: { xs: 12, sm: 'auto' },
};

function StateBlock({ field, windowInfo, pull, focus }) {
  let label, amount, sub, subColor;

  if (pull) {
    label = 'SPENT HERE SO FAR';
    amount = moneySmart(pull.spent);
    sub = `${pull.label.toUpperCase()} · ${pull.shown}/${pull.visits} VISITS · SINCE ${pull.since}`;
  } else if (focus) {
    label = focus.category.toUpperCase();
    amount = moneySmart(focus.amount);
    sub = focus.isOutlier
      ? `${focus.ratioToTypical.toFixed(1)}× USUAL · ${focus.date}`
      : focus.isHabit ? `HABIT · ${focus.visits}× · ${focus.date}` : focus.date;
    subColor = focus.isOutlier ? accents.amber : undefined;
  } else if (windowInfo) {
    label = 'SPENT IN WINDOW';
    amount = moneySmart(windowInfo.spent);
    sub = `${windowInfo.events} PURCHASE${windowInfo.events === 1 ? '' : 'S'} · ${windowInfo.from} – ${windowInfo.to}`;
  } else {
    return null;
  }

  return (
    <Box sx={{
      position: 'absolute', ...STATE_POS, zIndex: 2,
      transition: 'opacity 400ms ease',
    }}>
      <Box sx={{
        ...GLASS, px: { xs: 1.75, sm: 2 }, py: { xs: 1.25, sm: 1.5 },
        textAlign: { xs: 'left', sm: 'right' },
        minWidth: { xs: 160, sm: 180 },
        border: pull || focus
          ? `1px solid ${accents.cyan}30`
          : '1px solid rgba(100,210,255,0.10)',
      }}>
        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 7.5, sm: 8.5 }, letterSpacing: '0.32em',
          color: 'rgba(180,200,235,0.5)', textTransform: 'uppercase', lineHeight: 1, mb: 0.6,
        }}>
          {label}
        </Typography>

        {/* The hero number — big, glowing, readable */}
        <Typography sx={{
          fontSize: { xs: 26, sm: 38 }, fontWeight: 250, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
          color: '#eef2fa',
          textShadow: `0 0 32px ${accents.cyan}55`,
        }}>
          {amount}
        </Typography>

        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 8, sm: 9 }, letterSpacing: '0.12em',
          color: subColor || 'rgba(180,200,235,0.5)', mt: 0.7, lineHeight: 1.4,
          textTransform: 'uppercase',
        }}>
          {sub}
        </Typography>

        {/* Signature tags — desktop only */}
        {!pull && !focus && field?.signature && (
          <Box sx={{ mt: 0.8, display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end' }}>
            {field.signature.slice(0, 3).map((tag) => (
              <Box key={tag} sx={{
                fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.18em', color: `${accents.cyan}99`,
                border: `1px solid ${accents.cyan}22`, borderRadius: '4px', px: 0.75, py: 0.25,
                textTransform: 'uppercase',
              }}>
                {tag}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─── Bezel: Lens column (desktop only, right edge) ─────────────────────── */

function LensColumn({ value, onChange }) {
  return (
    <Box
      role="radiogroup"
      aria-label="Field lens"
      sx={{
        position: 'absolute', right: { xs: 8, sm: 16 }, top: '50%', transform: 'translateY(-50%)',
        display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 1.25,
        alignItems: 'flex-end', zIndex: 2,
      }}
    >
      {LENSES.map((l, i) => {
        const on = l.id === value;
        return (
          <Box
            key={l.id}
            role="radio"
            aria-checked={on}
            aria-label={`${l.label} lens — ${l.blurb}`}
            tabIndex={0}
            onClick={() => onChange(l.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(l.id); } }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              outline: 'none', px: 1, py: 0.5, borderRadius: '6px',
              transition: 'background 200ms ease',
              '&:focus-visible': { outline: `1px solid ${accents.cyan}`, outlineOffset: 2 },
              '&:hover': { background: 'rgba(100,210,255,0.07)' },
            }}
          >
            <Typography sx={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.24em',
              color: on ? accents.cyan : 'rgba(180,200,235,0.45)',
              transition: 'color 200ms', textTransform: 'uppercase', userSelect: 'none',
              opacity: on ? 1 : 0.7,
            }}>
              {l.label}
            </Typography>
            <Box sx={{
              width: on ? 28 : 10, height: on ? 2 : 1,
              bgcolor: on ? accents.cyan : 'rgba(180,200,235,0.3)',
              boxShadow: on ? `0 0 8px ${accents.cyan}` : 'none',
              transition: 'width 280ms cubic-bezier(0.32,0.72,0,1), background-color 200ms',
              flexShrink: 0,
            }} />
            <Typography sx={{
              fontFamily: MONO, fontSize: 7.5, color: 'rgba(180,200,235,0.25)',
              width: 8, textAlign: 'right', userSelect: 'none',
            }}>
              {i + 1}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── Bezel: Lens pill bar (mobile only, bottom) ────────────────────────── */

function LensPillBar({ value, onChange }) {
  return (
    <Box
      role="radiogroup"
      aria-label="Field lens"
      sx={{
        position: 'absolute',
        bottom: { xs: 60, sm: 'auto' },
        left: 0, right: 0,
        display: { xs: 'flex', sm: 'none' },
        justifyContent: 'center',
        gap: 0.75, px: 1.5, zIndex: 2,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {LENSES.map((l) => {
        const on = l.id === value;
        return (
          <Box
            key={l.id}
            role="radio"
            aria-checked={on}
            aria-label={`${l.label} lens`}
            tabIndex={0}
            onClick={() => onChange(l.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(l.id); } }}
            sx={{
              flexShrink: 0,
              px: 1.25, py: 0.75,
              borderRadius: '20px',
              border: `1px solid ${on ? accents.cyan : 'rgba(100,210,255,0.18)'}`,
              background: on ? `${accents.cyan}20` : 'rgba(4,5,10,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: 'pointer',
              transition: 'background 200ms ease, border-color 200ms ease',
              outline: 'none',
              '&:focus-visible': { outline: `1px solid ${accents.cyan}`, outlineOffset: 2 },
              minHeight: 34, display: 'flex', alignItems: 'center',
            }}
          >
            <Typography sx={{
              fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.2em',
              color: on ? accents.cyan : 'rgba(180,200,235,0.55)',
              textTransform: 'uppercase', userSelect: 'none',
              transition: 'color 200ms',
            }}>
              {l.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── Bezel: Scale ladder (bottom-left) ─────────────────────────────────── */

function ScaleLadder({ value, onChange }) {
  return (
    <Box
      role="radiogroup"
      aria-label="Time scale"
      sx={{
        position: 'absolute', left: { xs: 10, sm: 20 }, bottom: { xs: 14, sm: 20 },
        display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1 }, zIndex: 2,
      }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.3em',
        color: 'rgba(180,200,235,0.35)', mr: 0.5, pb: 0.5,
        display: { xs: 'none', sm: 'block' },
      }}>
        SCALE
      </Typography>
      {SCALES.map((s, i) => {
        const on = s.id === value;
        return (
          <Box
            key={s.id}
            role="radio"
            aria-checked={on}
            aria-label={`${s.label} — last ${s.days} days`}
            tabIndex={0}
            onClick={() => onChange(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(s.id); } }}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
              cursor: 'pointer', outline: 'none',
              minWidth: { xs: 38, sm: 32 }, minHeight: { xs: 44, sm: 0 },
              justifyContent: 'flex-end',
              '&:focus-visible': { outline: `1px solid ${accents.cyan}`, borderRadius: '4px' },
            }}
          >
            <Typography sx={{
              fontFamily: MONO, fontSize: { xs: 8.5, sm: 9 }, letterSpacing: '0.18em',
              color: on ? accents.cyan : 'rgba(180,200,235,0.5)',
              transition: 'color 200ms', textTransform: 'uppercase', userSelect: 'none',
            }}>
              {s.label}
            </Typography>
            {/* Notch height encodes how far back this scale stands */}
            <Box sx={{
              width: on ? 2 : 1, height: 8 + i * 5,
              bgcolor: on ? accents.cyan : 'rgba(180,200,235,0.3)',
              boxShadow: on ? `0 0 8px ${accents.cyan}` : 'none',
              transition: 'background-color 200ms, width 200ms',
            }} />
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── Bezel: Bottom bar (touch prompt → legend after engagement) ─────────── */

function BottomBar({ touched }) {
  return (
    <Box sx={{
      position: 'absolute', bottom: { xs: 104, sm: 22 }, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none', px: 2, zIndex: 2,
    }}>
      {/* Touch prompt — visible before engagement, fades out */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: touched ? 0 : 1,
        transition: 'opacity 800ms cubic-bezier(0.32,0.72,0,1)',
        pointerEvents: 'none',
      }}>
        <Box sx={{
          ...GLASS, px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', gap: 1.25,
        }}>
          {/* Pulsing dot */}
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: accents.cyan, flexShrink: 0,
            boxShadow: `0 0 10px ${accents.cyan}`,
            '@keyframes pulse': {
              '0%,100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.4, transform: 'scale(0.7)' },
            },
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <Typography sx={{
            fontFamily: MONO, fontSize: { xs: 8.5, sm: 10 }, letterSpacing: '0.28em',
            color: 'rgba(200,218,245,0.75)', textTransform: 'uppercase',
          }}>
            Drag to orbit · Scroll to zoom · Tap a habit to explore
          </Typography>
        </Box>
      </Box>

      {/* Minimal legend — appears after engagement */}
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.26em',
        color: 'rgba(180,200,235,0.9)', textTransform: 'uppercase', textAlign: 'center',
        opacity: touched ? 0.2 : 0,
        transition: 'opacity 900ms cubic-bezier(0.32,0.72,0,1)',
        display: { xs: 'none', md: 'block' },
        pointerEvents: 'none',
      }}>
        drag · orbit &nbsp;|&nbsp; scroll · zoom &nbsp;|&nbsp; tap a habit · unfurl &nbsp;|&nbsp; 1–6 lens &nbsp;|&nbsp; [ ] scale
      </Typography>
    </Box>
  );
}

/* ─── Bezel: About trigger (bottom-right) ────────────────────────────────── */

function AboutTrigger({ onClick }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label="About Pulse — data and interpretation"
      sx={{
        position: 'absolute', right: { xs: 10, sm: 20 }, bottom: { xs: 14, sm: 20 },
        display: 'flex', alignItems: 'center', gap: 0.75,
        minHeight: { xs: 36, sm: 0 }, minWidth: { xs: 36, sm: 0 },
        background: 'none', border: 'none', p: 0.75, cursor: 'pointer',
        opacity: 0.5, transition: 'opacity 250ms',
        zIndex: 2,
        '&:hover': { opacity: 1 },
        '&:focus-visible': { opacity: 1, outline: `1px solid ${accents.cyan}`, outlineOffset: 3, borderRadius: '4px' },
      }}
    >
      <Box sx={{
        width: 16, height: 16, borderRadius: '50%',
        border: '1px solid rgba(180,200,235,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO, fontSize: 9.5, color: 'rgba(200,215,240,0.85)', lineHeight: 1, flexShrink: 0,
      }}>
        i
      </Box>
      <Typography sx={{
        fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.28em',
        color: 'rgba(180,200,235,0.85)', textTransform: 'uppercase',
        display: { xs: 'none', sm: 'block' },
      }}>
        Data &amp; Interpretation
      </Typography>
    </Box>
  );
}

/* ─── Disclosure overlay ─────────────────────────────────────────────────── */

const DISCLOSURE = [
  {
    k: 'WHAT PULSE IS',
    v: `Pulse is a computational portrait of your spending — how often you buy, how much, where, and in what pattern. It reflects transactions you have already logged. It carries no income, no balance, and no live connection to any bank.`,
  },
  {
    k: 'DATA COMPLETENESS',
    v: `Every figure here is derived from the spending transactions present in Money OS for the selected window. If purchases are missing, delayed, duplicated, or miscategorised, the field will reflect that. Accuracy depends entirely on the completeness of your imported and manually entered data.`,
  },
  {
    k: 'HOW FIGURES ARE DERIVED',
    v: `Category shares, purchase frequency, recurring habits and outlier flags are computed from your own history using simple statistical rules — for example, a purchase is flagged unusual when it sits far outside the typical range for its category. Habits are merchants you have returned to at least twice. Dragging one reveals your actual past visits and what they have cost so far — this is history, never a projection of what is still to come.`,
  },
  {
    k: 'NOT FINANCIAL ADVICE',
    v: `Nothing in Pulse is financial, investment, tax or legal advice. Patterns and figures shown are descriptive only — a picture of what you have already spent — and should not be relied upon as a recommendation to spend, save, or avoid any purchase.`,
  },
  {
    k: 'MAY DIFFER FROM YOUR STATEMENTS',
    v: `Totals shown here reflect only the transactions recorded in Money OS, and may differ from your bank or card statements due to timing, refunds, duplicate entries, or purchases that were never logged. Treat your own statements as the authoritative record of what you actually spent.`,
  },
];

function AboutOverlay({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 },
        bgcolor: 'rgba(3,4,9,0.82)', backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        animation: 'fadeIn 240ms cubic-bezier(0.32,0.72,0,1)',
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="pulse-about-title"
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'relative', width: '100%', maxWidth: 660,
          maxHeight: '82vh', overflowY: 'auto',
          px: { xs: 3, sm: 5 }, py: { xs: 3.5, sm: 4.5 },
          bgcolor: 'rgba(6,8,16,0.94)',
          border: `1px solid rgba(100,210,255,0.14)`,
          borderRadius: '16px',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        }}
      >
        {/* Corner brackets */}
        {[
          { top: 12, left: 12, borderTop: `1px solid ${accents.cyan}`, borderLeft: `1px solid ${accents.cyan}` },
          { top: 12, right: 12, borderTop: `1px solid ${accents.cyan}`, borderRight: `1px solid ${accents.cyan}` },
          { bottom: 12, left: 12, borderBottom: `1px solid ${accents.cyan}`, borderLeft: `1px solid ${accents.cyan}` },
          { bottom: 12, right: 12, borderBottom: `1px solid ${accents.cyan}`, borderRight: `1px solid ${accents.cyan}` },
        ].map((p, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: 14, height: 14, pointerEvents: 'none',
            opacity: 0.45, ...p,
          }} />
        ))}

        <Typography sx={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.44em', color: `${accents.cyan}cc` }}>
          MONEY OS · PULSE
        </Typography>
        <Typography
          id="pulse-about-title"
          sx={{ fontSize: 24, fontWeight: 250, letterSpacing: '0.02em', color: '#eef2fa', mt: 0.75, mb: 3 }}
        >
          Data &amp; Interpretation
        </Typography>

        {DISCLOSURE.map(({ k, v }) => (
          <Box key={k} sx={{ mb: 2.75 }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.26em',
              color: `${accents.cyan}cc`, mb: 0.9, textTransform: 'uppercase',
            }}>
              {k}
            </Typography>
            <Typography sx={{
              fontSize: 13.5, lineHeight: 1.72, color: 'rgba(214,224,244,0.82)', letterSpacing: '0.005em',
            }}>
              {v}
            </Typography>
          </Box>
        ))}

        <Box sx={{ height: '1px', bgcolor: `${accents.cyan}20`, my: 2.5 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: 9, color: 'rgba(180,200,235,0.38)', letterSpacing: '0.14em' }}>
            DESCRIPTIVE ANALYTICS · NOT ADVICE
          </Typography>
          <Box
            component="button"
            ref={closeRef}
            onClick={onClose}
            sx={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.26em', textTransform: 'uppercase',
              color: accents.cyan, bgcolor: 'transparent',
              border: `1px solid ${accents.cyan}44`, px: 2.5, py: 1, cursor: 'pointer',
              borderRadius: '6px',
              transition: 'background-color 200ms, border-color 200ms',
              '&:hover': { bgcolor: `${accents.cyan}14`, borderColor: accents.cyan },
              '&:focus-visible': { outline: `1px solid ${accents.cyan}`, outlineOffset: 3 },
            }}
          >
            Close
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Boot (loading state) ───────────────────────────────────────────────── */

function Boot() {
  const shouldReduceMotion = useReducedMotion();

  const FULL_TEXT = 'READING PURCHASE HISTORY';
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) { clearInterval(id); setTypingDone(true); }
    }, 35);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typingDone) { setCursorVisible(false); return; }
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, [typingDone]);

  const particles = useMemo(() =>
    Array.from({ length: 35 }, (_, idx) => ({
      id: idx,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.12 + Math.random() * 0.18,
      dx: (Math.random() - 0.5) * 40,
      dy: (Math.random() - 0.5) * 40,
      duration: 15 + Math.random() * 10,
    }))
  , []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      style={{
        height: '100%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#04050a',
      }}
    >
      {/* Constellation */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {particles.map(p => (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: 2, height: 2, borderRadius: '50%', background: '#ffffff',
              opacity: shouldReduceMotion ? p.opacity * 0.6 : p.opacity,
            }}
            animate={shouldReduceMotion ? {} : { x: [0, p.dx, 0], y: [0, p.dy, 0] }}
            transition={shouldReduceMotion ? {} : {
              duration: p.duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut',
            }}
          />
        ))}
      </Box>

      {/* Radial glow */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 50% 50%, ${accents.cyan}0d, transparent 60%)`,
      }} />

      {/* Spinner + typewriter */}
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Box sx={{ width: 56, height: 56, mx: 'auto', mb: 3, filter: `drop-shadow(0 0 10px ${accents.cyan})` }}>
          <motion.svg
            width="56" height="56" viewBox="0 0 56 56"
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={shouldReduceMotion ? {} : { duration: 2.2, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="28" cy="28" r="24"
              fill="none" stroke={accents.cyan} strokeWidth="1.5"
              strokeLinecap="round" strokeDasharray="60 96"
            />
          </motion.svg>
        </Box>
        <Typography sx={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em',
          color: accents.cyan, opacity: 0.65, textTransform: 'uppercase',
          minHeight: '1.5em',
        }}>
          {displayed}
          {!typingDone && (
            <Box component="span" sx={{ opacity: cursorVisible ? 1 : 0, transition: 'opacity 80ms', ml: '1px' }}>
              |
            </Box>
          )}
        </Typography>
      </Box>
    </motion.div>
  );
}
