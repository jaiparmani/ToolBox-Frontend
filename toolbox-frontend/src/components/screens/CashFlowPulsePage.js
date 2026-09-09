/**
 * CashFlow Pulse — the financial organism.
 *
 * The page is not a dashboard. It's a single WebGL scene (FinancialOrganism)
 * that fills the viewport, surrounded by HUD-style instrumentation overlays:
 * corner telemetry panels, an orbital metrics ring header, a scanline
 * atmosphere, and a hover readout that appears when you inspect a day-node.
 *
 * Every number on screen is derived from real API data. No cards.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

import { getExpenses, getExpenseSummary } from '../rest/expenseTrackerApis';
import { EmptyState } from '../ui';
import FinancialOrganism from '../ui/FinancialOrganism';
import { moneySmart } from '../ui/money';
import { accents } from '../../theme/tokens';

const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace';

export default function CashFlowPulsePage() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState(null);

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

  const stats = useMemo(() => {
    if (!summary || !days.length) return null;
    const totalIncome = summary.totalIncome || 0;
    const totalSpent = summary.totalExpenses || 0;
    const net = summary.netBalance || 0;
    const heaviestDay = Math.max(...days.map(d => d.total));
    const heaviestIdx = days.findIndex(d => d.total === heaviestDay);
    const avgDay = days.reduce((s, d) => s + d.total, 0) / days.length;
    const activeDays = days.filter(d => d.total > 0).length;
    return { totalIncome, totalSpent, net, heaviestDay, heaviestIdx, avgDay, activeDays };
  }, [summary, days]);

  const hasData = days.length > 0 && (summary || expenses);
  const hoveredDay = hoverIdx != null ? days[hoverIdx] : null;

  return (
    <Box sx={{ position: 'relative', pb: 6, bgcolor: '#04050a', minHeight: '100vh', mx: { xs: -1, sm: -2, md: -3 }, mt: -2 }}>
      {/* Top spine — page identity + orbital metric ticker */}
      <Box sx={{
        position: 'relative', px: { xs: 2, sm: 4 }, pt: { xs: 3, sm: 4 }, pb: 2,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        borderBottom: '1px solid rgba(120,140,200,0.08)',
      }}>
        {/* Corner-bracket ornament */}
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />
        <Box>
          <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: accents.cyan, opacity: 0.7, textTransform: 'uppercase' }}>
            ᴼˢ.PULSE // {new Date().toISOString().slice(0, 10)}
          </Typography>
          <Typography sx={{ fontSize: { xs: 26, sm: 36 }, fontWeight: 200, letterSpacing: '-0.02em', color: '#e8ecf5', lineHeight: 1.05, mt: 0.5 }}>
            The Financial <em style={{ fontStyle: 'italic', color: accents.violet, fontWeight: 300 }}>Organism</em>
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, color: 'rgba(180,190,220,0.55)', mt: 0.5, letterSpacing: '0.04em' }}>
            {hasData
              ? `LIVE — ${days.length} day${days.length !== 1 ? 's' : ''} indexed · ${stats?.activeDays ?? 0} active`
              : 'STANDBY'}
          </Typography>
        </Box>
        {stats && (
          <TelemetryRow stats={stats} />
        )}
      </Box>

      {/* The organism */}
      <Box sx={{ position: 'relative', px: { xs: 1, sm: 3 }, mt: 2 }}>
        {loading ? (
          <OrganismSkeleton />
        ) : hasData ? (
          <Box sx={{ position: 'relative' }}>
            <FinancialOrganism
              days={days}
              categories={categories}
              net={stats?.net ?? 0}
              income={stats?.totalIncome ?? 0}
              onHover={setHoverIdx}
              height={compact ? 520 : 680}
            />

            {/* Corner instrumentation panels overlayed on the scene */}
            <TelemetryPanel pos="tl" label="NUCLEUS" mono>
              <MetricLine k="NET" v={moneySmart(stats.net)} tone={stats.net >= 0 ? accents.mint : accents.red} />
              <MetricLine k="MASS" v={`log(${moneySmart(Math.abs(stats.net))})`} muted />
            </TelemetryPanel>
            <TelemetryPanel pos="tr" label="FLUX" mono>
              <MetricLine k="OUT" v={moneySmart(stats.totalSpent)} tone={accents.violet} />
              <MetricLine k="IN " v={moneySmart(stats.totalIncome)} tone={accents.mint} />
            </TelemetryPanel>
            <TelemetryPanel pos="bl" label="RHYTHM" mono>
              <MetricLine k="AVG" v={moneySmart(stats.avgDay)} tone={accents.cyan} />
              <MetricLine k="MAX" v={moneySmart(stats.heaviestDay)} tone={accents.amber} />
            </TelemetryPanel>
            <TelemetryPanel pos="br" label="INDEX" mono>
              <MetricLine k="DAY" v={`${stats.activeDays}/${days.length}`} tone={accents.cyan} />
              <MetricLine k="TXN" v={`${(expenses || []).length}`} muted />
            </TelemetryPanel>

            {/* Center-top hover readout */}
            {hoveredDay && (
              <Box sx={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                px: 2.5, py: 1.5, borderRadius: 2,
                bgcolor: 'rgba(6,8,16,0.72)',
                backdropFilter: 'blur(14px) saturate(180%)',
                border: '1px solid rgba(100,210,255,0.18)',
                boxShadow: '0 0 40px rgba(100,210,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                pointerEvents: 'none', minWidth: 220, textAlign: 'center',
              }}>
                <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.24em', color: accents.cyan, mb: 0.5 }}>
                  ▸ {hoveredDay.dateLabel}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 300, color: '#f0f3fa', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {moneySmart(hoveredDay.total || 0)}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 10, color: 'rgba(180,190,220,0.6)', mt: 0.25 }}>
                  {hoveredDay.count} txn{hoveredDay.count !== 1 ? 's' : ''}
                  {hoveredDay.cats?.[0] ? ` · ${hoveredDay.cats[0].name}` : ''}
                </Typography>
                {hoveredDay.cats && hoveredDay.cats.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                    {hoveredDay.cats.slice(0, 5).map((c, i) => (
                      <Box key={i} sx={{
                        width: 44 * (c.amount / hoveredDay.total),
                        height: 3, borderRadius: 0.5, minWidth: 6,
                        bgcolor: [accents.cyan, accents.violet, accents.mint, accents.amber, accents.blue][i],
                        boxShadow: `0 0 6px ${[accents.cyan, accents.violet, accents.mint, accents.amber, accents.blue][i]}`,
                      }} />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Bottom scanlines / footer */}
            <Box sx={{
              position: 'absolute', bottom: 12, left: 20, right: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              pointerEvents: 'none',
            }}>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(180,190,220,0.35)' }}>
                DRAG · ROTATE   |   HOVER · INSPECT   |   SCROLL · ZOOM
              </Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(180,190,220,0.35)' }}>
                ● BIOSIGNAL STABLE
              </Typography>
            </Box>
          </Box>
        ) : (
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title="No heartbeat yet"
            description="Log spending this month and the organism will materialize — each transaction becomes matter in the field."
          />
        )}
      </Box>

      {/* Category legend — the taxonomy that colors the organism */}
      {hasData && categories.length > 0 && (
        <CategoryTaxonomy categories={categories} days={days} />
      )}
    </Box>
  );
}

/* ─── HUD building blocks ────────────────────────────────────────────────── */

function TelemetryRow({ stats }) {
  const items = [
    { k: 'SPEND', v: moneySmart(stats.totalSpent), c: accents.violet },
    { k: 'INCOME', v: moneySmart(stats.totalIncome), c: accents.mint },
    { k: 'NET', v: moneySmart(stats.net), c: stats.net >= 0 ? accents.mint : accents.red },
    { k: 'AVG/DAY', v: moneySmart(stats.avgDay), c: accents.cyan },
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

function TelemetryPanel({ pos, label, children }) {
  const p = {
    tl: { top: 16, left: 20, align: 'left' },
    tr: { top: 16, right: 20, align: 'right' },
    bl: { bottom: 48, left: 20, align: 'left' },
    br: { bottom: 48, right: 20, align: 'right' },
  }[pos];
  return (
    <Box sx={{
      position: 'absolute', ...p,
      minWidth: 140, pointerEvents: 'none',
      textAlign: p.align,
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        justifyContent: p.align === 'right' ? 'flex-end' : 'flex-start', mb: 0.5,
      }}>
        {p.align === 'right' && <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(100,210,255,0.2)', maxWidth: 40 }} />}
        <Typography sx={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.4em', color: accents.cyan, opacity: 0.8 }}>
          {label}
        </Typography>
        {p.align === 'left' && <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(100,210,255,0.2)', maxWidth: 40 }} />}
      </Box>
      {children}
    </Box>
  );
}

function MetricLine({ k, v, tone, muted }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
      <Typography sx={{ fontFamily: MONO, fontSize: 9, color: 'rgba(150,160,190,0.55)', letterSpacing: '0.14em' }}>
        {k}
      </Typography>
      <Typography sx={{
        fontFamily: MONO, fontSize: 12,
        color: muted ? 'rgba(180,190,220,0.5)' : (tone || '#e8ecf5'),
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>
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
  const palette = [accents.cyan, accents.violet, accents.mint, accents.amber, accents.blue, accents.purple, accents.red];
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
        ▸ MATERIALIZING…
      </Typography>
    </Box>
  );
}
