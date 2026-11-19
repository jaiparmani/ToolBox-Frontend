/** Shared pieces of the money book: stamps, the receipt slip, load states. */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as m, AnimatePresence, useReducedMotion } from 'framer-motion';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { inrExact, dayLabel } from '../ledger';
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
export function ReceiptSlip({ entry, ink, onClose }) {
  const reduce = useReducedMotion();
  const closeRef = useRef(null);
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
            <p className="nx-slip-foot">Your share is what counts in the book.</p>
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
