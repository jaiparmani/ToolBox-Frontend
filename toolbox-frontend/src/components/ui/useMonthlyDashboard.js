import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getMonthlyReport, getRecentExpenses, getLatestExpenseInsight,
  getCategories, getSplitBalances, getRecurring, getMoneyPulse,
} from '../rest/expenseTrackerApis';
import { computeSettle } from './settleSummary';

/**
 * The month's numbers, fetched and derived once so every screen that tells
 * its story (Home, Today) reads the same figures — no drift between two
 * copies of the same math.
 *
 * It also reports *how the fetch is going*, because a dashboard that renders
 * nothing until data lands reads as broken (Apple Design §16: expose ongoing
 * status; status, warning and error are different kinds of feedback). The two
 * waves are tracked separately — `status.primary` covers the main grid,
 * `status.secondary` the 6-month history pass — so a screen can hold
 * the right geometry for each and never reflow when the second one lands.
 * These keys are purely additive; every figure below keeps its old shape.
 */
const SLOW_AFTER_MS = 5000;

export default function useMonthlyDashboard() {
  const [report, setReport] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [recent, setRecent] = useState([]);
  const [insight, setInsight] = useState(null);
  const [categories, setCategories] = useState([]);
  const [balances, setBalances] = useState(null);
  const [recurring, setRecurring] = useState([]);
  const [history, setHistory] = useState([]);
  const [pulse, setPulse] = useState(null);

  // 'loading' → 'ready' | 'error' per wave. 'error' means *nothing* in that
  // wave came back; a partial failure still counts as ready, because the cards
  // that did get data are honest on their own.
  const [primary, setPrimary] = useState('loading');
  const [secondary, setSecondary] = useState('loading');
  const [slow, setSlow] = useState(false);
  const runRef = useRef(0);
  const slowTimerRef = useRef(null);

  const load = useCallback(() => {
    const run = ++runRef.current;
    const live = () => runRef.current === run;
    setPrimary('loading');
    setSecondary('loading');
    setSlow(false);
    clearTimeout(slowTimerRef.current);
    // Honest status, not a fake progress bar: past a few seconds we say so.
    slowTimerRef.current = setTimeout(() => { if (live()) setSlow(true); }, SLOW_AFTER_MS);

    const now = new Date();
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    Promise.allSettled([
      getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
      getMonthlyReport(lm.getFullYear(), lm.getMonth() + 1),
      getRecentExpenses(),
      getLatestExpenseInsight(),
      getCategories({ type: 'expense' }),
      getSplitBalances(),
      getRecurring(),
      getMoneyPulse(),
    ]).then((results) => {
      const [r, l, rc, ins, cat, bal, rec, p] = results;
      if (!live()) return;
      setPrimary(results.some((x) => x.status === 'fulfilled') ? 'ready' : 'error');
      if (r.status === 'fulfilled') setReport(r.value);
      if (l.status === 'fulfilled') setLastReport(l.value ?? null);
      if (rc.status === 'fulfilled') setRecent(Array.isArray(rc.value) ? rc.value : []);
      if (ins.status === 'fulfilled') setInsight(ins.value);
      if (cat.status === 'fulfilled') setCategories(Array.isArray(cat.value) ? cat.value : (cat.value?.results || []));
      if (bal.status === 'fulfilled') setBalances(bal.value ?? null);
      if (rec.status === 'fulfilled') setRecurring(Array.isArray(rec.value) ? rec.value : (rec.value?.results || []));
      if (p.status === 'fulfilled') setPulse(p.value ?? null);
    });

    // 6-month spend history — kept in a separate pass so the main grid never
    // waits on the extra monthly-report calls.
    const sixMonths = [];
    for (let i = 5; i >= 0; i--) sixMonths.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    Promise.allSettled(
      sixMonths.map((d) => getMonthlyReport(d.getFullYear(), d.getMonth() + 1)),
    ).then((mReports) => {
      if (!live()) return;
      setSecondary(mReports.some((m) => m.status === 'fulfilled') ? 'ready' : 'error');
      setHistory(mReports.map((m, i) => ({
        label: sixMonths[i].toLocaleDateString('en-IN', { month: 'short' }),
        total: m.status === 'fulfilled' ? (Number(m.value?.total_amount) || 0) : 0,
        ok: m.status === 'fulfilled',
        partial: i === sixMonths.length - 1,
      })));
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(slowTimerRef.current), []);
  // Once both waves have settled there is nothing left to be slow about.
  useEffect(() => {
    if (primary !== 'loading' && secondary !== 'loading') {
      clearTimeout(slowTimerRef.current);
      setSlow(false);
    }
  }, [primary, secondary]);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long' });

  const spent = report?.total_amount ?? 0;
  const count = report?.total_count ?? 0;

  // cumulative month-to-date spend → the trend line
  const trend = useMemo(() => {
    if (!report?.daily_totals) return [];
    const map = new Map(report.daily_totals.map((d) => [d.date, Number(d.total) || 0]));
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), 1);
    const out = []; let cum = 0;
    for (let dt = new Date(start); dt <= n; dt.setDate(dt.getDate() + 1)) {
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
    return lastReport.daily_totals.reduce((s, d) => {
      const dd = new Date(d.date).getDate();
      return dd <= dayOfMonth ? s + (Number(d.total) || 0) : s;
    }, 0);
  }, [lastReport, dayOfMonth]);
  const delta = (lastSamePeriod != null && lastSamePeriod > 0) ? ((spent - lastSamePeriod) / lastSamePeriod) * 100 : null;
  const avgPerDay = spent > 0 ? spent / dayOfMonth : 0;
  const topCat = useMemo(() => (cats.length ? [...cats].sort((a, b) => b.amount - a.amount)[0] : null), [cats]);

  // this month's rhythm — all factual, straight from the report (no projection)
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
  const settle = useMemo(() => computeSettle(balances), [balances]);

  const insightText = insight ? (insight.summary || insight.text || insight.body || insight.message || (typeof insight === 'string' ? insight : null)) : null;

  return {
    report, lastReport, recent, insight, insightText, categories, balances, recurring, history, pulse,
    dayOfMonth, daysInMonth, monthName, spent, count, trend, cats, topCat, delta, avgPerDay, rhythm, settle,
    reload: load,
    // ── fetch status (additive; existing consumers can ignore it) ──
    status: {
      primary,                       // 'loading' | 'ready' | 'error'  → the main grid
      secondary,                     // 'loading' | 'ready' | 'error'  → the 6-month history
      loading: primary === 'loading' || secondary === 'loading',
      slow,                          // taking longer than usual — status, not an error
      failed: primary === 'error',   // nothing at all came back
    },
  };
}
