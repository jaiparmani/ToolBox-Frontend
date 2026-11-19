/** Shared pieces of the money book: stamps, the receipt slip, load states. */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as m, AnimatePresence, useReducedMotion } from 'framer-motion';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { updateExpense } from '../../components/rest/expenseTrackerApis';
import { useLedger, inrExact, dayLabel, todayIso } from '../ledger';
import { EASE, EMPHASIS, sec, DUR } from '../motionKit';

export function Stamp({ name, ink, fresh = false, tilt = 0 }) {
  const reduce = useReducedMotion();
  const rest = { scale: 1, rotate: -2.5 + tilt, opacity: 0.9 };
  return (
    <m.span className={`nx-stamp ${ink}`}
      initial={fresh && !reduce ? { scale: 1.9, rotate: -14, opacity: 0 } : false}
      animate={rest}
      transition={{ duration: sec(DUR.slow), ease: EMPHASIS, delay: fresh ? 0.12 : 0 }}>
      {name}
    </m.span>
  );
}

/** Opening an entry prints its slip: the receipt unrolls from the top. */
/** Correcting a line: the same blanks as writing one, filled in. */
function CorrectForm({ entry, onDone, onBack }) {
  const L = useLedger();
  const [amount, setAmount] = useState(String(entry.amount));
  const [part, setPart] = useState(entry.description || '');
  const [date, setDate] = useState(entry.day);
  const [head, setHead] = useState(entry.category?.id ?? null);
  const [tagIds, setTagIds] = useState((entry.tags || []).map((t) => t.id));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (ev) => {
    ev.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) { setErr('Enter an amount above ₹0.'); return; }
    if (!head) { setErr('Choose a head.'); return; }
    setBusy(true); setErr('');
    try {
      // tag_ids is always sent, so the line's tags are passed back explicitly.
      const description = part.trim() || L.categories.find((c) => c.id === head)?.name || 'Expense';
      await updateExpense(entry.id, { amount: n, categoryId: head, description, date, tagIds, transactionType: 'expense' });
      if (Math.abs(n - Number(entry.amount)) > 0.004) L.noteCorrection(entry.id, entry.spend);
      await L.reload({ quiet: true });
      onDone(date.slice(0, 7));
    } catch (e) { setErr(e?.message || 'Could not save the correction.'); setBusy(false); }
  };
  return (
    <form className="nx-correct" onSubmit={save} noValidate>
      <label className="nx-f"><span>Amount{entry.isSplit ? ' (full bill, ₹)' : ' (₹)'}</span>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></label>
      <label className="nx-f"><span>Particulars</span><input value={part} maxLength={120} onChange={(e) => setPart(e.target.value)} /></label>
      <label className="nx-f"><span>Date</span><input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} /></label>
      <fieldset className="nx-f"><legend>Head</legend>
        <div className="nx-headpick">
          {L.categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={head === c.id}
              className={`nx-stamp nx-stamp--pick ${L.inkFor(c.id)} ${head === c.id ? 'is-inked' : ''}`} onClick={() => setHead(c.id)}>{c.name}</button>
          ))}
        </div>
      </fieldset>
      {L.tags.length > 0 && (
        <fieldset className="nx-f"><legend>Tags</legend>
          <div className="nx-tagpick">
            {L.tags.map((t) => {
              const on = tagIds.includes(t.id);
              return <button key={t.id} type="button" aria-pressed={on} className={`nx-tag ${on ? 'is-on' : ''}`}
                onClick={() => setTagIds((ids) => (on ? ids.filter((i) => i !== t.id) : [...ids, t.id]))}>#{t.name.toLowerCase()}</button>;
            })}
          </div>
        </fieldset>
      )}
      {err && <p className="nx-write-err" role="alert">{err}</p>}
      <div className="nx-slip-acts">
        <button type="submit" className="nx-btn" disabled={busy}>{busy ? 'Saving…' : 'Save correction'}</button>
        <button type="button" className="nx-btn nx-btn--quiet" onClick={onBack}>Keep as it was</button>
      </div>
    </form>
  );
}

export function ReceiptSlip({ entry, ink, onClose, onCorrected, onCancel }) {
  const reduce = useReducedMotion();
  const closeRef = useRef(null);
  const [mode, setMode] = useState('view');
  useEffect(() => { setMode('view'); }, [entry]);
  useEffect(() => {
    if (!entry) return undefined;
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [entry, onClose]);
  const layer = typeof document !== 'undefined' ? document.getElementById('nx-layer') || document.body : null;
  if (!layer) return null;
  return createPortal(
    <AnimatePresence>
      {entry && (
        <div className="nx-slip-root" key="slip">
          <m.div className="nx-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: sec(DUR.fast) }} />
          <m.div className="nx-slip" role="dialog" aria-modal="true" aria-labelledby="nx-slip-amt"
            initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)', y: -12 }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: sec(DUR.fast) } }}
            transition={{ duration: sec(DUR.slower), ease: EASE }}>
            <div className="nx-slip-head">
              <span>Entry no. {entry.id}</span>
              <button ref={closeRef} type="button" className="nx-icon" onClick={onClose} aria-label="Close entry"><CloseRounded fontSize="small" /></button>
            </div>
            <p className="nx-slip-date">{dayLabel(entry.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="nx-slip-part">{entry.description || entry.category?.name || 'No particulars'}</p>
            <p className="nx-slip-amt" id="nx-slip-amt"><span className="nx-sr">Amount </span>{inrExact(entry.spend)}</p>
            <dl className="nx-slip-dl">
              <div><dt>Head</dt><dd><Stamp name={entry.category?.name || 'Unfiled'} ink={ink} /></dd></div>
              {entry.isSplit && <div><dt>Full bill</dt><dd>{inrExact(entry.amount)}</dd></div>}
              {entry.isSplit && <div><dt>Owed to you</dt><dd>{inrExact(entry.owedToYou)}</dd></div>}
              {entry.paymentMethod && <div><dt>Paid with</dt><dd>{entry.paymentMethod}</dd></div>}
              {entry.tags?.length > 0 && <div><dt>Tags</dt><dd>{entry.tags.map((t) => t.name).join(', ')}</dd></div>}
            </dl>
            {mode === 'view' ? (
              <>
                <div className="nx-slip-acts">
                  <button type="button" className="nx-btn nx-btn--quiet" onClick={() => setMode('correct')}>Correct this line</button>
                  <button type="button" className="nx-btn nx-btn--quiet nx-btn--void" onClick={() => { onCancel?.(entry); onClose(); }}>Cancel this line</button>
                </div>
                <p className="nx-slip-foot">{entry.isSplit ? 'Your share is what counts in the book.' : 'A cancelled line can be undone for a few seconds.'}</p>
              </>
            ) : (
              <CorrectForm entry={entry} onBack={() => setMode('view')} onDone={(ym) => { onCorrected?.(entry.id, ym); onClose(); }} />
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    layer,
  );
}

export function BookState({ status, error, retry }) {
  if (status === 'loading') {
    return (
      <div className="nx-page nx-page--loading" aria-busy="true">
        <p className="nx-meta">Opening the book…</p>
        {Array.from({ length: 8 }).map((_, i) => <span key={i} className="nx-ghost-line" />)}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="nx-page" role="alert">
        <h1 className="nx-h1">The book didn’t open</h1>
        <p className="nx-body">{error?.message || 'The server didn’t answer.'} Nothing was changed.</p>
        <button type="button" className="nx-btn" onClick={retry}>Try again</button>
      </div>
    );
  }
  return null;
}

export const tiltFor = (id) => ((Number(id) * 7) % 5) * 0.7 - 1.4;
