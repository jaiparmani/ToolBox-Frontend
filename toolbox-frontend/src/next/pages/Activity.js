import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as m, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { useLedger, inr, inrExact, dayLabel } from '../ledger';
import { MaskText, EASE, EMPHASIS, sec } from '../motionKit';
import { motion as T } from '../../theme/tokens';
import { ExpenseRow, LoadState } from './shared';

const PAGE = 80;

export default function Activity({ onAdd }) {
  const L = useLedger();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);

  useEffect(() => setLimit(PAGE), [q, cat]);

  const usedCats = useMemo(() => {
    const map = new Map();
    L.expenses.forEach((e) => {
      const id = e.category?.id ?? 'none';
      const c = map.get(id) || { id, name: e.category?.name || 'Uncategorised', n: 0 };
      c.n += 1; map.set(id, c);
    });
    return [...map.values()].sort((a, b) => b.n - a.n);
  }, [L.expenses]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return L.expenses.filter((e) => (cat === 'all' || (e.category?.id ?? 'none') === cat)
      && (!needle || `${e.description || ''} ${e.category?.name || ''}`.toLowerCase().includes(needle)));
  }, [L.expenses, q, cat]);

  const total = filtered.reduce((s, e) => s + e.spend, 0);
  const groups = useMemo(() => {
    const out = []; let cur = null;
    filtered.slice(0, limit).forEach((e) => {
      if (!cur || cur.day !== e.day) { cur = { day: e.day, items: [], total: 0 }; out.push(cur); }
      cur.items.push(e); cur.total += e.spend;
    });
    return out;
  }, [filtered, limit]);

  if (L.status !== 'ready' || !L.expenses.length) {
    return <LoadState status={L.status} error={L.error} retry={() => L.reload()} empty={!L.expenses.length} onAdd={onAdd} />;
  }

  return (
    <div className="nx-activity">
      <header className="nx-head nx-head--stack">
        <div>
          <p className="nx-eyebrow">Every expense, newest first</p>
          <h1 className="nx-h1"><MaskText text="Activity" /></h1>
        </div>
        <p className="nx-summary" aria-live="polite">
          <strong className="nx-num">{filtered.length}</strong> {filtered.length === 1 ? 'expense' : 'expenses'} · <strong className="nx-num">{inr(total)}</strong>
        </p>
      </header>

      <div className="nx-toolbar">
        <label className="nx-search">
          <SearchRounded fontSize="small" aria-hidden="true" />
          <span className="nx-sr">Search expenses</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or category" type="search" />
          {q && <button type="button" className="nx-icon-btn nx-icon-btn--sm" onClick={() => setQ('')} aria-label="Clear search"><CloseRounded fontSize="inherit" /></button>}
        </label>
        <LayoutGroup id="filters">
          <div className="nx-filter" role="radiogroup" aria-label="Filter by category">
            {[{ id: 'all', name: 'All', n: L.expenses.length }, ...usedCats].map((c) => {
              const on = cat === c.id;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on} className={`nx-filter-btn ${on ? 'is-on' : ''}`}
                  onClick={(ev) => { setCat(c.id); ev.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' }); }} style={{ '--c': c.id === 'all' ? 'var(--nx-text)' : L.colorFor(c.id) }}>
                  {on && <m.span layoutId="nx-filter-pill" className="nx-filter-pill" transition={{ duration: sec(T.slow), ease: EMPHASIS }} />}
                  <span className="nx-filter-text">{c.id !== 'all' && <i className="nx-dot" />}{c.name}<span className="nx-filter-n">{c.n}</span></span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {filtered.length === 0 ? (
        <div className="nx-state nx-state--inline">
          <h2 className="nx-h2">No expenses match “{q}”</h2>
          <p className="nx-muted">Try a shorter word, or clear the category filter.</p>
          <button type="button" className="nx-btn nx-btn--ghost" onClick={() => { setQ(''); setCat('all'); }}>Clear filters</button>
        </div>
      ) : (
        <LayoutGroup id="rows">
          <div className="nx-days">
            <AnimatePresence initial={false} mode="popLayout">
              {groups.map((g, gi) => (
                <m.section key={g.day} className="nx-day" layout={reduce ? false : 'position'}
                  initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: sec(T.normal), ease: EASE, delay: Math.min(gi, 6) * 0.03 }}>
                  <h2 className="nx-day-h">
                    <span>{dayLabel(g.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="nx-num">{inr(g.total)}</span>
                  </h2>
                  <ul className="nx-rows">
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <m.div layoutId={reduce ? undefined : `exp-${e.id}`} className="nx-row-wrap">
                          <ExpenseRow e={e} color={L.colorFor(e.category?.id)} onOpen={setOpen} showDate={false} />
                        </m.div>
                      </li>
                    ))}
                  </ul>
                </m.section>
              ))}
            </AnimatePresence>
          </div>
          {filtered.length > limit && (
            <button type="button" className="nx-btn nx-btn--ghost nx-more" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more
            </button>
          )}

          {createPortal(<AnimatePresence>
            {open && (
              <div className="nx-detail-root" onKeyDown={(ev) => ev.key === 'Escape' && setOpen(null)}>
                <m.div className="nx-scrim" onClick={() => setOpen(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <m.div layoutId={reduce ? undefined : `exp-${open.id}`} className="nx-detail" role="dialog" aria-modal="true" aria-labelledby="nx-detail-h"
                  transition={{ duration: sec(T.slow), ease: EASE }} style={{ '--c': L.colorFor(open.category?.id) }}>
                  <div className="nx-detail-head">
                    <span className="nx-pill nx-pill--cat"><i className="nx-dot" />{open.category?.name || 'Uncategorised'}</span>
                    <button type="button" className="nx-icon-btn" onClick={() => setOpen(null)} aria-label="Close" autoFocus><CloseRounded fontSize="small" /></button>
                  </div>
                  <p className="nx-detail-amt nx-num">{inrExact(open.spend)}</p>
                  <h2 id="nx-detail-h" className="nx-h2">{open.description || 'No description'}</h2>
                  <dl className="nx-dl">
                    <div><dt>Date</dt><dd>{dayLabel(open.day)}</dd></div>
                    {open.isSplit && <div><dt>Full bill</dt><dd className="nx-num">{inrExact(open.amount)}</dd></div>}
                    {open.isSplit && <div><dt>Owed to you</dt><dd className="nx-num">{inrExact(open.owedToYou)}</dd></div>}
                    {open.paymentMethod && <div><dt>Paid with</dt><dd>{open.paymentMethod}</dd></div>}
                    {open.tags?.length > 0 && <div><dt>Tags</dt><dd>{open.tags.map((t) => t.name).join(', ')}</dd></div>}
                  </dl>
                </m.div>
              </div>
            )}
          </AnimatePresence>, document.getElementById('nx-layer') || document.body)}
        </LayoutGroup>
      )}
    </div>
  );
}
