/**
 * Pulse — the Money OS financial instrument.
 *
 * The field fills the viewport. Everything else is bezel: corner-anchored
 * instrument blocks rather than a page header or a row of cards.
 *
 *   top-left      identity + what you are looking at + the window
 *   top-right     live financial state
 *   right edge    LENS column — six interpretations of the same field
 *   bottom-left   SCALE ladder — how far back you stand
 *   bottom-centre control legend, retreats once you engage
 *   bottom-right  DATA & INTERPRETATION disclosure
 *
 * Chrome sits at low opacity and lifts on hover, so at rest the field is the
 * only loud thing on screen.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { getExpenses, getExpenseSummary } from '../rest/expenseTrackerApis';
import { EmptyState } from '../ui';
import FinancialConstellation, { deriveField, LENSES, SCALES } from '../ui/FinancialConstellation';
import { moneySmart } from '../ui/money';
import { accents } from '../../theme/tokens';

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';
const FETCH_DAYS = 120;   // deep enough to feed the QUARTER scale

const iso = (d) => d.toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function CashFlowPulsePage() {
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [lens, setLens] = useState('GRAVITY');
  const [scale, setScale] = useState('MONTH');
  const [focus, setFocus] = useState(null);
  const [projection, setProjection] = useState(null);
  const [touched, setTouched] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today.getTime() - FETCH_DAYS * 86400000);
    Promise.all([
      getExpenses({ dateFrom: iso(from), dateTo: iso(today), pageSize: 500, ordering: 'date' })
        .then(d => d.results || []),
      getExpenseSummary({ dateFrom: iso(from), dateTo: iso(today) }),
    ])
      .then(([txns, sum]) => { setExpenses(txns); setSummary(sum); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const transactions = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .filter(e => (e.type || 'expense') !== 'income')
      .map(e => ({
        id: e.id,
        amount: Math.abs(Number(e.amount) || 0),
        date: typeof e.date === 'string' ? e.date.slice(0, 10)
          : e.date instanceof Date ? e.date.toISOString().slice(0, 10) : '',
        type: 'expense',
        description: e.description || e.note || e.title || '',
        category: e.category || { name: 'Uncategorized' },
      }))
      .filter(e => e.amount > 0 && e.date);
  }, [expenses]);

  const field = useMemo(
    () => deriveField(transactions, summary?.netBalance ?? 0, summary?.totalIncome ?? 0),
    [transactions, summary]);

  // The window the active SCALE is showing — drives the orientation readout.
  // The dates reported are the window itself, not the extent of the data
  // inside it, so the label always agrees with the space the field occupies.
  const windowInfo = useMemo(() => {
    if (!field) return null;
    const days = (SCALES.find(s => s.id === scale) || SCALES[1]).days;
    const startDay = field.maxDay - (days - 1);
    const inWindow = field.stars.filter(s => s.dayNum >= startDay);
    const toDate = (dn) => iso(new Date(dn * 86400000));
    return {
      from: prettyDate(toDate(startDay)),
      to: prettyDate(toDate(field.maxDay)),
      days,
      events: inWindow.length,
      spent: inWindow.reduce((a, s) => a + s.amt, 0),
      anomalies: inWindow.filter(s => s.isAnomaly).length,
      // How much of the window actually contains recorded activity.
      covered: inWindow.length
        ? Math.min(field.maxDay - Math.min(...inWindow.map(s => s.dayNum)) + 1, days)
        : 0,
    };
  }, [field, scale]);

  const activeLens = LENSES.find(l => l.id === lens) || LENSES[0];
  const hasData = !!field;

  const engage = useCallback(() => setTouched(true), []);

  // Keyboard: 1–6 pick a lens, [ and ] step the scale.
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
          <FinancialConstellation
            field={field}
            lens={lens}
            scale={scale}
            onFocusChange={setFocus}
            onProjectionChange={setProjection}
            height="100%"
          />

          {/* ── bezel ─────────────────────────────────────────────────── */}
          <Identity lens={activeLens} windowInfo={windowInfo} scale={scale} />
          <StateBlock summary={summary} windowInfo={windowInfo} projection={projection} focus={focus} />
          <LensColumn value={lens} onChange={(v) => { setLens(v); setTouched(true); }} />
          <ScaleLadder value={scale} onChange={(v) => { setScale(v); setTouched(true); }} />
          <Legend dim={touched} />
          <AboutTrigger onClick={() => setAboutOpen(true)} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title={failed ? 'The field is unreachable' : 'The field is empty'}
            description={failed
              ? 'Pulse could not load your transaction history. Check your connection and try again.'
              : 'Log spending and your field will form — every transaction becomes a star, every category a gravity well, every subscription a line between them.'}
          />
        </Box>
      )}

      {aboutOpen && <AboutOverlay onClose={() => setAboutOpen(false)} />}
    </Box>
  );
}

/* ─── Bezel pieces ───────────────────────────────────────────────────────── */

// On phones the right edge belongs to the lens column, so the state block
// tucks under the identity instead of fighting it for the top-right corner.
const stateBlockPos = {
  top: { xs: 108, sm: 20 },
  right: { xs: 'auto', sm: 78 },
  left: { xs: 12, sm: 'auto' },
  textAlign: { xs: 'left', sm: 'right' },
};

const blockSx = {
  position: 'absolute', pointerEvents: 'none',
  opacity: 0.62, transition: 'opacity 420ms cubic-bezier(0.32,0.72,0,1)',
  '&:hover': { opacity: 1 },
};

function Rule({ w = 26 }) {
  return <Box sx={{ width: w, height: '1px', bgcolor: 'rgba(100,210,255,0.35)', my: 0.75 }} />;
}

function Identity({ lens, windowInfo, scale }) {
  return (
    <Box sx={{
      ...blockSx, top: { xs: 12, sm: 20 }, left: { xs: 12, sm: 24 },
      pointerEvents: 'auto', maxWidth: { xs: 190, sm: 340 },
    }}>
      <Typography sx={{ fontFamily: MONO, fontSize: { xs: 7.5, sm: 9 }, letterSpacing: '0.42em', color: 'rgba(180,200,235,0.5)' }}>
        MONEY OS
      </Typography>
      <Typography sx={{
        fontSize: { xs: 20, sm: 30 }, fontWeight: 200, letterSpacing: '0.14em',
        color: '#e8ecf5', lineHeight: 1.1, mt: 0.25,
      }}>
        PULSE
      </Typography>
      <Rule />
      <Typography sx={{ fontFamily: MONO, fontSize: { xs: 9, sm: 11 }, letterSpacing: '0.2em', color: accents.cyan }}>
        {lens.label.toUpperCase()} LENS · {scale}
      </Typography>
      <Typography sx={{
        fontSize: 12, color: 'rgba(200,214,240,0.68)', mt: 0.4, letterSpacing: '0.01em',
        display: { xs: 'none', sm: 'block' },
      }}>
        {lens.blurb}
      </Typography>
      {windowInfo && (
        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 8.5, sm: 10 }, color: 'rgba(180,200,235,0.45)',
          mt: 0.9, letterSpacing: '0.08em',
        }}>
          {windowInfo.from} — {windowInfo.to}
          <br />
          {windowInfo.events} EVENT{windowInfo.events === 1 ? '' : 'S'} IN FIELD
          {windowInfo.anomalies > 0 && ` · ${windowInfo.anomalies} ANOMALOUS`}
          {/* Say so when the window reaches back further than the data does,
              rather than letting empty space read as missing transactions. */}
          {windowInfo.events > 0 && windowInfo.covered < windowInfo.days && (
            <>
              <br />
              <Box component="span" sx={{ color: 'rgba(180,200,235,0.32)', display: { xs: 'none', sm: 'inline' } }}>
                RECORDED ACTIVITY SPANS {windowInfo.covered} OF {windowInfo.days} DAYS
              </Box>
            </>
          )}
        </Typography>
      )}
    </Box>
  );
}

function StateBlock({ summary, windowInfo, projection, focus }) {
  const net = summary?.netBalance ?? 0;
  // The block yields to whatever the user is currently interrogating.
  if (projection) {
    const span = projection.periods * projection.periodDays;
    const spanTxt = span >= 365 ? `${(span / 365).toFixed(1)} yrs`
      : span >= 60 ? `${Math.round(span / 30)} months` : `${span} days`;
    return (
      <Box sx={{ ...blockSx, ...stateBlockPos, opacity: 1 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: accents.cyan }}>
          PROJECTING
        </Typography>
        <Typography sx={{ fontSize: { xs: 21, sm: 30 }, fontWeight: 250, color: '#eef2fa', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
          {moneySmart(projection.total)}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(180,200,235,0.65)', letterSpacing: '0.08em' }}>
          {projection.label.toUpperCase()} · {projection.periods}× · {spanTxt}
        </Typography>
      </Box>
    );
  }
  if (focus) {
    return (
      <Box sx={{ ...blockSx, ...stateBlockPos, opacity: 1 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(180,200,235,0.55)' }}>
          {focus.category.toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: { xs: 21, sm: 30 }, fontWeight: 250, color: '#eef2fa', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
          {moneySmart(focus.amount)}
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: focus.isAnomaly ? accents.amber : 'rgba(180,200,235,0.6)', letterSpacing: '0.08em' }}>
          {focus.isAnomaly
            ? `${focus.anomalyRatio.toFixed(1)}× USUAL · ${focus.date}`
            : focus.isRecurring ? `RECURRING ${focus.occurrences}× · ${focus.date}` : focus.date}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ ...blockSx, ...stateBlockPos }}>
      <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(180,200,235,0.5)' }}>
        NET POSITION
      </Typography>
      <Typography sx={{
        fontSize: { xs: 21, sm: 30 }, fontWeight: 250, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums',
        color: net >= 0 ? accents.mint : accents.red,
      }}>
        {moneySmart(net)}
      </Typography>
      {windowInfo && (
        <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(180,200,235,0.5)', letterSpacing: '0.08em' }}>
          {moneySmart(windowInfo.spent)} OUT · {moneySmart(summary?.totalIncome ?? 0)} IN
        </Typography>
      )}
    </Box>
  );
}

function LensColumn({ value, onChange }) {
  return (
    <Box
      role="radiogroup"
      aria-label="Field lens"
      sx={{
        position: 'absolute', right: { xs: 8, sm: 18 }, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: { xs: 1.1, sm: 1.5 }, alignItems: 'flex-end',
        opacity: 0.75, transition: 'opacity 420ms', '&:hover': { opacity: 1 },
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
              minHeight: { xs: 30, sm: 0 }, px: { xs: 0.75, sm: 0 },
              outline: 'none', '&:focus-visible': { boxShadow: `0 0 0 1px ${accents.cyan}`, borderRadius: 0.5 },
              '&:hover .lensLabel': { opacity: 1 },
              '&:hover .lensTick': { width: 26, opacity: 1 },
            }}
          >
            <Typography
              className="lensLabel"
              sx={{
                fontFamily: MONO, fontSize: { xs: 8, sm: 9.5 }, letterSpacing: '0.26em',
                color: on ? accents.cyan : 'rgba(180,200,235,0.6)',
                opacity: on ? 1 : 0.55, transition: 'opacity 240ms, color 240ms',
                textTransform: 'uppercase', userSelect: 'none',
                // Narrow screens keep only the active label; the rest are ticks.
                display: { xs: on ? 'block' : 'none', sm: 'block' },
              }}
            >
              {l.label}
            </Typography>
            <Box
              className="lensTick"
              sx={{
                width: on ? 30 : 12, height: on ? 2 : 1,
                bgcolor: on ? accents.cyan : 'rgba(180,200,235,0.45)',
                boxShadow: on ? `0 0 10px ${accents.cyan}` : 'none',
                opacity: on ? 1 : 0.6,
                transition: 'width 320ms cubic-bezier(0.32,0.72,0,1), background-color 240ms, opacity 240ms',
              }}
            />
            <Typography sx={{
              fontFamily: MONO, fontSize: 8, color: 'rgba(180,200,235,0.3)',
              width: 8, textAlign: 'right', userSelect: 'none',
              display: { xs: 'none', sm: 'block' },
            }}>
              {i + 1}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function ScaleLadder({ value, onChange }) {
  return (
    <Box
      role="radiogroup"
      aria-label="Time scale"
      sx={{
        position: 'absolute', left: { xs: 10, sm: 24 }, bottom: { xs: 14, sm: 22 },
        display: 'flex', alignItems: 'flex-end', gap: { xs: 0.9, sm: 1.25 },
        opacity: 0.75, transition: 'opacity 420ms', '&:hover': { opacity: 1 },
      }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em',
        color: 'rgba(180,200,235,0.4)', mr: 0.5, pb: 0.25,
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
              minWidth: { xs: 40, sm: 0 }, py: { xs: 0.75, sm: 0 },
              '&:focus-visible': { boxShadow: `0 0 0 1px ${accents.cyan}`, borderRadius: 0.5 },
              '&:hover .scaleLabel': { opacity: 1 },
            }}
          >
            <Typography className="scaleLabel" sx={{
              fontFamily: MONO, fontSize: { xs: 8, sm: 9 }, letterSpacing: '0.2em',
              color: on ? accents.cyan : 'rgba(180,200,235,0.6)',
              opacity: on ? 1 : 0.5, transition: 'opacity 240ms, color 240ms',
              textTransform: 'uppercase', userSelect: 'none',
            }}>
              {s.label}
            </Typography>
            {/* Notch height encodes how far back this step stands */}
            <Box sx={{
              width: on ? 2 : 1, height: 8 + i * 5,
              bgcolor: on ? accents.cyan : 'rgba(180,200,235,0.35)',
              boxShadow: on ? `0 0 8px ${accents.cyan}` : 'none',
              transition: 'background-color 240ms, width 240ms',
            }} />
          </Box>
        );
      })}
    </Box>
  );
}

function Legend({ dim }) {
  const common = {
    fontFamily: MONO, letterSpacing: '0.3em',
    color: 'rgba(180,200,235,0.9)', textTransform: 'uppercase', textAlign: 'center',
  };
  return (
    <Box sx={{
      position: 'absolute', bottom: { xs: 52, sm: 24 }, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none', px: 2,
      opacity: dim ? 0.18 : 0.5,
      transition: 'opacity 900ms cubic-bezier(0.32,0.72,0,1)',
    }}>
      {/* The full legend only fits a wide viewport; phones get the essentials. */}
      <Typography sx={{ ...common, fontSize: 9, display: { xs: 'none', md: 'block' } }}>
        drag · orbit &nbsp;|&nbsp; scroll · dolly &nbsp;|&nbsp; move · attract &nbsp;|&nbsp; drag a recurring star · project &nbsp;|&nbsp; 1–6 lens &nbsp;|&nbsp; [ ] scale
      </Typography>
      <Typography sx={{ ...common, fontSize: 8.5, display: { xs: 'none', sm: 'block', md: 'none' } }}>
        drag · orbit &nbsp;|&nbsp; scroll · dolly &nbsp;|&nbsp; drag a pattern · project
      </Typography>
      <Typography sx={{ ...common, fontSize: 7.5, letterSpacing: '0.22em', display: { xs: 'block', sm: 'none' } }}>
        drag · orbit &nbsp;|&nbsp; pinch · dolly
      </Typography>
    </Box>
  );
}

function AboutTrigger({ onClick }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label="About this visualization — data and interpretation"
      sx={{
        position: 'absolute', right: { xs: 10, sm: 22 }, bottom: { xs: 14, sm: 22 },
        display: 'flex', alignItems: 'center', gap: 0.9,
        minHeight: { xs: 34, sm: 0 },
        background: 'none', border: 'none', p: 0.5, cursor: 'pointer',
        opacity: 0.55, transition: 'opacity 300ms',
        '&:hover': { opacity: 1 },
        '&:focus-visible': { opacity: 1, outline: `1px solid ${accents.cyan}`, outlineOffset: 3 },
      }}
    >
      <Box sx={{
        width: 15, height: 15, borderRadius: '50%',
        border: '1px solid rgba(180,200,235,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO, fontSize: 9.5, color: 'rgba(200,215,240,0.9)', lineHeight: 1,
      }}>
        i
      </Box>
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em',
        color: 'rgba(180,200,235,0.9)', textTransform: 'uppercase',
        display: { xs: 'none', sm: 'block' },
      }}>
        Data &amp; Interpretation
      </Typography>
      <Typography sx={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.24em',
        color: 'rgba(180,200,235,0.9)', textTransform: 'uppercase',
        display: { xs: 'block', sm: 'none' },
      }}>
        Data
      </Typography>
    </Box>
  );
}

/* ─── Disclosure overlay ─────────────────────────────────────────────────── */

const DISCLOSURE = [
  {
    k: 'WHAT PULSE IS',
    v: `Pulse is an analytical representation of your recorded financial activity. It is a way of looking at transactions you have already logged — not a ledger, not a statement, and not a live connection to any bank.`,
  },
  {
    k: 'DATA COMPLETENESS',
    v: `Every figure here is derived from the transactions present in Money OS for the selected period. If transactions are missing, delayed, duplicated, or miscategorised, the field will reflect that. Accuracy depends entirely on the completeness of your imported and manually entered data.`,
  },
  {
    k: 'HOW FIGURES ARE DERIVED',
    v: `Category shares, spending velocity, recurring patterns and anomaly flags are computed from your own history using simple statistical rules — for example, a transaction is flagged anomalous when it exceeds three times the median for its category. Projections extend an observed recurring amount forward at its observed cadence; they assume nothing changes, which is rarely true.`,
  },
  {
    k: 'NOT FINANCIAL ADVICE',
    v: `Nothing in Pulse is financial, investment, tax or legal advice. Visualisations, patterns and projections are descriptive only, and should not be relied upon as a recommendation to take or avoid any financial action. Consider speaking to a qualified professional before making decisions.`,
  },
  {
    k: 'MAY DIFFER FROM YOUR BANK',
    v: `Balances, net positions and projections shown here may differ from your actual bank or account records, due to timing, pending transactions, fees, interest, or data that has not been captured. Always treat your bank or provider's own records as authoritative.`,
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
        bgcolor: 'rgba(3,4,9,0.78)', backdropFilter: 'blur(18px) saturate(140%)',
        animation: 'fadeIn 260ms cubic-bezier(0.32,0.72,0,1)',
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
          bgcolor: 'rgba(7,9,17,0.92)',
          border: '1px solid rgba(100,210,255,0.16)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        }}
      >
        {/* corner brackets — the overlay wears the same bezel language */}
        {[
          { top: 10, left: 10, bt: 1, bl: 1 },
          { top: 10, right: 10, bt: 1, br: 1 },
          { bottom: 10, left: 10, bb: 1, bl: 1 },
          { bottom: 10, right: 10, bb: 1, br: 1 },
        ].map((p, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: 14, height: 14, pointerEvents: 'none',
            top: p.top, left: p.left, right: p.right, bottom: p.bottom,
            borderTop: p.bt ? `1px solid ${accents.cyan}` : 'none',
            borderBottom: p.bb ? `1px solid ${accents.cyan}` : 'none',
            borderLeft: p.bl ? `1px solid ${accents.cyan}` : 'none',
            borderRight: p.br ? `1px solid ${accents.cyan}` : 'none',
            opacity: 0.5,
          }} />
        ))}

        <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.42em', color: accents.cyan, opacity: 0.85 }}>
          MONEY OS · PULSE
        </Typography>
        <Typography
          id="pulse-about-title"
          sx={{ fontSize: 23, fontWeight: 250, letterSpacing: '0.02em', color: '#eef2fa', mt: 0.75, mb: 2.5 }}
        >
          Data &amp; Interpretation
        </Typography>

        {DISCLOSURE.map(({ k, v }) => (
          <Box key={k} sx={{ mb: 2.75 }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.26em',
              color: 'rgba(140,200,240,0.85)', mb: 0.9,
            }}>
              {k}
            </Typography>
            <Typography sx={{
              fontSize: 13.5, lineHeight: 1.72, color: 'rgba(214,224,244,0.86)', letterSpacing: '0.005em',
            }}>
              {v}
            </Typography>
          </Box>
        ))}

        <Box sx={{ height: '1px', bgcolor: 'rgba(100,210,255,0.14)', my: 2.5 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(180,200,235,0.42)', letterSpacing: '0.14em' }}>
            DESCRIPTIVE ANALYTICS · NOT ADVICE
          </Typography>
          <Box
            component="button"
            ref={closeRef}
            onClick={onClose}
            sx={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase',
              color: accents.cyan, bgcolor: 'transparent',
              border: '1px solid rgba(100,210,255,0.35)', px: 2.5, py: 1, cursor: 'pointer',
              transition: 'background-color 240ms, border-color 240ms',
              '&:hover': { bgcolor: 'rgba(100,210,255,0.10)', borderColor: accents.cyan },
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

/* ─── Boot ───────────────────────────────────────────────────────────────── */

function Boot() {
  const lines = useMemo(() => ([
    'INITIALIZING FIELD',
    'RESOLVING GRAVITY WELLS',
    'DETECTING RECURRING PATTERNS',
    'PLOTTING TRANSACTIONS',
  ]), []);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % lines.length), 900);
    return () => clearInterval(id);
  }, [lines.length]);
  return (
    <Box sx={{
      height: '100%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#04050a',
    }}>
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(100,210,255,0.05), transparent 60%)',
      }} />
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Box sx={{
          width: 44, height: 44, mx: 'auto', mb: 3,
          border: `1px solid ${accents.cyan}`, borderRadius: '50%', opacity: 0.35,
          animation: 'breathe 2.4s ease-in-out infinite',
          '@keyframes breathe': {
            '0%, 100%': { transform: 'scale(0.82)', opacity: 0.2 },
            '50%': { transform: 'scale(1)', opacity: 0.5 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
        <Typography sx={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em',
          color: accents.cyan, opacity: 0.65, textTransform: 'uppercase',
        }}>
          {lines[step]}
        </Typography>
      </Box>
    </Box>
  );
}
