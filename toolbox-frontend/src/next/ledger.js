/**
 * The data layer for the /next UI. One read of the user's expenses, shared by
 * every screen through context, plus pure month maths. Nothing here invents a
 * figure: every number the UI shows is derived from these rows.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getExpenses, getCategories, yourShareOf } from '../components/rest/expenseTrackerApis';

// ── Formatting ──────────────────────────────────────────────────────────────
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inr = (n) => `₹${inrFmt.format(Math.round(n || 0))}`;
export const inrExact = (n) => `₹${inrFmt2.format(n || 0)}`;

export const monthKey = (d) => d.slice(0, 7);                     // 'YYYY-MM-DD' -> 'YYYY-MM'
export const monthName = (ym, style = 'long') =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: style });
export const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export const dayLabel = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', opts);
export const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Month maths ─────────────────────────────────────────────────────────────
export function summarizeMonth(expenses, ym) {
  const rows = expenses.filter((e) => e.month === ym);
  const n = daysInMonth(ym);
  const perDay = Array.from({ length: n }, () => 0);
  const cats = new Map();
  let total = 0;
  let biggest = null;
  rows.forEach((e) => {
    total += e.spend;
    perDay[Number(e.day.slice(8, 10)) - 1] += e.spend;
    const key = e.category?.id ?? 'none';
    const c = cats.get(key) || { id: key, name: e.category?.name || 'Uncategorised', total: 0, count: 0 };
    c.total += e.spend; c.count += 1;
    cats.set(key, c);
    if (!biggest || e.spend > biggest.spend) biggest = e;
  });
  let run = 0;
  const cumulative = perDay.map((v) => (run += v));
  const byCategory = [...cats.values()].sort((a, b) => b.total - a.total);
  let heaviest = null;
  perDay.forEach((v, i) => { if (v > 0 && (!heaviest || v > heaviest.total)) heaviest = { day: i + 1, total: v }; });
  // Quietest stretch: the longest run of days with nothing spent.
  let quiet = { length: 0, from: 0 }; let cur = 0;
  perDay.forEach((v, i) => {
    if (v === 0) { cur += 1; if (cur > quiet.length) quiet = { length: cur, from: i - cur + 2 }; }
    else cur = 0;
  });
  // Week buckets (1–7, 8–14, …) for the story's horizontal track.
  const weeks = [];
  for (let s = 0; s < n; s += 7) {
    const slice = perDay.slice(s, s + 7);
    weeks.push({ from: s + 1, to: Math.min(s + 7, n), total: slice.reduce((a, b) => a + b, 0), days: slice });
  }
  const activeDays = perDay.filter((v) => v > 0).length;
  return { ym, rows, total, count: rows.length, perDay, cumulative, byCategory, biggest, heaviest, quiet, weeks, activeDays, days: n };
}

/** A month's lines in book order (oldest first) with the running total. */
export function bookLines(expenses, ym) {
  const rows = expenses.filter((e) => e.month === ym)
    .sort((a, b) => (a.day === b.day ? a.id - b.id : a.day < b.day ? -1 : 1));
  let run = 0;
  return rows.map((e, i) => {
    run += e.spend;
    return { ...e, run, firstOfDay: i === 0 || rows[i - 1].day !== e.day };
  });
}

// ── Context ─────────────────────────────────────────────────────────────────
const LedgerContext = createContext(null);

export function LedgerProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', expenses: [], categories: [], error: null });

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState((s) => ({ ...s, status: s.expenses.length ? 'ready' : 'loading', error: null }));
    try {
      let page = 1; let all = [];
      // Page through everything (100 per page, hard stop at 30 pages).
      while (page <= 30) {
        // eslint-disable-next-line no-await-in-loop
        const d = await getExpenses({ page, pageSize: 100, ordering: '-date' });
        all = all.concat(d.results || []);
        if (!d.next) break;
        page += 1;
      }
      const catRes = await getCategories().catch(() => ({ results: [] }));
      const categories = (catRes.results || catRes || []).filter((c) => c.transaction_type !== 'income' && c.is_active !== false);
      const expenses = all
        .filter((e) => e.type !== 'income')
        .map((e) => {
          const day = e.date.toISOString().slice(0, 10);
          return { ...e, day, month: monthKey(day), spend: yourShareOf(e) };
        });
      setState({ status: 'ready', expenses, categories, error: null });
    } catch (error) {
      setState((s) => ({ ...s, status: 'error', error }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const months = useMemo(
    () => [...new Set(state.expenses.map((e) => e.month))].sort(),
    [state.expenses],
  );

  // Default to this month; if it has nothing yet, the latest month that does.
  const [month, setMonth] = useState(null);
  useEffect(() => {
    if (month || !months.length) return;
    const now = todayIso().slice(0, 7);
    setMonth(months.includes(now) ? now : months[months.length - 1]);
  }, [months, month]);

  // Stable per-head stamp ink (six inks in next.css: .ink-0 … .ink-5), keyed by
  // category id so a head keeps its ink across months and pages.
  const inkFor = useMemo(() => {
    const ids = [...new Set([...state.categories.map((c) => c.id), ...state.expenses.map((e) => e.category?.id ?? 'none')])]
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    const map = new Map(ids.map((id, i) => [id, i % 6]));
    return (id) => `ink-${map.get(id ?? 'none') ?? 0}`;
  }, [state.categories, state.expenses]);

  const value = useMemo(() => ({
    ...state, months, month: month || todayIso().slice(0, 7), setMonth, reload: load, inkFor,
  }), [state, months, month, load, inkFor]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export const useLedger = () => useContext(LedgerContext);
