/**
 * The data layer for the /next UI. One read of the user's expenses, shared by
 * every screen through context, plus pure month maths. Nothing here invents a
 * figure: every number the UI shows is derived from these rows.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getExpenses, getCategories, getTags, deleteExpense, yourShareOf } from '../components/rest/expenseTrackerApis';

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
export function bookLines(expenses, ym, cancelled = new Set()) {
  const rows = expenses.filter((e) => e.month === ym)
    .sort((a, b) => (a.day === b.day ? a.id - b.id : a.day < b.day ? -1 : 1));
  let run = 0;
  return rows.map((e, i) => {
    const isCancelled = cancelled.has(e.id);
    if (!isCancelled) run += e.spend;
    return { ...e, run, cancelled: isCancelled, firstOfDay: i === 0 || rows[i - 1].day !== e.day };
  });
}

/** Words that mean money coming in; the book refuses to write these. */
export const CREDIT_WORDS = /\b(credited|credit(?:ed)? to|received|deposited|refund(?:ed)?|cashback|salary|income)\b/i;

/**
 * Same-day duplicates: lines on one day with the same amount and head. Returns
 * groups (oldest line first) the user hasn't already said are different.
 */
export function sameDayDupes(lines, dismissed = new Set()) {
  const g = new Map();
  lines.forEach((e) => {
    if (e.cancelled) return;
    const key = `${e.day}|${Number(e.amount).toFixed(2)}|${e.category?.id ?? 'none'}`;
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(e);
  });
  return [...g.entries()]
    .filter(([key, rows]) => rows.length > 1 && !dismissed.has(`${key}|${rows.map((r) => r.id).join(',')}`))
    .map(([key, rows]) => ({ key: `${key}|${rows.map((r) => r.id).join(',')}`, rows: [...rows].sort((a, b) => a.id - b.id) }));
}

// ── One-line entry ("60 chai with Ravi yesterday") ──────────────────────────
const WORD = /[a-z\u0900-\u097f]{3,}/gi;
const STOP = new Set(['with', 'for', 'the', 'and', 'from', 'today', 'yesterday', 'paid', 'spent', 'rupees']);
const words = (t) => (t.toLowerCase().match(WORD) || []).filter((w) => !STOP.has(w));

/**
 * Suggest a head for some particulars from the user's own history: the head
 * most often used on past lines that share a word with it. Returns null when
 * nothing in the book is similar — never a guess from nowhere.
 */
export function suggestHead(text, expenses) {
  const ws = new Set(words(text || ''));
  if (!ws.size) return null;
  const score = new Map();
  expenses.forEach((e) => {
    const id = e.category?.id; if (id == null) return;
    const hit = words(e.description || '').filter((w) => ws.has(w)).length;
    if (hit) score.set(id, (score.get(id) || 0) + hit);
  });
  let best = null;
  score.forEach((v, id) => { if (!best || v > best.v) best = { id, v }; });
  return best ? best.id : null;
}

/** Parse "₹60 chai with Ravi yesterday" into the blanks of a line. */
export function parseLine(text, today = todayIso()) {
  let t = ` ${text.trim()} `;
  let amount = null; let date = null;
  const m = t.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:₹|rs\.?|rupees|\/-)?/i);
  if (m) { amount = Number(m[1].replace(/,/g, '')); t = t.replace(m[0], ' '); }
  const shift = (n) => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  if (/\bday before yesterday\b/i.test(t)) { date = shift(2); t = t.replace(/\bday before yesterday\b/i, ' '); }
  else if (/\byesterday\b/i.test(t)) { date = shift(1); t = t.replace(/\byesterday\b/i, ' '); }
  else if (/\btoday\b/i.test(t)) { date = today; t = t.replace(/\btoday\b/i, ' '); }
  const part = t.replace(/\s+/g, ' ').replace(/^\s*(on|for|-|—)\s+/i, '').trim();
  return { amount: amount > 0 ? amount : null, date, part: part ? part.charAt(0).toUpperCase() + part.slice(1) : '' };
}

// ── Context ─────────────────────────────────────────────────────────────────
const LedgerContext = createContext(null);

export function LedgerProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', expenses: [], categories: [], tags: [], error: null });
  // Cancelled lines wait out an undo window before they are deleted on the server.
  const [cancelled, setCancelled] = useState(() => new Set());
  const timers = useRef(new Map());
  // Corrections made this session: id -> the amount it was before (shown struck).
  const [corrections, setCorrections] = useState({});

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
      const [catRes, tagRes] = await Promise.all([
        getCategories().catch(() => ({ results: [] })),
        getTags({ pageSize: 100 }).catch(() => ({ results: [] })),
      ]);
      const tags = tagRes.results || tagRes || [];
      const categories = (catRes.results || catRes || []).filter((c) => c.transaction_type === 'expense' && c.is_active !== false);
      const expenses = all
        // An expense book: only spending. Income and credits (refunds, money
        // received, credit alerts) never appear or count in any total.
        .filter((e) => e.type === 'expense')
        .map((e) => {
          const day = e.date.toISOString().slice(0, 10);
          return { ...e, day, month: monthKey(day), spend: yourShareOf(e) };
        });
      setState({ status: 'ready', expenses, categories, tags, error: null });
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

  const UNDO_MS = 6000;
  const cancelLine = useCallback((id) => {
    setCancelled((s) => new Set(s).add(id));
    const t = setTimeout(async () => {
      timers.current.delete(id);
      try { await deleteExpense(id); } catch { /* reload below shows the truth */ }
      await load({ quiet: true });
      setCancelled((s) => { const n = new Set(s); n.delete(id); return n; });
    }, UNDO_MS);
    timers.current.set(id, t);
  }, [load]);
  const undoCancel = useCallback((id) => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setCancelled((s) => { const n = new Set(s); n.delete(id); return n; });
  }, []);
  // Leaving /next inside the undo window still completes the cancellation.
  useEffect(() => () => {
    timers.current.forEach((t, id) => { clearTimeout(t); deleteExpense(id).catch(() => {}); });
  }, []);
  const noteCorrection = useCallback((id, before) => setCorrections((c) => ({ ...c, [id]: c[id] ?? before })), []);

  // Every total counts only lines that are not cancelled.
  const live = useMemo(() => state.expenses.filter((e) => !cancelled.has(e.id)), [state.expenses, cancelled]);

  const value = useMemo(() => ({
    ...state, live, months, month: month || todayIso().slice(0, 7), setMonth, reload: load, inkFor,
    cancelled, cancelLine, undoCancel, undoMs: UNDO_MS, corrections, noteCorrection,
  }), [state, live, months, month, load, inkFor, cancelled, cancelLine, undoCancel, corrections, noteCorrection]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export const useLedger = () => useContext(LedgerContext);
