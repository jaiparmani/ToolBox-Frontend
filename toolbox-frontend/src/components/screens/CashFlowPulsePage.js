/**
 * CashFlow Pulse — the instrument page.
 *
 * The scene owns the primary readouts diegetically (a canvas-textured label
 * floats above the scrub cursor). The page provides:
 *   • the identity strip (title + status)
 *   • the "range totals" strip — up-to-cursor cumulative telemetry
 *   • the taxonomy strip (category legend, sorted by month spend)
 *
 * The scene reports its cursor index back via onCursorChange, so range
 * totals here always reflect what the reader is looking at.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { getExpenses, getExpenseSummary } from '../rest/expenseTrackerApis';
import { EmptyState } from '../ui';
import FinancialOrganism from '../ui/FinancialOrganism';
import { moneySmart } from '../ui/money';
import { accents, chart } from '../../theme/tokens';

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';

export default function CashFlowPulsePage() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);

  useEffect(() => {
    const today = new Date();
    const month = today.toISOString().slice(0, 8) + '01';
    const todayStr = today.toISOString().slice(0, 10);
    Promise.all([
      getExpenses({ dateFrom: month, dateTo: todayStr, pageSize: 500, ordering: 'date' })
        .then(data => data.results || []),
      getExpenseSummary({ dateFrom: month, dateTo: todayStr }),
    ])
      .then(([txns, sum]) => { setExpenses(txns); setSummary(sum); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { days, categories } = useMemo(() => {
    if (!expenses) return { days: [], categories: [] };
    const dayMap = new Map();
    const catSet = new Map();
    expenses.forEach(e => {
      if (e.type === 'income') return;
      const amt = Math.abs(Number(e.amount) || 0);
      if (amt <= 0) return;
      const dateStr = e.date instanceof Date ? e.date.toISOString().slice(0, 10)
        : typeof e.date === 'string' ? e.date.slice(0, 10) : null;
      if (!dateStr) return;
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, { total: 0, count: 0, catAmounts: new Map() });
      const day = dayMap.get(dateStr);
      day.total += amt; day.count += 1;
      const catName = e.category?.name || 'Uncategorized';
      day.catAmounts.set(catName, (day.catAmounts.get(catName) || 0) + amt);
      if (!catSet.has(catName)) catSet.set(catName, e.category?.color || null);
    });
    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth();
    const dayCount = today.getDate();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    for (let d = 1; d <= dayCount; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const dayInfo = dayMap.get(dateStr) || { total: 0, count: 0, catAmounts: new Map() };
      const cats = [];
      dayInfo.catAmounts.forEach((amount, name) => cats.push({ name, amount }));
      cats.sort((a, b) => b.amount - a.amount);
      result.push({
        date: dateStr, label: `${d}`,
        dateLabel: `${dayNames[dateObj.getDay()]} ${monthNames[month]} ${d}`,
        total: dayInfo.total, count: dayInfo.count, cats,
      });
    }
    return { days: result, categories: Array.from(catSet.keys()) };
  }, [expenses]);

  const monthStats = useMemo(() => {
    if (!summary || !days.length) return null;
    return {
      totalIncome: summary.totalIncome || 0,
      totalSpent: summary.totalExpenses || 0,
      net: summary.netBalance || 0,
      heaviestDay: Math.max(...days.map(d => d.total)),
      avgDay: days.reduce((s, d) => s + d.total, 0) / days.length,
      activeDays: days.filter(d => d.total > 0).length,
    };
  }, [summary, days]);

  // Range totals — everything up to (and including) cursor
  const rangeStats = useMemo(() => {
    if (!days.length || cursor == null) return null;
    const slice = days.slice(0, cursor + 1);
    const spent = slice.reduce((s, d) => s + (d.total || 0), 0);
    const txns = slice.reduce((s, d) => s + (d.count || 0), 0);
    const active = slice.filter(d => d.total > 0).length;
    const dayShare = summary?.totalIncome
      ? (summary.totalIncome / days.length) * slice.length
      : 0;
    return { spent, txns, active, incomeToDate: dayShare, netToDate: dayShare - spent, dayN: slice.length };
  }, [days, cursor, summary]);

  const hasData = days.length > 0 && (summary || expenses);

  return (
    <Box sx={{
      position: 'relative', pb: 6,
      bgcolor: '#04050a', minHeight: '100vh',
      mx: { xs: -1, sm: -2, md: -3 }, mt: -2,
    }}>
      {/* Identity strip */}
      <Box sx={{
        position: 'relative', px: { xs: 2, sm: 4 }, pt: { xs: 3, sm: 4 }, pb: 2,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap',
        borderBottom: '1px solid rgba(120,140,200,0.08)',
      }}>
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />
        <Box>
          <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: accents.cyan, opacity: 0.7, textTransform: 'uppercase' }}>
            ᴼˢ.PULSE // {new Date().toISOString().slice(0, 10)} // INSTRUMENT
          </Typography>
          <Typography sx={{ fontSize: { xs: 26, sm: 36 }, fontWeight: 200, letterSpacing: '-0.02em', color: '#e8ecf5', lineHeight: 1.05, mt: 0.5 }}>
            The Financial <em style={{ fontStyle: 'italic', color: accents.violet, fontWeight: 300 }}>Instrument</em>
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, color: 'rgba(180,190,220,0.55)', mt: 0.5, letterSpacing: '0.04em' }}>
            {hasData
              ? `LIVE — grab the read-head. sweep. left/right arrow keys move a day.`
              : 'STANDBY'}
          </Typography>
        </Box>
        {monthStats && (
          <TelemetryRow stats={monthStats} />
        )}
      </Box>

      {/* Instrument */}
      <Box sx={{ position: 'relative', px: { xs: 1, sm: 3 }, mt: 2 }}>
        {loading ? (
          <OrganismSkeleton />
        ) : hasData ? (
          <>
            <FinancialOrganism
              days={days}
              categories={categories}
              net={monthStats?.net ?? 0}
              income={monthStats?.totalIncome ?? 0}
              onCursorChange={setCursor}
              initialCursor={days.length - 1}
              height={compact ? 540 : 680}
            />
            {/* Scrub-range strip — up-to-cursor cumulative totals */}
            {rangeStats && (
              <Box sx={{
                mt: 2, display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 },
                px: { xs: 1.5, sm: 2.5 }, py: 1.5, flexWrap: 'wrap',
                borderRadius: 2, border: '1px solid rgba(100,210,255,0.12)',
                bgcolor: 'rgba(8,10,20,0.6)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accents.cyan,
                    boxShadow: `0 0 10px ${accents.cyan}` }} />
                  <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: accents.cyan, opacity: 0.85 }}>
                    UP TO DAY {rangeStats.dayN} · CUMULATIVE
                  </Typography>
                </Box>
                <RangeMetric k="SPENT" v={moneySmart(rangeStats.spent)} tone={accents.violet} />
                <RangeMetric k="TXNS" v={String(rangeStats.txns)} tone={accents.cyan} />
                <RangeMetric k="ACTIVE" v={`${rangeStats.active}/${rangeStats.dayN}`} tone={accents.blue} />
                <RangeMetric k="RUN NET" v={moneySmart(rangeStats.netToDate)}
                  tone={rangeStats.netToDate >= 0 ? accents.mint : accents.red} />
              </Box>
            )}
          </>
        ) : (
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title="No heartbeat yet"
            description="Log spending this month and the instrument will materialize — each transaction becomes a vertex on the manifold."
          />
        )}
      </Box>

      {hasData && categories.length > 0 && (
        <CategoryTaxonomy categories={categories} days={days} />
      )}
    </Box>
  );
}

/* ─── HUD parts ────────────────────────────────────────────────────────── */

function TelemetryRow({ stats }) {
  const items = [
    { k: 'SPEND', v: moneySmart(stats.totalSpent), c: accents.violet },
    { k: 'INCOME', v: moneySmart(stats.totalIncome), c: accents.mint },
    { k: 'NET', v: moneySmart(stats.net), c: stats.net >= 0 ? accents.mint : accents.red },
    { k: 'HEAVIEST', v: moneySmart(stats.heaviestDay), c: accents.amber },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {items.map(it => (
        <Box key={it.k} sx={{ position: 'relative', pl: 1.5 }}>
          <Box sx={{
            position: 'absolute', left: 0, top: 4, bottom: 4, width: 2,
            background: `linear-gradient(180deg, ${it.c}, transparent)`, borderRadius: 1,
          }} />
          <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.24em', color: 'rgba(180,190,220,0.55)' }}>
            {it.k}
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 16, color: it.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {it.v}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function RangeMetric({ k, v, tone }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
      <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(180,190,220,0.5)' }}>
        {k}
      </Typography>
      <Typography sx={{ fontFamily: MONO, fontSize: 14, color: tone, fontVariantNumeric: 'tabular-nums' }}>
        {v}
      </Typography>
    </Box>
  );
}

function CornerBracket({ pos }) {
  const size = 14;
  const style = { position: 'absolute', width: size, height: size };
  const p = {
    tl: { top: 12, left: 12, borderTop: `1px solid ${accents.cyan}`, borderLeft: `1px solid ${accents.cyan}` },
    tr: { top: 12, right: 12, borderTop: `1px solid ${accents.cyan}`, borderRight: `1px solid ${accents.cyan}` },
  }[pos];
  return <Box sx={{ ...style, ...p, opacity: 0.4 }} />;
}

function CategoryTaxonomy({ categories, days }) {
  const totals = useMemo(() => {
    const m = new Map();
    days.forEach(d => (d.cats || []).forEach(c => m.set(c.name, (m.get(c.name) || 0) + c.amount)));
    return categories
      .map(name => ({ name, total: m.get(name) || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, days]);
  const palette = chart.categorical.dark;
  return (
    <Box sx={{ mt: 4, px: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(100,210,255,0.15)' }} />
        <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: accents.cyan, opacity: 0.7 }}>
          TAXONOMY // {totals.length} STREAMS
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(100,210,255,0.15)' }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {totals.slice(0, 12).map((c, i) => {
          const color = palette[i % palette.length];
          return (
            <Box key={c.name} sx={{
              position: 'relative', px: 1.5, py: 1.25,
              border: '1px solid rgba(120,140,200,0.08)',
              borderRadius: 1.5, bgcolor: 'rgba(10,14,24,0.6)',
              overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5 }} />
              <Typography sx={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(180,190,220,0.55)', textTransform: 'uppercase' }}>
                str-{String(i + 1).padStart(2, '0')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#e8ecf5', mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.name}
              </Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 13, color, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
                {moneySmart(c.total)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function OrganismSkeleton() {
  return (
    <Box sx={{
      height: 620, position: 'relative', borderRadius: 5, overflow: 'hidden',
      bgcolor: '#04050a', border: '1px solid rgba(120,140,200,0.12)',
    }}>
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(100,210,255,0.06), transparent 55%)',
      }} />
      <Typography sx={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        fontFamily: MONO, fontSize: 11, letterSpacing: '0.4em', color: accents.cyan, opacity: 0.5,
        animation: 'blink 1.4s steps(2, end) infinite',
        '@keyframes blink': { '50%': { opacity: 0.2 } },
      }}>
        ▸ CALIBRATING…
      </Typography>
    </Box>
  );
}
