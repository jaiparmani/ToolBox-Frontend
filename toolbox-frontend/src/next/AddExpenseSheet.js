/**
 * The primary action. A bottom sheet on phones (drag down to dismiss), a side
 * panel on wider screens. Saves through the existing addExpenseApi, then the
 * whole UI re-reads the ledger so the hero total rolls to its new value.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion as m, AnimatePresence, useReducedMotion } from 'framer-motion';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { addExpenseApi } from '../components/rest/expenseTrackerApis';
import { useLedger, todayIso, inr } from './ledger';
import { EASE, EMPHASIS, sec, useMedia } from './motionKit';
import { motion as T } from '../theme/tokens';

export default function AddExpenseSheet({ open, onClose, onSaved }) {
  const { categories, expenses, colorFor, reload, setMonth } = useLedger();
  const reduce = useReducedMotion();
  const phone = useMedia('(max-width: 767px)');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [date, setDate] = useState(todayIso());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const amountRef = useRef(null);
  const panelRef = useRef(null);

  // Most-used categories first (frequency from the user's own history).
  const freq = expenses.reduce((acc, e) => { const k = e.category?.id; if (k != null) acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const cats = [...categories].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));

  useEffect(() => {
    if (!open) return undefined;
    setAmount(''); setDescription(''); setDate(todayIso()); setErrors({}); setStatus('idle');
    setCategoryId(null);
    const t = setTimeout(() => amountRef.current?.focus(), 60);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) { // keep focus inside the sheet
        const f = panelRef.current.querySelectorAll('button, input, [tabindex="0"]');
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    const errs = {};
    if (!amount || Number.isNaN(n) || n <= 0) errs.amount = 'Enter an amount above ₹0.';
    if (!categoryId) errs.category = 'Pick a category.';
    if (!date) errs.date = 'Pick a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus('saving');
    try {
      await addExpenseApi({ amount: n, categoryId, description: description.trim() || undefined, date, transactionType: 'expense' });
      setStatus('saved');
      const cat = categories.find((c) => c.id === categoryId);
      await reload({ quiet: true });
      setMonth(date.slice(0, 7));
      onSaved?.(`Added ${inr(n)} to ${cat?.name || 'expenses'}`);
      setTimeout(onClose, reduce ? 0 : 520);
    } catch (err) {
      setStatus('error');
      setErrors({ form: err?.message || 'Could not save. Check your connection and try again.' });
    }
  };

  const panelMotion = phone
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '104%' }, animate: { x: 0 }, exit: { x: '104%' } };

  return (
    <AnimatePresence>
      {open && (
        <div className="nx-sheet-root">
          <m.div
            className="nx-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: sec(T.normal) }}
          />
          <m.form
            ref={panelRef}
            className="nx-sheet"
            role="dialog" aria-modal="true" aria-labelledby="nx-sheet-title"
            onSubmit={submit}
            {...(reduce ? { initial: false } : panelMotion)}
            transition={{ duration: sec(T.slow), ease: EASE }}
            drag={phone && !reduce ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
            noValidate
          >
            {phone && <span className="nx-grabber" aria-hidden="true" />}
            <header className="nx-sheet-head">
              <h2 id="nx-sheet-title">New expense</h2>
              <button type="button" className="nx-icon-btn" onClick={onClose} aria-label="Close">
                <CloseRounded fontSize="small" />
              </button>
            </header>

            <div className="nx-field nx-field--amount">
              <label className="nx-label" htmlFor="nx-amount">Amount in rupees</label>
              <span className="nx-amount-input">
                <span aria-hidden="true">₹</span>
                <input
                  id="nx-amount" ref={amountRef} inputMode="decimal" placeholder="0" value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, '')); setErrors((x) => ({ ...x, amount: undefined })); }}
                  aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'nx-err-amount' : undefined}
                />
              </span>
              {errors.amount && <span className="nx-error" id="nx-err-amount">{errors.amount}</span>}
            </div>

            <label className="nx-field">
              <span className="nx-label">What was it?</span>
              <input className="nx-input" value={description} maxLength={120}
                onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner at Bastian" />
            </label>

            <fieldset className="nx-field" aria-describedby={errors.category ? 'nx-err-cat' : undefined}>
              <legend className="nx-label">Category</legend>
              <div className="nx-chips">
                {cats.map((c) => {
                  const on = categoryId === c.id;
                  return (
                    <button type="button" key={c.id} className={`nx-chip ${on ? 'is-on' : ''}`}
                      aria-pressed={on} onClick={() => { setCategoryId(c.id); setErrors((x) => ({ ...x, category: undefined })); }}
                      style={{ '--chip': colorFor(c.id) }}>
                      <i className="nx-dot" />{c.name}
                      {on && !reduce && <m.span layoutId="nx-chip-ring" className="nx-chip-ring" transition={{ duration: sec(T.normal), ease: EMPHASIS }} />}
                      {on && reduce && <span className="nx-chip-ring" />}
                    </button>
                  );
                })}
                {!cats.length && <span className="nx-muted">No categories yet — add one in the classic app.</span>}
              </div>
              {errors.category && <span className="nx-error" id="nx-err-cat">{errors.category}</span>}
            </fieldset>

            <label className="nx-field">
              <span className="nx-label">Date</span>
              <input className="nx-input" type="date" value={date} max={todayIso()}
                onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
              {errors.date && <span className="nx-error">{errors.date}</span>}
            </label>

            {errors.form && <p className="nx-error nx-error--form" role="alert">{errors.form}</p>}

            <button className={`nx-btn nx-btn--primary nx-btn--block is-${status}`} type="submit" disabled={status === 'saving' || status === 'saved'}>
              <AnimatePresence mode="wait" initial={false}>
                {status === 'saved' ? (
                  <m.span key="ok" className="nx-btn-inner" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: sec(T.slow), ease: EMPHASIS }}>
                    <CheckRounded fontSize="small" /> Saved
                  </m.span>
                ) : (
                  <m.span key="go" className="nx-btn-inner" exit={{ opacity: 0, y: -6 }} transition={{ duration: sec(T.fast) }}>
                    {status === 'saving' ? <><span className="nx-spinner" aria-hidden="true" /> Saving…</> : 'Save expense'}
                  </m.span>
                )}
              </AnimatePresence>
            </button>
          </m.form>
        </div>
      )}
    </AnimatePresence>
  );
}
