import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMonthlyReport, getRecentExpenses, getLatestExpenseInsight,
  getCategories, getSplitBalances, getRecurring, getExpenseSummary,
} from '../rest/expenseTrackerApis';
import { computeSettle } from './settleSummary';

/**
 * The month's numbers, fetched and derived once so every screen that tells
 * its story (Home, Today) reads the same figures — no drift between two
 * copies of the same math.
 */
export default function useMonthlyDashboard() {
  const [report, setReport] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [recent, setRecent] = useState([]);
  const [insight, setInsight] = useState(null);
  const [categories, setCategories] = useState([]);
  const [balances, setBalances] = useState(null);
  const [recurring, setRecurring] = useState([]);
  const [monthIncome, setMonthIncome] = useState(null);
  const [history, setHistory] = useState([]);

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
      getRecurring(),
    ]).then(([r, l, rc, ins, cat, bal, rec]) => {
      if (r.status === 'fulfilled') setReport(r.value);
      if (l.status === 'fulfilled') setLastReport(l.value ?? null);
      if (rc.status === 'fulfilled') setRecent(Array.isArray(rc.value) ? rc.value : []);
      if (ins.status === 'fulfilled') setInsight(ins.value);
      if (cat.status === 'fulfilled') setCategories(Array.isArray(cat.value) ? cat.value : (cat.value?.results || []));
      if (bal.status === 'fulfilled') setBalances(bal.value ?? null);
      if (rec.status === 'fulfilled') setRecurring(Array.isArray(rec.value) ? rec.value : (rec.value?.results || []));
    });

    // month-to-date income + 6-month spend history — kept in a separate pass so the
    // main grid never waits on the extra monthly-report calls.
    const pad2 = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonths = [];
    for (let i = 5; i >= 0; i--) sixMonths.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    Promise.allSettled([
      getExpenseSummary({ dateFrom: iso(monthStart), dateTo: iso(now) }),
      ...sixMonths.map((d) => getMonthlyReport(d.getFullYear(), d.getMonth() + 1)),
    ]).then(([sum, ...mReports]) => {
      if (sum.status === 'fulfilled') setMonthIncome(sum.value?.totalIncome ?? 0);
      setHistory(mReports.map((m, i) => ({
        label: sixMonths[i].toLocaleDateString('en-IN', { month: 'short' }),
        total: m.status === 'fulfilled' ? (Number(m.value?.total_amount) || 0) : 0,
        ok: m.status === 'fulfilled',
        partial: i === sixMonths.length - 1,
      })));
    });
  }, []);
  useEffect(() => { load(); }, [load]);

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
    report, lastReport, recent, insight, insightText, categories, balances, recurring, monthIncome, history,
    dayOfMonth, daysInMonth, monthName, spent, count, trend, cats, topCat, delta, avgPerDay, rhythm, settle,
    reload: load,
  };
}
