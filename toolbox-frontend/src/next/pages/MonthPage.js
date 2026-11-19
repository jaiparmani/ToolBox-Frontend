/**
 * "This month": one page of the money book. The blank line at the top is
 * where you write; every line carries the month's running total in the margin;
 * the page closes with the carried-forward total.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { addExpenseApi } from '../../components/rest/expenseTrackerApis';
import {
  useLedger, bookLines, summarizeMonth, inr, inrExact, monthName, shiftMonth, dayLabel, todayIso,
} from '../ledger';
import { EASE, sec, DUR } from '../motionKit';
import { Stamp, ReceiptSlip, BookState, tiltFor } from './parts';

function MonthTabs({ months, current, onPick }) {
  return (
    <div className="nx-index" role="tablist" aria-label="Month">
      {months.map((ym) => (
        <button key={ym} type="button" role="tab" aria-selected={ym === current}
          className="nx-index-tab" onClick={() => onPick(ym)}>
          <span>{monthName(ym, 'short')}</span><small>{ym.slice(2, 4)}</small>
        </button>
      ))}
    </div>
  );
}

/** The month total. When a write changes it, the old figure stays, struck through. */
function Total({ value, struck }) {
  const reduce = useReducedMotion();
  return (
    <div className="nx-total" aria-live="polite">
      <AnimatePresence>
        {struck != null && (
          <m.s key={`s${struck}`} className="nx-total-old" aria-label={`was ${inr(struck)}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {inr(struck)}
          </m.s>
        )}
      </AnimatePresence>
      <m.span key={value} className="nx-total-v"
        initial={struck != null && !reduce ? { clipPath: 'inset(0% 100% 0% 0%)' } : false}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: sec(DUR.slower), ease: EASE, delay: 0.2 }}>
        {inr(value)}
      </m.span>
    </div>
  );
}

function WriteLine({ month, onWritten }) {
  const L = useLedger();
  const isCurrent = month === todayIso().slice(0, 7);
  const lastDay = `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(isCurrent ? todayIso() : lastDay);
  const [part, setPart] = useState('');
  const [amount, setAmount] = useState('');
  const [head, setHead] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const partRef = useRef(null);
  useEffect(() => { setDate(isCurrent ? todayIso() : lastDay); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heads you use most come first.
  const heads = useMemo(() => {
    const freq = {};
    L.expenses.forEach((e) => { const k = e.category?.id; if (k != null) freq[k] = (freq[k] || 0) + 1; });
    return [...L.categories].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  }, [L.categories, L.expenses]);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    const errs = {};
    if (!(n > 0)) errs.amount = 'an amount above ₹0';
    if (!head) errs.head = 'a head';
    if (!date) errs.date = 'a date';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const saved = await addExpenseApi({ amount: n, categoryId: head, description: part.trim() || undefined, date, transactionType: 'expense' });
      setPart(''); setAmount(''); setHead(null);
      await onWritten(saved, date.slice(0, 7));
      partRef.current?.focus();
    } catch (err) {
      setErrors({ form: err?.message || 'Could not write this line. Check your connection and try again.' });
    } finally { setBusy(false); }
  };

  const missing = ['amount', 'head', 'date'].filter((k) => errors[k]).map((k) => errors[k]);
  return (
    <form className="nx-write" onSubmit={submit} noValidate aria-label="Write a line">
      <label className="nx-f nx-f--date">
        <span>Date</span>
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
      </label>
      <label className="nx-f nx-f--part">
        <span>Particulars</span>
        <input ref={partRef} value={part} maxLength={120} onChange={(e) => setPart(e.target.value)} placeholder="What was it for?" autoComplete="off" />
      </label>
      <label className="nx-f nx-f--amt">
        <span>Amount (₹)</span>
        <input inputMode="decimal" value={amount} placeholder="0" aria-invalid={!!errors.amount} aria-describedby="nx-write-err"
          onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, '')); setErrors((x) => ({ ...x, amount: undefined })); }} />
      </label>
      <fieldset className="nx-f nx-f--heads" aria-describedby="nx-write-err">
        <legend>Head</legend>
        <div className="nx-headpick">
          {heads.map((c) => (
            <button key={c.id} type="button" aria-pressed={head === c.id}
              className={`nx-stamp nx-stamp--pick ${L.inkFor(c.id)} ${head === c.id ? 'is-inked' : ''}`}
              onClick={() => { setHead(c.id); setErrors((x) => ({ ...x, head: undefined })); }}>
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <button className="nx-btn nx-write-go" type="submit" disabled={busy}>{busy ? 'Writing…' : 'Write a line'}</button>
      <p className="nx-write-err" id="nx-write-err" role="alert">
        {missing.length ? `To write this line, add ${missing.join(', ')}.` : errors.form || ''}
      </p>
    </form>
  );
}

export default function MonthPage({ onToast }) {
  const L = useLedger();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [struck, setStruck] = useState(null);
  const [open, setOpen] = useState(null);
  const [turn, setTurn] = useState(0);

  const lines = useMemo(() => bookLines(L.expenses, L.month), [L.expenses, L.month]);
  const sum = useMemo(() => summarizeMonth(L.expenses, L.month), [L.expenses, L.month]);
  const prev = useMemo(() => summarizeMonth(L.expenses, shiftMonth(L.month, -1)), [L.expenses, L.month]);
  useEffect(() => { setStruck(null); setFilter(null); }, [L.month]);

  if (L.status !== 'ready') return <BookState status={L.status} error={L.error} retry={() => L.reload()} />;

  const now = todayIso().slice(0, 7);
  const tabs = [...new Set([...L.months, now])].sort().slice(-7);
  const pageNo = String(L.months.indexOf(L.month) + 1 || L.months.length + 1).padStart(2, '0');
  const isCurrent = L.month === now;
  const delta = prev.count ? sum.total - prev.total : null;

  const pick = (ym) => { if (ym === L.month) return; setTurn((t) => t + 1); L.setMonth(ym); };
  const written = async (saved, ym) => {
    const before = summarizeMonth(L.expenses, ym).total;
    await L.reload({ quiet: true });
    if (ym !== L.month) { setTurn((t) => t + 1); L.setMonth(ym); }
    setStruck(before > 0 ? before : null);
    setFresh(saved?.id ?? null);
    onToast?.(`Written: ${inr(saved?.amount || 0)} on ${dayLabel(saved?.date?.toISOString?.().slice(0, 10) || `${ym}-01`, { day: 'numeric', month: 'short' })}`);
  };

  return (
    <div className="nx-book">
      <MonthTabs months={tabs} current={L.month} onPick={pick} />
      <m.article key={`${L.month}-${turn}`} className="nx-page"
        initial={turn && !reduce ? { clipPath: 'inset(0% 0% 0% 100%)' } : false}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)', transitionEnd: { clipPath: 'none' } }}
        transition={{ duration: sec(DUR.slower), ease: EASE }}
        aria-labelledby="nx-month-h">
        <header className="nx-pagehead">
          <div>
            <h1 className="nx-h1" id="nx-month-h">{monthName(L.month)} {L.month.slice(0, 4)}</h1>
            <p className="nx-meta">
              Page {pageNo} · {sum.count} {sum.count === 1 ? 'line' : 'lines'} · amounts in ₹
              {!isCurrent && L.month === L.months[L.months.length - 1] && ` · nothing written in ${monthName(now)} yet`}
            </p>
          </div>
          <div className="nx-pagehead-total">
            <span className="nx-meta">Spent {isCurrent ? 'so far' : 'this month'}</span>
            <Total value={sum.total} struck={struck} />
            {delta != null && (
              <span className={`nx-margin-note ${delta > 0 ? 'is-more' : 'is-less'}`}>
                {inr(Math.abs(delta))} {delta > 0 ? 'more' : 'less'} than {monthName(prev.ym)}
              </span>
            )}
          </div>
        </header>

        <WriteLine month={L.month} onWritten={written} />

        <table className="nx-ledger">
          <caption className="nx-sr">Every line in {monthName(L.month)}, with the running total</caption>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Particulars</th><th scope="col">Head</th><th scope="col" className="r">Amount</th><th scope="col" className="r">To date</th></tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr className="nx-line nx-line--empty"><td colSpan={5}>No lines on this page yet. Write the first one above.</td></tr>
            )}
            {lines.map((e) => (
              <m.tr key={e.id} layout={reduce ? false : 'position'} transition={{ duration: sec(DUR.slow), ease: EASE }}
                className={`nx-line ${e.firstOfDay ? 'is-day' : ''} ${filter != null && (e.category?.id ?? 'none') !== filter ? 'is-dim' : ''} ${fresh === e.id ? 'is-fresh' : ''}`}
                onClick={() => setOpen(e)} tabIndex={0}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen(e); } }}
                aria-label={`${dayLabel(e.day, { day: 'numeric', month: 'short' })}, ${e.description || e.category?.name}, ${inrExact(e.spend)}. Open entry`}>
                <td className="c-date">{e.firstOfDay && <><b>{Number(e.day.slice(8))}</b><i>{dayLabel(e.day, { weekday: 'short' })}</i></>}</td>
                <td className="c-part">{e.description || <span className="nx-faint">{e.category?.name || 'No particulars'}</span>}{e.isSplit && <span className="nx-share">your share</span>}</td>
                <td className="c-head"><Stamp name={e.category?.name || 'Unfiled'} ink={L.inkFor(e.category?.id)} fresh={fresh === e.id} tilt={tiltFor(e.id)} /></td>
                <td className="c-amt">{inrExact(e.spend)}</td>
                <td className="c-run">{inr(e.run)}</td>
              </m.tr>
            ))}
          </tbody>
        </table>

        <div className="nx-close">
          <p><span className="nx-meta">Carried forward</span><br />Total spent in {monthName(L.month)}</p>
          <span className="nx-close-v">{inr(sum.total)}</span>
        </div>

        {sum.byCategory.length > 0 && (
          <section className="nx-heads" aria-labelledby="nx-heads-h">
            <h2 className="nx-h2" id="nx-heads-h">Heads of account</h2>
            <p className="nx-meta">Choose a head to mark its lines.</p>
            <ul>
              {sum.byCategory.map((c) => {
                const on = filter === c.id;
                return (
                  <li key={c.id}>
                    <button type="button" className="nx-headrow" aria-pressed={on} onClick={() => setFilter(on ? null : c.id)}>
                      <Stamp name={c.name} ink={L.inkFor(c.id)} />
                      <span className="nx-headrow-n">{c.count} {c.count === 1 ? 'line' : 'lines'}</span>
                      <span className="nx-hatch" style={{ '--w': c.total / sum.byCategory[0].total }} aria-hidden="true" />
                      <span className="nx-headrow-v">{inr(c.total)}</span>
                      <span className="nx-headrow-p">{Math.round((c.total / sum.total) * 100)}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </m.article>
      <ReceiptSlip entry={open} ink={open ? L.inkFor(open.category?.id) : ''} onClose={() => setOpen(null)} />
    </div>
  );
}
