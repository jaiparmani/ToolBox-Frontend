/** "All entries": every page of the book, newest month first, searchable. */
import React, { useMemo, useState } from 'react';
import { useLedger, bookLines, inr, inrExact, monthName, dayLabel } from '../ledger';
import { Stamp, ReceiptSlip, BookState, tiltFor } from './parts';

const PAGE_MONTHS = 4;

export default function Entries() {
  const L = useLedger();
  const [q, setQ] = useState('');
  const [head, setHead] = useState(null);
  const [open, setOpen] = useState(null);
  const [shown, setShown] = useState(PAGE_MONTHS);

  const heads = useMemo(() => {
    const map = new Map();
    L.expenses.forEach((e) => {
      const id = e.category?.id ?? 'none';
      const h = map.get(id) || { id, name: e.category?.name || 'Unfiled', n: 0 };
      h.n += 1; map.set(id, h);
    });
    return [...map.values()].sort((a, b) => b.n - a.n);
  }, [L.expenses]);

  const pages = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...L.months].reverse().map((ym) => {
      const lines = bookLines(L.expenses, ym).filter((e) => (head == null || (e.category?.id ?? 'none') === head)
        && (!needle || `${e.description || ''} ${e.category?.name || ''}`.toLowerCase().includes(needle)));
      return { ym, lines, total: lines.reduce((s, e) => s + e.spend, 0) };
    }).filter((p) => p.lines.length);
  }, [L.expenses, L.months, q, head]);

  if (L.status !== 'ready') return <BookState status={L.status} error={L.error} retry={() => L.reload()} />;

  const count = pages.reduce((s, p) => s + p.lines.length, 0);
  const total = pages.reduce((s, p) => s + p.total, 0);
  const filtered = q.trim() || head != null;

  return (
    <div className="nx-book">
      <article className="nx-page" aria-labelledby="nx-entries-h">
        <header className="nx-pagehead">
          <div>
            <h1 className="nx-h1" id="nx-entries-h">All entries</h1>
            <p className="nx-meta">{L.months.length} pages · {L.expenses.length} lines in the book</p>
          </div>
          <div className="nx-pagehead-total">
            <span className="nx-meta">{filtered ? 'Matching lines' : 'Everything written'}</span>
            <span className="nx-total-v">{inr(total)}</span>
            <span className="nx-margin-note">{count} {count === 1 ? 'line' : 'lines'}</span>
          </div>
        </header>

        <div className="nx-find">
          <label className="nx-f nx-f--search">
            <span>Find</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Particulars or head, e.g. “swiggy”" />
          </label>
          <div className="nx-headpick" role="group" aria-label="Show one head">
            {heads.map((h) => (
              <button key={h.id} type="button" aria-pressed={head === h.id}
                className={`nx-stamp nx-stamp--pick ${L.inkFor(h.id)} ${head === h.id ? 'is-inked' : ''}`}
                onClick={() => setHead(head === h.id ? null : h.id)}>
                {h.name} <small>{h.n}</small>
              </button>
            ))}
          </div>
        </div>

        {pages.length === 0 && (
          <div className="nx-nothing">
            <p>No line matches “{q}”{head != null ? ' under that head' : ''}.</p>
            <button type="button" className="nx-btn nx-btn--quiet" onClick={() => { setQ(''); setHead(null); }}>Show every line</button>
          </div>
        )}

        {pages.slice(0, shown).map((p) => (
          <section key={p.ym} className="nx-month-block" aria-labelledby={`h-${p.ym}`}>
            <h2 className="nx-month-h" id={`h-${p.ym}`}>
              <span>{monthName(p.ym)} {p.ym.slice(0, 4)}</span>
              <span className="nx-month-h-sum">{p.lines.length} lines · {inr(p.total)}</span>
            </h2>
            <table className="nx-ledger nx-ledger--compact">
              <caption className="nx-sr">{monthName(p.ym)} {p.ym.slice(0, 4)}</caption>
              <tbody>
                {p.lines.map((e) => (
                  <tr key={e.id} className={`nx-line ${e.firstOfDay ? 'is-day' : ''}`} tabIndex={0}
                    onClick={() => setOpen(e)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen(e); } }}
                    aria-label={`${dayLabel(e.day, { day: 'numeric', month: 'short' })}, ${e.description || e.category?.name}, ${inrExact(e.spend)}. Open entry`}>
                    <td className="c-date">{e.firstOfDay && <><b>{Number(e.day.slice(8))}</b><i>{dayLabel(e.day, { weekday: 'short' })}</i></>}</td>
                    <td className="c-part">{e.description || <span className="nx-faint">{e.category?.name}</span>}{e.isSplit && <span className="nx-share">your share</span>}</td>
                    <td className="c-head"><Stamp name={e.category?.name || 'Unfiled'} ink={L.inkFor(e.category?.id)} tilt={tiltFor(e.id)} /></td>
                    <td className="c-amt">{inrExact(e.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {pages.length > shown && (
          <button type="button" className="nx-btn nx-btn--quiet nx-more" onClick={() => setShown((s) => s + PAGE_MONTHS)}>
            Turn to older pages ({pages.length - shown} more)
          </button>
        )}
      </article>
      <ReceiptSlip entry={open} ink={open ? L.inkFor(open.category?.id) : ''} onClose={() => setOpen(null)} />
    </div>
  );
}
