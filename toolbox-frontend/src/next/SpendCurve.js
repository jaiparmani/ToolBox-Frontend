/**
 * Cumulative spend through the month, drawn against last month's line.
 * The line draws itself on arrival (continuity: the total "builds up"), and a
 * scrubber — pointer or arrow keys — reads out the exact running total for any
 * day, so no figure lives only in the shape.
 */
import React, { useMemo, useState } from 'react';
import { motion as m, useReducedMotion } from 'framer-motion';
import { inr, dayLabel, monthName, todayIso } from './ledger';
import { EASE, sec } from './motionKit';
import { motion as T } from '../theme/tokens';

const W = 720; const H = 220; const PAD = { t: 16, r: 8, b: 26, l: 8 };

export default function SpendCurve({ month, prev }) {
  const reduce = useReducedMotion();
  const today = todayIso();
  // Don't draw into the future for the current month.
  const lastDay = month.ym === today.slice(0, 7) ? Number(today.slice(8, 10)) : month.days;
  const cur = month.cumulative.slice(0, lastDay);
  const max = Math.max(1, ...cur, ...(prev ? prev.cumulative : []));
  const x = (i, n) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = (arr, n) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i, n).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const curPath = useMemo(() => line(cur, month.days), [cur, month.days]); // eslint-disable-line react-hooks/exhaustive-deps
  const area = `${curPath} L${x(cur.length - 1, month.days)},${H - PAD.b} L${x(0, month.days)},${H - PAD.b} Z`;
  const prevPath = prev ? line(prev.cumulative, prev.days) : null;

  const [hover, setHover] = useState(null);
  const pick = (clientX, rect) => {
    const ratio = (clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (month.days - 1));
    setHover(Math.max(0, Math.min(cur.length - 1, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { setHover((h) => Math.min(cur.length - 1, (h ?? cur.length - 1) + 1)); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { setHover((h) => Math.max(0, (h ?? cur.length - 1) - 1)); e.preventDefault(); }
    if (e.key === 'Escape') setHover(null);
  };
  const hi = hover ?? cur.length - 1;
  const iso = `${month.ym}-${String(hi + 1).padStart(2, '0')}`;
  const prevAt = prev ? prev.cumulative[Math.min(hi, prev.days - 1)] : null;
  const leftPct = (x(hi, month.days) / W) * 100;

  return (
    <div className="nx-curve">
      <div className="nx-curve-read" aria-live="polite">
        <span className="nx-eyebrow">{hover == null ? 'Running total' : dayLabel(iso, { day: 'numeric', month: 'short', weekday: 'short' })}</span>
        <span className="nx-curve-val">{inr(cur[hi])}</span>
        {prev && (
          <span className="nx-curve-cmp">
            <i className="nx-key nx-key--prev" /> {monthName(prev.ym, 'short')} by day {Math.min(hi + 1, prev.days)}: {inr(prevAt)}
          </span>
        )}
      </div>
      <div
        className="nx-curve-plot"
        tabIndex={0}
        role="img"
        aria-label={`Cumulative spend in ${monthName(month.ym)}: ${inr(cur[cur.length - 1])} by day ${cur.length}${prev ? `, versus ${inr(prev.total)} in ${monthName(prev.ym)}` : ''}. Use arrow keys to read each day.`}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="nx-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--nx-primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--nx-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={PAD.l} x2={W - PAD.r} y1={y(max * g)} y2={y(max * g)} className="nx-grid" />
          ))}
          {prevPath && <path d={prevPath} className="nx-line-prev" />}
          <m.path
            key={`a-${month.ym}`}
            d={area}
            fill="url(#nx-area)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: sec(T.slower), delay: reduce ? 0 : 0.35, ease: EASE }}
          />
          <m.path
            key={`l-${month.ym}`}
            d={curPath}
            className="nx-line"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        </svg>
        <div className="nx-curve-scrub" style={{ left: `${leftPct}%`, opacity: hover == null ? 0 : 1 }} aria-hidden="true">
          <span className="nx-curve-dot" style={{ top: `${(y(cur[hi]) / H) * 100}%` }} />
        </div>
        <div className="nx-curve-axis" aria-hidden="true">
          <span>1 {monthName(month.ym, 'short')}</span>
          <span>{Math.ceil(month.days / 2)}</span>
          <span>{month.days}</span>
        </div>
      </div>
    </div>
  );
}
