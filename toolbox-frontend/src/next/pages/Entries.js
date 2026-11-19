/** "All entries": every page of the book, newest month first, searchable. */
import React, { useMemo, useState } from 'react';
import { useLedger, bookLines, inr, monthName, dayLabel, sameDayDupes } from '../ledger';
import { ReceiptSlip, BookState } from './parts';
import LedgerRows from './LedgerRows';

const PAGE_MONTHS = 4;

export default function Entries({ onToast }) {
  const L = useLedger();
  const [q, setQ] = useState('');
  const [head, setHead] = useState(null);
  const [open, setOpen] = useState(null);
  const [shown, setShown] = useState(PAGE_MONTHS);
  const [dupesOnly, setDupesOnly] = useState(false);

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
      let lines = bookLines(L.expenses, ym, L.cancelled).filter((e) => (head == null || (e.category?.id ?? 'none') === head)
        && (!needle || `${e.description || ''} ${e.category?.name || ''} ${(e.tags || []).map((t) => t.name).join(' ')}`.toLowerCase().includes(needle)));
      if (dupesOnly) {
        // Keep open pairs, and keep a just-combined line beside its cancelled twin.
        const ids = new Set(sameDayDupes(lines).flatMap((g) => g.rows.map((r) => r.id)));
        const key = (e) => `${e.day}|${Number(e.amount).toFixed(2)}|${e.category?.id ?? 'none'}`;
        const twinKeys = new Set(lines.filter((e) => e.cancelled).map(key));
        lines = lines.filter((e) => ids.has(e.id) || twinKeys.has(key(e)));
      }
      // Re-mark each day's first line after filtering, so the date always shows.
      lines = lines.map((e, i) => ({ ...e, firstOfDay: i === 0 || lines[i - 1].day !== e.day }));
      return { ym, lines, total: lines.filter((e) => !e.cancelled).reduce((s, e) => s + e.spend, 0) };
    }).filter((p) => p.lines.length);
  }, [L.expenses, L.months, L.cancelled, q, head, dupesOnly]);
  const dupeCount = useMemo(() => L.months.reduce((n, ym) => n + sameDayDupes(bookLines(L.expenses, ym, L.cancelled)).length, 0), [L.expenses, L.months, L.cancelled]);

  if (L.status !== 'ready') return <BookState status={L.status} error={L.error} retry={() => L.reload()} />;

  const count = pages.reduce((s, p) => s + p.lines.filter((e) => !e.cancelled).length, 0);
  const total = pages.reduce((s, p) => s + p.total, 0);
  const filtered = q.trim() || head != null || dupesOnly;

  return (
    <div className="nx-book">
      <article className="nx-page" aria-labelledby="nx-entries-h">
        <header className="nx-pagehead">
          <div>
            <h1 className="nx-h1" id="nx-entries-h">All entries</h1>
            <p className="nx-meta">{L.months.length} pages · {L.live.length} lines · spending only</p>
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
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Particulars, head or #tag, e.g. “swiggy”" />
          </label>
          {(dupeCount > 0 || dupesOnly) && (
            <button type="button" className={`nx-dupe-filter ${dupesOnly ? 'is-on' : ''}`} aria-pressed={dupesOnly} onClick={() => setDupesOnly((v) => !v)}>
              {dupesOnly ? 'Show every line' : `${dupeCount} possible ${dupeCount === 1 ? 'duplicate' : 'duplicates'} on the same day — review`}
            </button>
          )}
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
                <LedgerRows lines={p.lines} showRun={false} onOpen={setOpen} onToast={onToast} />
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
      <ReceiptSlip entry={open} ink={open ? L.inkFor(open.category?.id) : ''} onClose={() => setOpen(null)}
        onCancel={(e) => { L.cancelLine(e.id); onToast?.(`Cancelled ${inr(e.spend)} on ${dayLabel(e.day, { day: 'numeric', month: 'short' })}. Undo on the struck line.`); }}
        onCorrected={() => onToast?.('Correction saved.')} />
    </div>
  );
}
