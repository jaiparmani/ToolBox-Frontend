import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Fab } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import { useAuth } from '../../contexts/AuthContext';
import { getMonthlyReport, getRecentExpenses, getLatestExpenseInsight, getCategories, getSplitBalances, yourShareOf } from '../rest/expenseTrackerApis';
import ProjectionChart from '../ui/ProjectionChart';
import DashPace from '../ui/DashPace';
import DashWeekdayPattern from '../ui/DashWeekdayPattern';
import DashSpendCalendar from '../ui/DashSpendCalendar';
import QuickAddExpense from '../ui/QuickAddExpense';
import AnimatedNumber from '../ui/AnimatedNumber';
import CursorGlow from '../motion/CursorGlow';
import Reveal from '../ui/Reveal';
import { money, moneySmart } from '../ui/money';
import { accents, type } from '../../theme/tokens';

const GREEN = accents.mint;
const greetOf = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } };
const Eyebrow = ({ children, sx }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled', ...sx }}>{children}</Typography>
);

const DONUT_SHADES = ['#35c98a', '#2ba377', '#3f6f5c', '#4a4a52', '#33333a', '#2a2a30'];
function CategoryDonut({ cats }) {
  const items = (cats || []).map((c) => ({ name: c.name, amount: Math.abs(Number(c.amount || 0)), color: c.color }))
    .filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = items.reduce((s, c) => s + c.amount, 0);
  if (!total) {
    return <Box sx={{ py: 3, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>No spending yet this month</Typography>
      <Typography sx={{ fontSize: 12, mt: 0.5, color: 'text.disabled' }}>Add an expense and the breakdown appears here.</Typography>
    </Box>;
  }
  const top = items.slice(0, 5);
  const otherAmt = items.slice(5).reduce((s, c) => s + c.amount, 0);
  const segs = otherAmt > 0 ? [...top, { name: 'Other', amount: otherAmt }] : top;
  let acc = 25; const R = 15.9, C = 2 * Math.PI * R;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <svg width="120" height="120" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {segs.map((s, i) => {
          const len = (s.amount / total) * 100; const dash = `${(len / 100) * C} ${C}`; const off = (acc / 100) * C; acc -= len;
          return <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={DONUT_SHADES[i]} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={off} transform="rotate(-90 21 21)" />;
        })}
        <text x="21" y="19.5" textAnchor="middle" fill="#f5f5f6" fontSize="4.6" fontWeight="600" fontFamily="sans-serif">{moneySmart(total)}</text>
        <text x="21" y="24.5" textAnchor="middle" fill="#77777f" fontSize="2.5" fontFamily="sans-serif">this month</text>
      </svg>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        {segs.map((s, i) => {
          const pct = (s.amount / total) * 100;
          return (
            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: DONUT_SHADES[i] }} />
                <Typography sx={{ flex: 1, fontSize: 12.5, color: 'text.secondary' }} noWrap>{s.name}</Typography>
                <Typography sx={{ ...num, fontSize: 12, color: 'text.primary', fontWeight: 550 }}>{money(s.amount)}</Typography>
                <Typography sx={{ ...num, fontSize: 11, color: 'text.disabled', width: 34, textAlign: 'right' }}>{Math.round(pct)}%</Typography>
              </Box>
              <Box aria-hidden sx={{ height: 3, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${Math.max(2, pct)}%`, borderRadius: 999, bgcolor: DONUT_SHADES[i] }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [recent, setRecent] = useState([]);
  const [insight, setInsight] = useState(null);
  const [categories, setCategories] = useState([]);
  const [balances, setBalances] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(() => {
    const now = new Date();
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    Promise.allSettled([
      getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
      getMonthlyReport(lm.getFullYear(), lm.getMonth() + 1),
      getRecentExpenses(),
      getLatestExpenseInsight(),
      getCategories({ type: 'expense' }),
      getSplitBalances(),
    ]).then(([r, l, rc, ins, cat, bal]) => {
      if (r.status === 'fulfilled') setReport(r.value);
      if (l.status === 'fulfilled') setLastReport(l.value ?? null);
      if (rc.status === 'fulfilled') setRecent(Array.isArray(rc.value) ? rc.value : []);
      if (ins.status === 'fulfilled') setInsight(ins.value);
      if (cat.status === 'fulfilled') setCategories(Array.isArray(cat.value) ? cat.value : (cat.value?.results || []));
      if (bal.status === 'fulfilled') setBalances(bal.value ?? null);
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  // open quick-add with the "a" shortcut (when not typing)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target; const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
        e.preventDefault(); setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const name = user?.firstName || user?.first_name || user?.username || 'there';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const spent = report?.total_amount ?? 0;
  const count = report?.total_count ?? 0;
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });

  // cumulative month-to-date spend → the trend line
  const trend = useMemo(() => {
    if (!report?.daily_totals) return [];
    const map = new Map(report.daily_totals.map((d) => [d.date, Number(d.total) || 0]));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const out = []; let cum = 0;
    for (let dt = new Date(start); dt <= now; dt.setDate(dt.getDate() + 1)) {
      const key = dt.toISOString().slice(0, 10);
      cum += map.get(key) || 0;
      out.push({ date: key, balance: cum });
    }
    return out;
  }, [report]);

  const cats = useMemo(
    () => (report?.category_totals || []).map((c) => ({ name: c.category__name, amount: c.total, color: c.category__color })),
    [report],
  );

  // fair comparison: this month-to-date vs the SAME stretch of last month
  const lastSamePeriod = useMemo(() => {
    if (!lastReport?.daily_totals) return null;
    const dayOfMonth = new Date().getDate();
    return lastReport.daily_totals.reduce((s, d) => {
      const dd = new Date(d.date).getDate();
      return dd <= dayOfMonth ? s + (Number(d.total) || 0) : s;
    }, 0);
  }, [lastReport]);
  const delta = (lastSamePeriod != null && lastSamePeriod > 0) ? ((spent - lastSamePeriod) / lastSamePeriod) * 100 : null;
  const avgPerDay = spent > 0 ? spent / new Date().getDate() : 0;
  const topCat = useMemo(() => {
    if (!cats.length) return null;
    return [...cats].sort((a, b) => b.amount - a.amount)[0];
  }, [cats]);

  // this month's rhythm — all factual, straight from the report (no projection)
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const rhythm = useMemo(() => {
    const dt = report?.daily_totals || [];
    const active = dt.filter((d) => (Number(d.total) || 0) > 0);
    const busiest = active.reduce((m, d) => (Number(d.total) > (m ? Number(m.total) : -1) ? d : m), null);
    return {
      avgPerTxn: count > 0 ? spent / count : 0,
      activeDays: active.length,
      busiest: busiest ? { date: busiest.date, total: Number(busiest.total) } : null,
    };
  }, [report, spent, count]);

  // money that's out but coming back — the counterpart to share-only spending
  const settle = useMemo(() => {
    if (!balances) return null;
    const owed = balances.totalOwedToYou || 0;
    const youOwe = balances.totalYouOwe || 0;
    if (owed <= 0 && youOwe <= 0) return null;
    const people = (balances.balances || []).filter((b) => b.owed > 0);
    const names = people.slice(0, 2).map((p) => p.name).join(', ');
    const label = people.length === 0
      ? (youOwe > 0 ? 'balances to settle' : '')
      : people.length === 1
        ? `from ${people[0].name}`
        : `across ${people.length} people · ${names}${people.length > 2 ? '…' : ''}`;
    return { owed, youOwe, label };
  }, [balances]);

  const insightText = insight ? (insight.summary || insight.text || insight.body || insight.message || (typeof insight === 'string' ? insight : null)) : null;

  const catName = (e) => e.category?.name || e.categoryName || e.category_name || (typeof e.category === 'string' ? e.category : '');
  const expAmount = (e) => Math.abs(Number(e.amount ?? e.amountValue ?? 0));

  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, md: 6 } }}>
      <CursorGlow />
      <Box sx={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── spending overview + the hero action ── */}
        <Box sx={{ pt: { xs: 0.5, md: 1 }, pb: { xs: 2.5, md: 3.5 }, borderBottom: '1px solid', borderColor: 'divider', mb: { xs: 2, md: 2.5 } }}>
          <Reveal index={0}>
            <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
            <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.35rem', sm: '1.5rem' }, fontWeight: 600, letterSpacing: '-0.03em', mt: 0.25 }}>
              {greetOf()}, {name}.
            </Typography>
          </Reveal>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center', mt: { xs: 2.5, md: 3 } }}>
            <Reveal index={1}>
              <Eyebrow>Spent this month</Eyebrow>
              <Typography component="div" sx={{ ...num, fontSize: { xs: '3.4rem', sm: '4.4rem', md: '4.9rem' }, fontWeight: 640, letterSpacing: '-0.045em', lineHeight: 0.92, mt: 1 }}>
                <AnimatedNumber value={spent} format="money" />
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.25, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
                  {count} {count === 1 ? 'expense' : 'expenses'} · {monthName}
                </Typography>
                {delta != null && (
                  <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600, color: delta <= 0 ? GREEN : accents.amber }}>
                    {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs last month to date
                  </Typography>
                )}
              </Box>

              {/* data-true micro-stats */}
              {spent > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1.75 }}>
                  <Box>
                    <Typography sx={{ ...num, fontSize: 15, fontWeight: 600 }}>{money(avgPerDay)}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em' }}>avg / day</Typography>
                  </Box>
                  {topCat && (
                    <>
                      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider' }} />
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topCat.name}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em' }}>top category · {money(topCat.amount)}</Typography>
                      </Box>
                    </>
                  )}
                </Box>
              )}

              {/* hero action */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
                <Box role="button" tabIndex={0} onClick={() => setAddOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAddOpen(true); } }}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, pl: 1.75, pr: 2.25, py: 1.15, borderRadius: 999, cursor: 'pointer',
                    bgcolor: GREEN, color: '#04150e', fontWeight: 650, fontSize: 14.5,
                    transition: 'transform .12s ease, filter .12s ease',
                    '&:hover': { transform: 'translateY(-1px)', filter: 'brightness(1.05)' },
                    '&:active': { transform: 'scale(0.98)' },
                    '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 3 } }}>
                  <AddRoundedIcon sx={{ fontSize: 20 }} /> Add expense
                </Box>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>
                  or press <Box component="span" sx={{ px: 0.6, py: 0.1, borderRadius: '5px', border: '1px solid', borderColor: 'divider', fontWeight: 700 }}>A</Box>
                </Typography>
              </Box>
            </Reveal>

            <Reveal index={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                <Eyebrow>Spending this month</Eyebrow>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>cumulative · hover to inspect</Typography>
              </Box>
              <ProjectionChart series={trend} accent={GREEN} height={200} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>1 {monthName.slice(0, 3)}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Today · {money(spent)}</Typography>
              </Box>
            </Reveal>
          </Box>
        </Box>

        {/* ── insight ── */}
        {insightText && (
          <Reveal index={3}>
            <Box sx={{ ...cardSx, display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: { xs: 2, md: 2.5 } }}>
              <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: `${accents.violet}1f` }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: accents.violet }} />
              </Box>
              <Box>
                <Eyebrow sx={{ mb: 0.25 }}>Insight</Eyebrow>
                <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.5 }}>{insightText}</Typography>
              </Box>
            </Box>
          </Reveal>
        )}

        {/* ── this month's rhythm — factual stats ── */}
        {spent > 0 && (
          <Reveal index={4}>
            <Box sx={{ ...cardSx, mb: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'stretch', p: { xs: 1.75, sm: 2.25 } }}>
              {[
                { label: 'Transactions', value: String(count) },
                { label: 'Avg / transaction', value: money(rhythm.avgPerTxn) },
                { label: 'Active days', value: `${rhythm.activeDays} of ${daysInMonth}` },
                ...(rhythm.busiest ? [{ label: 'Busiest day', value: money(rhythm.busiest.total), sub: new Date(rhythm.busiest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }] : []),
              ].map((s, i) => (
                <Box key={s.label} sx={{ flex: 1, minWidth: 0, px: { xs: 1, sm: 1.75 }, borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ ...num, fontSize: { xs: 17, sm: 20 }, fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1.05 }} noWrap>{s.value}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em', mt: 0.4 }} noWrap>{s.label}{s.sub ? ` · ${s.sub}` : ''}</Typography>
                </Box>
              ))}
            </Box>
          </Reveal>
        )}

        {/* ── pace | weekday — two factual reads, side by side for density ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: { xs: 2, md: 2.5 }, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
          <Reveal index={5} sx={{ flex: '1 1 300px', minWidth: 0, '&:empty': { display: 'none' } }}>
            <DashPace spent={spent} dayOfMonth={new Date().getDate()} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} />
          </Reveal>
          <Reveal index={6} sx={{ flex: '1 1 300px', minWidth: 0, '&:empty': { display: 'none' } }}>
            <DashWeekdayPattern dailyTotals={report?.daily_totals || []} />
          </Reveal>
        </Box>

        {/* ── daily-spend heatmap | owed to you ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: { xs: 2, md: 2.5 }, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
          <Reveal index={7} sx={{ flex: '1 1 320px', minWidth: 0, '&:empty': { display: 'none' } }}>
            <DashSpendCalendar dailyTotals={report?.daily_totals || []} />
          </Reveal>
          {settle && (
            <Reveal index={8} sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Box
                role="button" tabIndex={0} onClick={() => navigate('/splits')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/splits'); } }}
                aria-label={`Owed to you ${money(settle.owed)}${settle.youOwe > 0 ? `, you owe ${money(settle.youOwe)}` : ''}. Open splits.`}
                sx={{ ...cardSx, height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
                  transition: 'border-color .12s ease', '&:hover': { borderColor: 'text.disabled' },
                  '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 2 } }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Eyebrow>Owed to you</Eyebrow>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ ...num, fontSize: { xs: 24, sm: 28 }, fontWeight: 640, letterSpacing: '-0.03em', color: GREEN, lineHeight: 1 }}>{money(settle.owed)}</Typography>
                    {settle.youOwe > 0 && (
                      <Typography sx={{ ...num, fontSize: 12.5, color: accents.amber }}>· you owe {money(settle.youOwe)}</Typography>
                    )}
                  </Box>
                  {settle.label && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }} noWrap>{settle.label}</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary', flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}>
                  Settle up <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
                </Box>
              </Box>
            </Reveal>
          )}
        </Box>

        {/* ── category breakdown | recent activity ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
          <Reveal index={9} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Where it went</Typography>
              <Typography onClick={() => navigate('/reports')} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>Insights</Typography>
            </Box>
            <CategoryDonut cats={cats} />
          </Reveal>

          <Reveal index={10} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Recent</Typography>
              <Typography onClick={() => navigate('/expense-tracker')} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.4, '&:hover': { color: 'text.primary' } }}>
                View all <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
              </Typography>
            </Box>
            {recent.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}><Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>No expenses yet — add your first.</Typography></Box>
            ) : recent.slice(0, 8).map((e, i, arr) => (
              <Box key={e.id ?? i} onClick={() => navigate('/expense-tracker')}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.4, py: 0.85, cursor: 'pointer',
                  borderBottom: i === Math.min(arr.length, 8) - 1 ? 'none' : '1px solid', borderColor: 'divider',
                  mx: -1, px: 1, borderRadius: 2, transition: 'background-color .12s ease', '&:hover': { bgcolor: 'action.hover' } }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: e.category?.color || accents.blue }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.75, fontWeight: 550 }} noWrap>{e.description || catName(e) || 'Expense'}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
                    {catName(e)}{catName(e) && e.date ? ' · ' : ''}{e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    {e.isSplit ? ` · split of ${money(expAmount(e))}` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ ...num, fontSize: 13, fontWeight: 600 }}>−{money(yourShareOf(e))}</Typography>
              </Box>
            ))}
          </Reveal>
        </Box>
      </Box>

      {/* floating add (mobile-friendly, always reachable) */}
      <Fab onClick={() => setAddOpen(true)} aria-label="Add expense"
        sx={{ position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 }, zIndex: 20, bgcolor: GREEN, color: '#04150e', boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)', '&:hover': { bgcolor: GREEN, filter: 'brightness(1.05)' } }}>
        <AddRoundedIcon />
      </Fab>

      <QuickAddExpense open={addOpen} onClose={() => setAddOpen(false)} categories={categories} onAdded={load} />
    </Box>
  );
}
