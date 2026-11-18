import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as m, useReducedMotion, LayoutGroup } from 'framer-motion';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthEastRounded from '@mui/icons-material/SouthEastRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { useLedger, summarizeMonth, inr, inrExact, monthName, monthLabel, shiftMonth, dayLabel, todayIso } from '../ledger';
import { RollingNumber, MaskText, spotlight, listV, itemV, EASE, sec } from '../motionKit';
import { motion as T } from '../../theme/tokens';
import SpendCurve from '../SpendCurve';
import { ExpenseRow, LoadState } from './shared';

export default function Overview({ onAdd }) {
  const L = useLedger();
  const reduce = useReducedMotion();
  const month = useMemo(() => summarizeMonth(L.expenses, L.month), [L.expenses, L.month]);
  const prevYm = shiftMonth(L.month, -1);
  const prev = useMemo(() => {
    const p = summarizeMonth(L.expenses, prevYm);
    return p.count ? p : null;
  }, [L.expenses, prevYm]);
  const [dir, setDir] = useState(0);

  if (L.status !== 'ready' || !L.expenses.length) {
    return <LoadState status={L.status} error={L.error} retry={() => L.reload()} empty={!L.expenses.length} onAdd={onAdd} />;
  }

  const idx = L.months.indexOf(L.month);
  const canPrev = idx > 0;
  const now = todayIso().slice(0, 7);
  const canNext = L.month < now;
  const go = (d) => { setDir(d); L.setMonth(shiftMonth(L.month, d)); };

  const delta = prev ? month.total - prev.total : null;
  const pct = prev && prev.total ? Math.round((delta / prev.total) * 100) : null;
  const isCurrent = L.month === now;
  const elapsed = isCurrent ? Number(todayIso().slice(8, 10)) : month.days;
  const perDay = month.total / Math.max(1, elapsed);
  const latestNote = !isCurrent && L.month === L.months[L.months.length - 1]
    ? `Nothing logged in ${monthName(now)} yet — showing your latest month.`
    : null;
  const maxDay = Math.max(1, ...month.perDay);
  const firstWeekday = (new Date(`${L.month}-01T00:00:00`).getDay() + 6) % 7; // Monday-first

  return (
    <div className="nx-overview">
      <header className="nx-head">
        <div>
          <p className="nx-eyebrow">{dayLabel(todayIso(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="nx-h1"><MaskText key={L.month} text={`Where ${monthName(L.month)} went`} /></h1>
          {latestNote && <p className="nx-note">{latestNote}</p>}
        </div>
        <div className="nx-month-switch" role="group" aria-label="Choose month">
          <button type="button" className="nx-icon-btn" onClick={() => go(-1)} disabled={!canPrev} aria-label="Previous month">
            <ChevronLeftRounded fontSize="small" />
          </button>
          <span className="nx-month-label" aria-live="polite">
            <m.span key={L.month} initial={reduce ? false : { opacity: 0, x: dir * 14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: sec(T.normal), ease: EASE }}>{monthLabel(L.month)}</m.span>
          </span>
          <button type="button" className="nx-icon-btn" onClick={() => go(1)} disabled={!canNext} aria-label="Next month">
            <ChevronRightRounded fontSize="small" />
          </button>
        </div>
      </header>

      <section className="nx-hero nx-panel nx-spot" {...spotlight} aria-labelledby="nx-hero-label">
        <p className="nx-label" id="nx-hero-label">Spent in {monthName(L.month)}</p>
        <div className="nx-hero-figure">
          <RollingNumber value={month.total} format={inr} className="nx-hero-num" />
        </div>
        <div className="nx-hero-days" role="img"
          aria-label={`Daily spend in ${monthName(L.month)}. Heaviest day ${month.heaviest ? `${month.heaviest.day} ${monthName(L.month, 'short')}, ${inr(month.heaviest.total)}` : 'none'}.`}>
          {month.perDay.map((v, i) => (
            <m.span key={`${L.month}-${i}`} title={`${i + 1} ${monthName(L.month, 'short')}: ${v ? inrExact(v) : 'nothing spent'}`}
              className={month.heaviest && month.heaviest.day === i + 1 ? 'is-peak' : ''}
              style={{ '--h': Math.max(0.04, v / maxDay) }}
              initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: sec(T.slow), ease: EASE, delay: 0.3 + i * 0.018 }} />
          ))}
        </div>
        <ul className="nx-hero-meta">
          {prev && (
            <li className={`nx-delta ${delta > 0 ? 'is-up' : 'is-down'}`}>
              {delta > 0 ? <NorthEastRounded fontSize="inherit" /> : <SouthEastRounded fontSize="inherit" />}
              <strong>{inr(Math.abs(delta))} {delta > 0 ? 'more' : 'less'}</strong>
              <span>than {monthName(prev.ym)}{pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}</span>
            </li>
          )}
          <li><strong>{inr(perDay)}</strong> <span>a day on average</span></li>
          <li><strong>{month.count}</strong> <span>expenses on {month.activeDays} days</span></li>
        </ul>
      </section>

      <div className="nx-grid-2">
        <section className="nx-panel nx-panel--curve" aria-labelledby="nx-curve-h">
          <div className="nx-panel-head">
            <h2 id="nx-curve-h" className="nx-h2">How the month built up</h2>
            {prev && <span className="nx-legend"><i className="nx-key" />{monthName(L.month, 'short')} <i className="nx-key nx-key--prev" />{monthName(prev.ym, 'short')}</span>}
          </div>
          <SpendCurve month={month} prev={prev} />
        </section>

        <section className="nx-panel" aria-labelledby="nx-cat-h">
          <div className="nx-panel-head">
            <h2 id="nx-cat-h" className="nx-h2">By category</h2>
          </div>
          {month.byCategory.length ? (
            <LayoutGroup id={`cats-${L.month}`}>
              <m.ol className="nx-cats" variants={listV} initial="hidden" animate="shown" key={L.month}>
                {month.byCategory.map((c, i) => {
                  const share = c.total / month.total;
                  return (
                    <m.li layout key={c.id} variants={itemV(reduce)} className="nx-cat" style={{ '--c': L.colorFor(c.id) }}>
                      <div className="nx-cat-top">
                        <span className="nx-cat-name"><i className="nx-dot" />{c.name}</span>
                        <span className="nx-num">{inr(c.total)}</span>
                      </div>
                      <div className="nx-bar" aria-hidden="true">
                        <m.span className="nx-bar-fill" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: share }}
                          transition={{ duration: sec(T.slower) * 1.4, ease: EASE, delay: 0.15 + i * 0.06 }} />
                      </div>
                      <span className="nx-cat-meta">{Math.round(share * 100)}% · {c.count} {c.count === 1 ? 'expense' : 'expenses'}</span>
                    </m.li>
                  );
                })}
              </m.ol>
            </LayoutGroup>
          ) : <p className="nx-muted">Nothing spent in {monthName(L.month)}.</p>}
        </section>
      </div>

      <div className="nx-grid-2 nx-grid-2--flip">
        <section className="nx-panel" aria-labelledby="nx-cal-h">
          <div className="nx-panel-head">
            <h2 id="nx-cal-h" className="nx-h2">Day by day</h2>
            {month.heaviest && <span className="nx-muted nx-small">Heaviest: {month.heaviest.day} {monthName(L.month, 'short')} · {inr(month.heaviest.total)}</span>}
          </div>
          <div className="nx-cal" role="list" aria-label={`Spend per day in ${monthName(L.month)}`}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={`h${i}`} className="nx-cal-h" aria-hidden="true">{d}</span>)}
            {Array.from({ length: firstWeekday }).map((_, i) => <span key={`b${i}`} aria-hidden="true" />)}
            {month.perDay.map((v, i) => {
              const iso = `${L.month}-${String(i + 1).padStart(2, '0')}`;
              const future = isCurrent && i + 1 > elapsed;
              return (
                <m.span key={iso} role="listitem" tabIndex={0}
                  className={`nx-cal-day ${v ? 'has' : ''} ${v && Math.sqrt(v / maxDay) > 0.5 ? 'is-deep' : ''} ${future ? 'is-future' : ''}`}
                  style={{ '--i': v ? 0.18 + 0.82 * Math.sqrt(v / maxDay) : 0 }}
                  title={`${dayLabel(iso, { day: 'numeric', month: 'short' })}: ${v ? inrExact(v) : 'nothing spent'}`}
                  aria-label={`${dayLabel(iso, { day: 'numeric', month: 'long' })}: ${v ? inr(v) : 'nothing spent'}`}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: sec(T.normal), ease: EASE, delay: 0.1 + ((i + firstWeekday) % 7) * 0.02 + Math.floor((i + firstWeekday) / 7) * 0.05 }}>
                  <span>{i + 1}</span>
                </m.span>
              );
            })}
          </div>
          <div className="nx-cal-scale" aria-hidden="true"><span>Less</span><i /><i /><i /><i /><span>More</span></div>
        </section>

        <section className="nx-panel" aria-labelledby="nx-recent-h">
          <div className="nx-panel-head">
            <h2 id="nx-recent-h" className="nx-h2">Latest in {monthName(L.month)}</h2>
            <Link to="/next/activity" className="nx-link">All activity <ArrowOutwardRounded fontSize="inherit" /></Link>
          </div>
          {month.rows.length ? (
            <m.ul className="nx-rows" variants={listV} initial="hidden" animate="shown" key={L.month}>
              {month.rows.slice(0, 6).map((e) => (
                <m.li key={e.id} variants={itemV(reduce)}><ExpenseRow e={e} color={L.colorFor(e.category?.id)} /></m.li>
              ))}
            </m.ul>
          ) : (
            <div className="nx-empty-inline">
              <p>No expenses in {monthName(L.month)}.</p>
              <button type="button" className="nx-btn nx-btn--ghost" onClick={onAdd}>Add one</button>
            </div>
          )}
          <Link to="/next/story" className="nx-story-cta">
            <span>
              <span className="nx-eyebrow">New</span>
              <strong>Read {monthName(L.month)}, told as a story</strong>
            </span>
            <ArrowOutwardRounded />
          </Link>
        </section>
      </div>
    </div>
  );
}
