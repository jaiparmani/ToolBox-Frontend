/**
 * The ledger's lines, shared by "This month" and "All entries":
 *  - cancelled lines stay on the page, struck through and stamped, with an
 *    Undo for the few seconds before they are deleted;
 *  - corrected amounts show the old figure struck beside the new one;
 *  - same-day duplicates (same day, amount and head) are bracketed in the
 *    margin with an offer to combine them into one line.
 */
import React, { useState } from 'react';
import { motion as m, useReducedMotion } from 'framer-motion';
import { useLedger, inr, inrExact, dayLabel, sameDayDupes } from '../ledger';
import { EASE, sec, DUR } from '../motionKit';
import { Stamp, tiltFor } from './parts';

const DISMISS_KEY = 'nx-dupes-different';
const readDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')); } catch { return new Set(); }
};

export default function LedgerRows({ lines, showRun = true, onOpen, freshId, filter = null, onToast }) {
  const L = useLedger();
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(readDismissed);
  const dupes = sameDayDupes(lines, dismissed);
  const dupeOf = new Map();
  dupes.forEach((g) => g.rows.forEach((r, i) => dupeOf.set(r.id, { g, last: i === g.rows.length - 1 })));
  const cols = showRun ? 5 : 4;

  const combine = (g) => {
    const keep = g.rows.find((r) => r.description) || g.rows[0];
    g.rows.filter((r) => r.id !== keep.id).forEach((r) => L.cancelLine(r.id));
    onToast?.(`Combined into one line: ${inrExact(keep.spend)} on ${dayLabel(keep.day, { day: 'numeric', month: 'short' })}. Undo on the struck line.`);
  };
  const different = (g) => {
    const next = new Set(dismissed).add(g.key);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* per-device only */ }
  };

  const out = [];
  lines.forEach((e) => {
    const d = dupeOf.get(e.id);
    const was = L.corrections[e.id];
    const dim = filter != null && (e.category?.id ?? 'none') !== filter;
    const open = () => { if (!e.cancelled) onOpen?.(e); };
    out.push(
      <m.tr key={e.id} layout={reduce ? false : 'position'} transition={{ duration: sec(DUR.slow), ease: EASE }}
        className={`nx-line ${e.firstOfDay ? 'is-day' : ''} ${dim ? 'is-dim' : ''} ${freshId === e.id ? 'is-fresh' : ''} ${e.cancelled ? 'is-cancelled' : ''} ${d ? 'is-dupe' : ''}`}
        onClick={open} tabIndex={e.cancelled ? -1 : 0}
        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } }}
        aria-label={`${dayLabel(e.day, { day: 'numeric', month: 'short' })}, ${e.description || e.category?.name}, ${inrExact(e.spend)}${e.cancelled ? ', cancelled' : ''}${d ? ', possible duplicate' : ''}. ${e.cancelled ? '' : 'Open entry'}`}>
        <td className="c-date">{e.firstOfDay && <><b>{Number(e.day.slice(8))}</b><i>{dayLabel(e.day, { weekday: 'short' })}</i></>}</td>
        <td className="c-part">
          <span className="nx-part-text">{e.description || <span className="nx-faint">{e.category?.name || 'No particulars'}</span>}</span>
          {e.isSplit && <span className="nx-share">your share</span>}
          {e.tags?.length > 0 && <span className="nx-tags">{e.tags.map((t) => `#${t.name.toLowerCase()}`).join(' ')}</span>}
        </td>
        <td className="c-head">
          {e.cancelled
            ? <span className="nx-stamp nx-stamp--void">Cancelled</span>
            : <Stamp name={e.category?.name || 'Unfiled'} ink={L.inkFor(e.category?.id)} fresh={freshId === e.id} tilt={tiltFor(e.id)} />}
        </td>
        <td className="c-amt">
          {e.cancelled
            ? <button type="button" className="nx-undo" onClick={(ev) => { ev.stopPropagation(); L.undoCancel(e.id); }}>Undo</button>
            : <>{was != null && Math.abs(was - e.spend) > 0.004 && <s className="nx-was" aria-label={`was ${inrExact(was)}`}>{inrExact(was)}</s>}{inrExact(e.spend)}</>}
        </td>
        {showRun && <td className="c-run">{e.cancelled ? '' : inr(e.run)}</td>}
      </m.tr>,
    );
    if (d && d.last) {
      const g = d.g;
      out.push(
        <tr key={`dupe-${g.key}`} className="nx-dupe-note">
          <td colSpan={cols}>
            <span className="nx-dupe-text">
              <strong>{g.rows.length} lines look the same</strong>: {inrExact(g.rows[0].spend)} {g.rows[0].category?.name || ''} on {dayLabel(g.rows[0].day, { day: 'numeric', month: 'short' })}.
            </span>
            <span className="nx-dupe-acts">
              <button type="button" className="nx-btn nx-btn--sm" onClick={() => combine(g)}>Combine into one line</button>
              <button type="button" className="nx-btn nx-btn--sm nx-btn--quiet" onClick={() => different(g)}>They’re different</button>
            </span>
          </td>
        </tr>,
      );
    }
  });
  return <>{out}</>;
}
