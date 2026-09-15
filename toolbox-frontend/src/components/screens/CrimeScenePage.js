/**
 * Where Did My Money Go? — Crime Scene Edition
 *
 * A dramatic spending breakdown styled as a police evidence dossier.
 * Every figure maps to real transaction data. The humour is editorial;
 * the numbers are not.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { getExpenses } from '../rest/expenseTrackerApis';
import { moneySmart } from '../ui/money';

/* ── Design tokens ──────────────────────────────────────────────────────── */

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';
const TAPE = '#F5C518';         // crime-tape yellow
const TAPE_DIM = '#9a7b0a';
const CRIME_RED = '#FF3B30';
const INK = 'rgba(240,232,210,0.92)';    // warm off-white — the "paper" colour
const INK_DIM = 'rgba(240,232,210,0.45)';
const INK_GHOST = 'rgba(240,232,210,0.18)';

/* ── Data helpers ────────────────────────────────────────────────────────── */

const iso = (d) => d.toISOString().slice(0, 10);
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MOTIVES = {
  food:           ["I don't have anything at home.", "It was already late.", "Cooking is a whole situation."],
  delivery:       ["One click. That's all it took.", "I was just checking the app.", "I don't have anything at home."],
  restaurant:     ["It was someone's birthday. Probably.", "Socialising. Very important.", "The vibe was right."],
  grocery:        ["Meal prep. (I did not meal prep.)", "Buying ingredients counts as cooking.", "They had a sale on things I definitely needed."],
  shopping:       ["It was on sale. I technically saved money.", "Need vs. want is a spectrum.", "I needed it."],
  transport:      ["The walk would've taken 12 minutes.", "It was hot outside.", "I was already late."],
  subscription:   ["I keep meaning to cancel it.", "It has a very good library.", "I forgot I even had this one."],
  entertainment:  ["Experiences are investments in yourself.", "Tickets don't buy themselves.", "Special occasion."],
  health:         ["Investment in longevity.", "The doctor said exercise. This counts.", "Preventive care."],
  travel:         ["It was a good deal.", "I needed a break.", "It counts as a business expense."],
  education:      ["Investing in myself.", "The course has great reviews.", "This one I will finish."],
};

const VERDICTS = {
  food:           "You have singlehandedly kept the food delivery industry alive this month.",
  delivery:       "Your kitchen is decorative. A very expensive conversation piece.",
  restaurant:     "Table for one. Bill for five.",
  grocery:        "You spent a lot on groceries and still had nothing to eat.",
  shopping:       "Your cart never empties. It just gets checked out.",
  transport:      "Every destination was apparently too far to walk to.",
  subscription:   "You are subscribed to more services than you can name from memory.",
  entertainment:  "You have experienced many things. Your wallet, less so.",
  health:         "Your definition of 'healthy spending' is doing a lot of work here.",
  travel:         "You were away. Your money was busy too.",
  education:      "You have purchased access to knowledge. Acquisition remains unconfirmed.",
};

function findKey(map, categoryName) {
  const lower = categoryName.toLowerCase();
  return Object.keys(map).find(k => lower.includes(k));
}

function getMotive(categoryName) {
  const key = findKey(MOTIVES, categoryName);
  const list = key ? MOTIVES[key] : [
    'Unclear. Investigation ongoing.', 'No comment.', 'Motive unknown. Case open.',
  ];
  // deterministic — same category always gets the same quip so re-renders don't flicker
  return list[categoryName.length % list.length];
}

function getVerdict(categoryName) {
  const key = findKey(VERDICTS, categoryName);
  return key
    ? VERDICTS[key]
    : `${categoryName} has a firm hold on your finances. The numbers don't lie.`;
}

/* ── ASCII bar ───────────────────────────────────────────────────────────── */

function asciiBar(pct, max = 20) {
  const filled = Math.max(1, Math.round((pct / 100) * max));
  return '█'.repeat(filled) + '░'.repeat(max - filled);
}

/* ── Divider ─────────────────────────────────────────────────────────────── */

function Divider({ label }) {
  return (
    <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flex: 1, height: 1, bgcolor: INK_GHOST }} />
      {label && (
        <Typography sx={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.4em',
          color: TAPE_DIM, textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
      )}
      <Box sx={{ flex: 1, height: 1, bgcolor: INK_GHOST }} />
    </Box>
  );
}

/* ── Stamp ───────────────────────────────────────────────────────────────── */

function Stamp({ children, color = CRIME_RED, rotate = -12 }) {
  return (
    <Box sx={{
      display: 'inline-block',
      border: `2.5px solid ${color}`,
      px: 1.5, py: 0.4,
      borderRadius: '4px',
      transform: `rotate(${rotate}deg)`,
      opacity: 0.85,
    }}>
      <Typography sx={{
        fontFamily: MONO, fontSize: { xs: 9, sm: 11 }, letterSpacing: '0.28em',
        color, textTransform: 'uppercase', fontWeight: 700, lineHeight: 1,
      }}>
        {children}
      </Typography>
    </Box>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function CrimeScenePage() {
  const [expenses, setExpenses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    getExpenses({ dateFrom: iso(from), dateTo: iso(today), pageSize: 500, ordering: 'date' })
      .then(d => setExpenses(d.results || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (!expenses) return null;

    const txns = expenses
      .filter(e => (e.type || 'expense') !== 'income')
      .map(e => ({
        amount: Math.abs(Number(e.amount) || 0),
        date: (typeof e.date === 'string' ? e.date : new Date(e.date).toISOString()).slice(0, 10),
        description: e.description || e.note || e.title || '',
        category: e.category?.name || 'Uncategorised',
      }))
      .filter(e => e.amount > 0 && e.date);

    if (!txns.length) return null;

    const total = txns.reduce((s, t) => s + t.amount, 0);

    // Category totals
    const catMap = {};
    txns.forEach(t => {
      if (!catMap[t.category]) catMap[t.category] = { name: t.category, amount: 0, count: 0, dates: [] };
      catMap[t.category].amount += t.amount;
      catMap[t.category].count += 1;
      catMap[t.category].dates.push(t.date);
    });
    const categories = Object.values(catMap).sort((a, b) => b.amount - a.amount);

    // Merchant totals — use description as merchant name
    const merchantMap = {};
    txns.forEach(t => {
      const key = t.description || t.category;
      if (!merchantMap[key]) merchantMap[key] = { name: key, amount: 0, count: 0 };
      merchantMap[key].amount += t.amount;
      merchantMap[key].count += 1;
    });
    const merchants = Object.values(merchantMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Weekly crime timeline
    const weekMap = {};
    txns.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const sun = new Date(d);
      sun.setDate(d.getDate() - d.getDay());
      const key = sun.toISOString().slice(0, 10);
      if (!weekMap[key]) weekMap[key] = { week: key, amount: 0, count: 0 };
      weekMap[key].amount += t.amount;
      weekMap[key].count += 1;
    });
    const weeks = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));

    const topSuspect = categories[0];
    return {
      total,
      txnCount: txns.length,
      categories,
      merchants,
      weeks,
      topSuspect,
      motive: topSuspect ? getMotive(topSuspect.name) : '',
      verdict: topSuspect ? getVerdict(topSuspect.name) : '',
      lastSeen: topSuspect ? [...topSuspect.dates].sort().reverse()[0] : '',
    };
  }, [expenses]);

  const now = new Date();
  const caseNo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = MONTHS[now.getMonth()].toUpperCase();

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', pb: { xs: 10, sm: 8 }, px: { xs: 0, sm: 1 } }}>
      {loading ? (
        <LoadingState />
      ) : failed || !data ? (
        <EmptyState failed={failed} />
      ) : (
        <>
          <Header caseNo={caseNo} monthName={monthName} total={data.total} txnCount={data.txnCount} />
          <EvidenceLog categories={data.categories} total={data.total} />
          <TopSuspect suspect={data.topSuspect} motive={data.motive} lastSeen={data.lastSeen} total={data.total} />
          <KnownAssociates merchants={data.merchants} />
          <CrimeTimeline weeks={data.weeks} />
          <Verdict topSuspect={data.topSuspect} verdict={data.verdict} />
        </>
      )}
    </Box>
  );
}

/* ── Section: Header ─────────────────────────────────────────────────────── */

function Header({ caseNo, monthName, total, txnCount }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      sx={{ mb: 1 }}
    >
      {/* Crime tape stripe */}
      <Box sx={{
        height: 28, mb: 2,
        background: `repeating-linear-gradient(
          -45deg,
          ${TAPE} 0px, ${TAPE} 18px,
          #0a0900 18px, #0a0900 36px
        )`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <Typography sx={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.45em',
          color: '#0a0900', fontWeight: 800, textTransform: 'uppercase',
          bgcolor: TAPE, px: 2, lineHeight: '28px',
        }}>
          DO NOT CROSS · DO NOT CROSS · DO NOT CROSS · DO NOT CROSS
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        {/* Case header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
          <Typography sx={{
            fontFamily: MONO, fontSize: { xs: 8.5, sm: 9.5 }, letterSpacing: '0.35em',
            color: TAPE_DIM, textTransform: 'uppercase',
          }}>
            MONEY OS · FINANCIAL CRIMES DIVISION · CASE #{caseNo}
          </Typography>
          <Stamp rotate={6}>OPEN</Stamp>
        </Box>

        {/* Title */}
        <Typography sx={{
          fontSize: { xs: 26, sm: 36 }, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em',
          color: INK, mt: 1,
        }}>
          Where Did<br />My Money Go?
        </Typography>
        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 10, sm: 12 }, letterSpacing: '0.38em',
          color: TAPE, textTransform: 'uppercase', mt: 0.5, mb: 2.5,
        }}>
          — Crime Scene Edition —
        </Typography>

        {/* Hero figure */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 0.5 }}>
          <Typography sx={{
            fontSize: { xs: 40, sm: 56 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em',
            color: INK,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {moneySmart(total)}
          </Typography>
        </Box>
        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 9, sm: 10 }, letterSpacing: '0.32em',
          color: INK_DIM, textTransform: 'uppercase', mb: 0.5,
        }}>
          UNACCOUNTED FOR · {monthName} · {txnCount} COUNTS
        </Typography>

        <Divider />
      </Box>
    </Box>
  );
}

/* ── Section: Evidence log ───────────────────────────────────────────────── */

function EvidenceLog({ categories, total }) {
  const topAmount = categories[0]?.amount || 1;
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
      sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em',
        color: TAPE, textTransform: 'uppercase', mb: 2,
      }}>
        EVIDENCE LOG — SPENDING BY CATEGORY
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {categories.slice(0, 8).map((cat, i) => {
          const pct = (cat.amount / total) * 100;
          const barPct = (cat.amount / topAmount) * 100;
          return (
            <Box key={cat.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                <Typography sx={{
                  fontFamily: MONO, fontSize: { xs: 10, sm: 11 }, letterSpacing: '0.18em',
                  color: INK, textTransform: 'uppercase', flex: 1,
                  opacity: i === 0 ? 1 : 0.85,
                }}>
                  {cat.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
                  <Typography sx={{
                    fontFamily: MONO, fontSize: { xs: 9, sm: 10 }, color: INK_DIM, letterSpacing: '0.08em',
                  }}>
                    {pct.toFixed(0)}%
                  </Typography>
                  <Typography sx={{
                    fontFamily: MONO, fontSize: { xs: 11, sm: 12 }, color: INK, letterSpacing: '0.04em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {moneySmart(cat.amount)}
                  </Typography>
                </Box>
              </Box>
              {/* ASCII bar */}
              <Typography sx={{
                fontFamily: MONO, fontSize: { xs: 10, sm: 12 }, lineHeight: 1, letterSpacing: '0.01em',
                color: i === 0 ? TAPE : 'rgba(245,197,24,0.45)',
                overflowX: 'hidden', whiteSpace: 'nowrap',
              }}>
                {asciiBar(barPct, 24)}
              </Typography>
              <Typography sx={{
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
                color: INK_GHOST, mt: 0.3,
              }}>
                {cat.count} COUNT{cat.count !== 1 ? 'S' : ''} OF RECKLESS SPENDING
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Divider />
    </Box>
  );
}

/* ── Section: Top Suspect ────────────────────────────────────────────────── */

function TopSuspect({ suspect, motive, lastSeen, total }) {
  if (!suspect) return null;
  const pct = ((suspect.amount / total) * 100).toFixed(0);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
      sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em',
        color: TAPE, textTransform: 'uppercase', mb: 2,
      }}>
        PRIMARY SUSPECT
      </Typography>

      {/* Dossier card */}
      <Box sx={{
        border: `1.5px solid ${TAPE}33`,
        borderLeft: `3px solid ${TAPE}`,
        borderRadius: '4px',
        p: { xs: 2, sm: 3 },
        bgcolor: 'rgba(245,197,24,0.04)',
        position: 'relative',
      }}>
        {/* WANTED stamp — top right */}
        <Box sx={{ position: 'absolute', top: 14, right: 14 }}>
          <Stamp color={TAPE} rotate={8}>WANTED</Stamp>
        </Box>

        {/* Category name — big */}
        <Typography sx={{
          fontSize: { xs: 30, sm: 44 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em',
          color: INK, mb: 0.5, maxWidth: '75%',
        }}>
          {suspect.name}
        </Typography>

        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 20, sm: 28 }, letterSpacing: '0.04em',
          color: TAPE, fontVariantNumeric: 'tabular-nums', mb: 2.5,
        }}>
          {moneySmart(suspect.amount)}
        </Typography>

        {/* Evidence table */}
        {[
          { k: 'SHARE OF CRIMES', v: `${pct}% OF TOTAL SPENDING` },
          { k: 'EVIDENCE', v: `${suspect.count} TRANSACTION${suspect.count !== 1 ? 'S' : ''}` },
          { k: 'MOTIVE', v: `"${motive}"` },
          { k: 'LAST SEEN', v: lastSeen || 'UNKNOWN' },
          { k: 'STATUS', v: 'AT LARGE' },
        ].map(({ k, v }) => (
          <Box key={k} sx={{
            display: 'flex', gap: 2, py: 0.85,
            borderBottom: `1px solid ${INK_GHOST}`,
            '&:last-of-type': { borderBottom: 'none' },
          }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: { xs: 8.5, sm: 9.5 }, letterSpacing: '0.26em',
              color: INK_DIM, textTransform: 'uppercase', width: { xs: 96, sm: 120 }, flexShrink: 0,
            }}>
              {k}
            </Typography>
            <Typography sx={{
              fontFamily: MONO, fontSize: { xs: 9, sm: 10 }, letterSpacing: '0.1em',
              color: k === 'STATUS' ? CRIME_RED : INK,
              fontWeight: k === 'STATUS' ? 700 : 400,
              flex: 1,
            }}>
              {v}
            </Typography>
          </Box>
        ))}
      </Box>

      <Divider />
    </Box>
  );
}

/* ── Section: Known Associates ───────────────────────────────────────────── */

function KnownAssociates({ merchants }) {
  if (!merchants.length) return null;
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
      sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em',
        color: TAPE, textTransform: 'uppercase', mb: 2,
      }}>
        KNOWN ASSOCIATES
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {merchants.map((m, i) => (
          <Box key={m.name} sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            py: 1.25,
            borderBottom: `1px solid ${INK_GHOST}`,
          }}>
            <Typography sx={{
              fontFamily: MONO, fontSize: 8.5, color: INK_DIM,
              width: 16, flexShrink: 0, letterSpacing: '0.1em',
            }}>
              {String(i + 1).padStart(2, '0')}
            </Typography>
            <Typography sx={{
              fontFamily: MONO, fontSize: { xs: 10, sm: 11 }, letterSpacing: '0.12em',
              color: INK, textTransform: 'uppercase', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {m.name}
            </Typography>
            <Typography sx={{
              fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.12em',
              color: INK_DIM, flexShrink: 0,
            }}>
              {m.count}×
            </Typography>
            <Typography sx={{
              fontFamily: MONO, fontSize: { xs: 10, sm: 11 }, letterSpacing: '0.08em',
              color: INK, fontVariantNumeric: 'tabular-nums', flexShrink: 0, textAlign: 'right',
              minWidth: { xs: 64, sm: 80 },
            }}>
              {moneySmart(m.amount)}
            </Typography>
            <Box sx={{
              flexShrink: 0,
              border: `1px solid ${CRIME_RED}66`,
              borderRadius: '3px', px: 0.75, py: 0.2,
            }}>
              <Typography sx={{
                fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em',
                color: CRIME_RED, textTransform: 'uppercase',
              }}>
                {i === 0 ? 'RINGLEADER' : 'ACCOMPLICE'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider />
    </Box>
  );
}

/* ── Section: Crime Timeline ─────────────────────────────────────────────── */

function CrimeTimeline({ weeks }) {
  if (!weeks.length) return null;
  const maxAmount = Math.max(...weeks.map(w => w.amount));

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
      sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em',
        color: TAPE, textTransform: 'uppercase', mb: 2,
      }}>
        CRIME TIMELINE — WEEKLY
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {weeks.map((w) => {
          const d = new Date(w.week + 'T00:00:00');
          const label = `WK ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}`;
          const barPct = (w.amount / maxAmount) * 100;
          return (
            <Box key={w.week}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{
                  fontFamily: MONO, fontSize: 8.5, color: INK_DIM, letterSpacing: '0.16em',
                  width: { xs: 60, sm: 72 }, flexShrink: 0,
                }}>
                  {label}
                </Typography>
                <Typography sx={{
                  fontFamily: MONO, fontSize: { xs: 10.5, sm: 12 }, color: TAPE, lineHeight: 1, flex: 1,
                  overflow: 'hidden',
                }}>
                  {'█'.repeat(Math.max(1, Math.round((barPct / 100) * 18)))}
                </Typography>
                <Typography sx={{
                  fontFamily: MONO, fontSize: { xs: 9.5, sm: 11 }, color: INK,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0, letterSpacing: '0.04em',
                }}>
                  {moneySmart(w.amount)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Divider />
    </Box>
  );
}

/* ── Section: The Verdict ────────────────────────────────────────────────── */

function Verdict({ topSuspect, verdict }) {
  if (!topSuspect) return null;
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
      sx={{ px: { xs: 2, sm: 0 } }}
    >
      <Typography sx={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em',
        color: TAPE, textTransform: 'uppercase', mb: 2,
      }}>
        THE VERDICT
      </Typography>

      {/* Verdict card — bordered, with guilty stamp */}
      <Box sx={{
        border: `1.5px solid ${INK_GHOST}`,
        borderRadius: '4px',
        p: { xs: 2.5, sm: 3.5 },
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Corner brackets */}
        {[
          { top: 8, left: 8, borderTop: `1.5px solid ${TAPE}`, borderLeft: `1.5px solid ${TAPE}` },
          { top: 8, right: 8, borderTop: `1.5px solid ${TAPE}`, borderRight: `1.5px solid ${TAPE}` },
          { bottom: 8, left: 8, borderBottom: `1.5px solid ${TAPE}`, borderLeft: `1.5px solid ${TAPE}` },
          { bottom: 8, right: 8, borderBottom: `1.5px solid ${TAPE}`, borderRight: `1.5px solid ${TAPE}` },
        ].map((p, i) => (
          <Box key={i} sx={{ position: 'absolute', width: 12, height: 12, ...p }} />
        ))}

        <Typography sx={{
          fontFamily: MONO, fontSize: { xs: 9, sm: 10 }, letterSpacing: '0.32em',
          color: INK_DIM, textTransform: 'uppercase', mb: 1,
        }}>
          YOUR FINANCIAL VILLAIN:
        </Typography>

        <Typography sx={{
          fontSize: { xs: 28, sm: 42 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em',
          color: TAPE, mb: 2,
        }}>
          {topSuspect.name.toUpperCase()}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Typography sx={{
            fontSize: { xs: 14, sm: 17 }, lineHeight: 1.6, color: INK, flex: 1, minWidth: 180,
            fontStyle: 'italic',
          }}>
            "{verdict}"
          </Typography>
          <Stamp color={CRIME_RED} rotate={-8}>GUILTY</Stamp>
        </Box>

        <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${INK_GHOST}` }}>
          <Typography sx={{
            fontFamily: MONO, fontSize: { xs: 8, sm: 9 }, letterSpacing: '0.22em',
            color: INK_DIM, textTransform: 'uppercase', lineHeight: 1.8,
          }}>
            JUDGMENT: GUILTY ON ALL COUNTS<br />
            SENTENCE: REVIEW YOUR SUBSCRIPTIONS. COOK SOMETIMES.<br />
            RIGHT TO APPEAL: YES, NEXT MONTH.
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Typography sx={{
        fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em',
        color: INK_GHOST, textTransform: 'uppercase', textAlign: 'center', mt: 3,
      }}>
        MONEY OS · FINANCIAL CRIMES DIVISION · FIGURES ARE REAL · MOTIVES ARE EDITORIAL
      </Typography>
    </Box>
  );
}

/* ── Loading state ───────────────────────────────────────────────────────── */

function LoadingState() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { n = (n + 1) % 4; setDots('.'.repeat(n)); }, 400);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ px: { xs: 2, sm: 0 }, pt: 6 }}>
      <Box sx={{ height: 28, mb: 3, background: `repeating-linear-gradient(-45deg, ${TAPE} 0px, ${TAPE} 18px, #0a0900 18px, #0a0900 36px)` }} />
      <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.32em', color: TAPE }}>
        COMPILING EVIDENCE{dots}
      </Typography>
      <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: INK_DIM, mt: 1 }}>
        REVIEWING YOUR FINANCIAL CRIMES. PLEASE STAND BY.
      </Typography>
    </Box>
  );
}

/* ── Empty / error state ─────────────────────────────────────────────────── */

function EmptyState({ failed }) {
  return (
    <Box sx={{ px: { xs: 2, sm: 0 }, pt: 6, textAlign: 'center' }}>
      <Box sx={{ height: 28, mb: 3, background: `repeating-linear-gradient(-45deg, ${TAPE} 0px, ${TAPE} 18px, #0a0900 18px, #0a0900 36px)` }} />
      <Stamp color={TAPE} rotate={0}>CASE CLOSED</Stamp>
      <Typography sx={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.22em', color: INK, mt: 3, mb: 1 }}>
        {failed ? 'EVIDENCE DESTROYED' : 'NO CRIMES DETECTED'}
      </Typography>
      <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: INK_DIM, lineHeight: 1.7 }}>
        {failed
          ? 'Could not retrieve this month\'s financial records.\nCheck your connection and try again.'
          : 'No spending found this month.\nProceed with suspicion.'}
      </Typography>
    </Box>
  );
}
