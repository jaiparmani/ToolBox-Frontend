/**
 * "Review": the month read in date order. The chart stays pinned while you
 * scroll; scrolling moves a day marker through the month, inking each day's
 * spend as it passes, and margin notes appear when the marker reaches their
 * date. Pinning is justified here because the order of reveal is time.
 * With reduced motion the chart is drawn complete with every note showing.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as m, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { useLedger, summarizeMonth, shiftMonth, inr, monthName, dayLabel, todayIso } from '../ledger';
import { EASE, sec, DUR } from '../motionKit';
import { BookState, Stamp } from './parts';

const W = 700; const H = 360; const PAD = 8;

function notesFor(month, prev) {
  const n = [];
  const name = monthName(month.ym, 'short');
  if (month.heaviest) {
    const rows = month.rows.filter((e) => Number(e.day.slice(8)) === month.heaviest.day).sort((a, b) => b.spend - a.spend);
    n.push({ day: month.heaviest.day, title: `Heaviest day: ${month.heaviest.day} ${name}, ${inr(month.heaviest.total)}`,
      body: rows.slice(0, 3).map((e) => `${e.description || e.category?.name} ${inr(e.spend)}`).join(' · ') });
  }
  if (month.biggest && Number(month.biggest.day.slice(8)) !== month.heaviest?.day) {
    n.push({ day: Number(month.biggest.day.slice(8)), title: `Biggest single line: ${inr(month.biggest.spend)}`,
      body: `${month.biggest.description || month.biggest.category?.name}, ${Math.round((month.biggest.spend / month.total) * 100)}% of the month` });
  }
  if (month.quiet.length >= 2) {
    n.push({ day: month.quiet.from, title: `${month.quiet.length} days with nothing written`,
      body: `${month.quiet.from}–${month.quiet.from + month.quiet.length - 1} ${name}` });
  }
  if (prev?.count && month.total > prev.total) {
    const cross = month.cumulative.findIndex((v) => v > prev.total);
    if (cross >= 0) n.push({ day: cross + 1, title: `Passed all of ${monthName(prev.ym)} on ${cross + 1} ${name}`, body: `${monthName(prev.ym)} came to ${inr(prev.total)}` });
  }
  return n.sort((a, b) => a.day - b.day);
}

/** The pinned, scroll-scrubbed chart. Mounted only once there is a month to draw. */
function Scrub({ month, notes, lastDay }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const markerX = useTransform(scrollYProgress, [0.05, 0.9], [0, 1]);
  const [day, setDay] = useState(reduce ? lastDay : 1);
  useMotionValueEvent(markerX, 'change', (v) => {
    if (reduce) return;
    setDay(Math.max(1, Math.min(lastDay, Math.round(v * (lastDay - 1)) + 1)));
  });
  const shownDay = reduce ? lastDay : day;
  const max = Math.max(1, ...month.perDay);
  const bw = (W - PAD * 2) / month.days;
  const x = (d) => PAD + (d - 0.5) * bw;
  const spentBy = month.cumulative[shownDay - 1];
  return (
        <section ref={ref} className={`nx-scrub ${reduce ? 'is-static' : ''}`} style={reduce ? undefined : { height: `${Math.max(180, lastDay * 9)}vh` }}
          aria-label={`Daily spend in ${monthName(month.ym)} with notes`}>
          <div className="nx-scrub-stick">
            <div className="nx-scrub-read" aria-live="off">
              <span className="nx-meta">By {dayLabel(`${month.ym}-${String(shownDay).padStart(2, '0')}`, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="nx-scrub-v">{inr(spentBy)}</span>
            </div>
            <div className="nx-scrub-grid">
              <svg viewBox={`0 0 ${W} ${H}`} className="nx-chart" role="img"
                aria-label={`Bars of daily spend for ${monthName(month.ym)}. Heaviest day ${month.heaviest?.day} with ${inr(month.heaviest?.total || 0)}.`}>
                <defs>
                  <pattern id="nx-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                    <rect width="1.6" height="5" fill="currentColor" />
                  </pattern>
                </defs>
                <line x1={PAD} x2={W - PAD} y1={H - 26} y2={H - 26} className="nx-chart-base" />
                {month.perDay.map((v, i) => {
                  const h = v ? Math.max(3, (v / max) * (H - 56)) : 0;
                  const passed = i + 1 <= shownDay;
                  return (
                    <g key={i} className={`nx-chart-day ${passed ? 'is-passed' : ''}`}>
                      {h > 0 && <rect x={x(i + 1) - bw * 0.32} width={bw * 0.64} y={H - 26 - h} height={h} fill="url(#nx-hatch)" />}
                      {h > 0 && <rect x={x(i + 1) - bw * 0.32} width={bw * 0.64} y={H - 26 - h} height={2} className="nx-chart-cap" />}
                      {(i === 0 || (i + 1) % 7 === 0) && <text x={x(i + 1)} y={H - 4} className="nx-chart-tick">{i + 1}</text>}
                    </g>
                  );
                })}
                {notes.map((n) => (
                  <circle key={n.day + n.title} cx={x(n.day)} cy={12} r={6} className={`nx-chart-pin ${n.day <= shownDay ? 'is-on' : ''}`} />
                ))}
                <line x1={x(shownDay)} x2={x(shownDay)} y1={22} y2={H - 26} className="nx-chart-marker" />
              </svg>
              <ol className="nx-notes" aria-label="Margin notes">
                {notes.map((n) => {
                  const on = n.day <= shownDay;
                  return (
                    <m.li key={n.day + n.title} className={`nx-note ${on ? 'is-on' : ''}`}
                      initial={false} animate={{ opacity: on ? 1 : 0.22, x: on || reduce ? 0 : 6 }}
                      transition={{ duration: sec(DUR.normal), ease: EASE }}>
                      <span className="nx-note-day">{n.day}</span>
                      <span><strong>{n.title}</strong>{n.body && <><br />{n.body}</>}</span>
                    </m.li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>
  );
}

export default function Review() {
  const L = useLedger();
  const reduce = useReducedMotion();
  const month = useMemo(() => summarizeMonth(L.expenses, L.month), [L.expenses, L.month]);
  const prev = useMemo(() => summarizeMonth(L.expenses, shiftMonth(L.month, -1)), [L.expenses, L.month]);
  const notes = useMemo(() => notesFor(month, prev), [month, prev]);
  const isCurrent = month.ym === todayIso().slice(0, 7);
  const lastDay = isCurrent ? Number(todayIso().slice(8, 10)) : month.days;


  if (L.status !== 'ready') return <BookState status={L.status} error={L.error} retry={() => L.reload()} />;
  if (!month.count) {
    return (
      <div className="nx-book"><article className="nx-page">
        <h1 className="nx-h1">{monthName(month.ym)} review</h1>
        <p className="nx-body">Nothing is written in {monthName(month.ym)} yet, so there is nothing to review.</p>
        <Link to="/next" className="nx-btn">Write a line</Link>
      </article></div>
    );
  }


  const heads = month.byCategory.map((c) => {
    const p = prev.byCategory.find((pc) => pc.id === c.id);
    return { ...c, prev: p ? p.total : 0 };
  });

  return (
    <div className="nx-book">
      <article className="nx-page nx-page--review" aria-labelledby="nx-review-h">
        <header className="nx-pagehead">
          <div>
            <h1 className="nx-h1" id="nx-review-h">{monthName(month.ym)} review</h1>
            <p className="nx-meta">{month.count} lines on {month.activeDays} of {month.days} days{reduce ? '' : ' · scroll to read the month day by day'}</p>
          </div>
          <div className="nx-pagehead-total">
            <span className="nx-meta">Spent in {monthName(month.ym)}</span>
            <span className="nx-total-v">{inr(month.total)}</span>
          </div>
        </header>

        <Scrub month={month} notes={notes} lastDay={lastDay} />

        <section className="nx-compare" aria-labelledby="nx-compare-h">
          <h2 className="nx-h2" id="nx-compare-h">By head, against {prev.count ? monthName(prev.ym) : 'last month'}</h2>
          <table className="nx-ctable">
            <thead><tr><th scope="col">Head</th><th scope="col" className="r">{monthName(month.ym, 'short')}</th><th scope="col" className="r">{monthName(prev.ym, 'short')}</th><th scope="col" className="r">Change</th></tr></thead>
            <tbody>
              {heads.map((h) => {
                const d = h.total - h.prev;
                return (
                  <tr key={h.id}>
                    <td><Stamp name={h.name} ink={L.inkFor(h.id)} /></td>
                    <td className="r">{inr(h.total)}</td>
                    <td className="r nx-faint">{h.prev ? inr(h.prev) : '—'}</td>
                    <td className={`r ${d > 0 ? 'is-more' : 'is-less'}`}>{h.prev ? `${d > 0 ? '+' : '−'}${inr(Math.abs(d))}` : 'new'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><th scope="row">Total</th><td className="r">{inr(month.total)}</td><td className="r nx-faint">{prev.count ? inr(prev.total) : '—'}</td>
              <td className={`r ${month.total - prev.total > 0 ? 'is-more' : 'is-less'}`}>{prev.count ? `${month.total > prev.total ? '+' : '−'}${inr(Math.abs(month.total - prev.total))}` : ''}</td></tr></tfoot>
          </table>
        </section>
      </article>
    </div>
  );
}
