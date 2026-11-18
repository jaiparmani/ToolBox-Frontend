import React from 'react';
import { inrExact, dayLabel } from '../ledger';

export function ExpenseRow({ e, color, onOpen, showDate = true, layoutProps }) {
  const Tag = onOpen ? 'button' : 'div';
  const name = e.description || e.category?.name || 'Expense';
  return (
    <Tag type={onOpen ? 'button' : undefined} className={`nx-row ${onOpen ? 'is-action' : ''}`} onClick={onOpen ? () => onOpen(e) : undefined}
      style={{ '--c': color }} {...layoutProps}>
      <span className="nx-row-badge" aria-hidden="true">{(e.category?.name || name).slice(0, 1)}</span>
      <span className="nx-row-main">
        <span className="nx-row-title">{name}</span>
        <span className="nx-row-sub">
          {e.category?.name || 'Uncategorised'}
          {showDate && <> · {dayLabel(e.day, { day: 'numeric', month: 'short' })}</>}
          {e.isSplit && <span className="nx-pill">Split · your share</span>}
        </span>
      </span>
      <span className="nx-row-amt nx-num">{inrExact(e.spend)}</span>
    </Tag>
  );
}

export function LoadState({ status, error, retry, empty, onAdd }) {
  if (status === 'loading') {
    return (
      <div className="nx-skel" aria-busy="true" aria-label="Loading your expenses">
        <span className="nx-sk nx-sk--eyebrow" />
        <span className="nx-sk nx-sk--title" />
        <span className="nx-sk nx-sk--hero" />
        <div className="nx-grid-2"><span className="nx-sk nx-sk--panel" /><span className="nx-sk nx-sk--panel" /></div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="nx-state" role="alert">
        <h1 className="nx-h2">Couldn’t load your expenses</h1>
        <p className="nx-muted">{error?.message || 'The server didn’t answer.'} Nothing was changed.</p>
        <button type="button" className="nx-btn nx-btn--primary" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="nx-state">
        <h1 className="nx-h1">Your money story starts with one entry</h1>
        <p className="nx-muted">Log what you spent today and this page will chart where the month goes.</p>
        <button type="button" className="nx-btn nx-btn--primary" onClick={onAdd}>Add your first expense</button>
      </div>
    );
  }
  return null;
}
