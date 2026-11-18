/**
 * "Month story" — the expressive screen. One concept: your month, told in the
 * order you'd tell a friend. Every scene is driven by a real figure:
 *   hero (parallax + kinetic type) → pinned category race (scroll-scrubbed)
 *   → three moments (heaviest day, biggest spend, quietest stretch)
 *   → week-by-week horizontal track (pinned on desktop, swipe on phones)
 *   → the close (vs last month).
 * With reduced motion every scene renders complete and static.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion as m, useScroll, useTransform, useMotionValueEvent, useReducedMotion, useInView,
} from 'framer-motion';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { useLedger, summarizeMonth, inr, monthName, shiftMonth, dayLabel, todayIso } from '../ledger';
import { MaskText, RollingNumber, EASE, EMPHASIS, sec, useMedia } from '../motionKit';
import { motion as T } from '../../theme/tokens';
import { LoadState } from './shared';

function Hero({ month }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '45%']);
  const fgY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const name = monthName(month.ym);
  return (
    <section ref={ref} className="nx-st-hero" aria-labelledby="nx-st-title">
      <m.span className="nx-st-ghost" aria-hidden="true" style={reduce ? undefined : { y: bgY }}>{name}</m.span>
      <m.div className="nx-st-hero-inner" style={reduce ? undefined : { y: fgY, opacity: fade }}>
        <p className="nx-eyebrow">{monthName(month.ym)} {month.ym.slice(0, 4)}, told as a story</p>
        <h1 id="nx-st-title" className="nx-st-title">
          <span className="nx-st-amount"><RollingNumber value={month.total} format={inr} delay={200} /></span>
          <MaskText text={`left your account in ${name}.`} delay={0.25} />
        </h1>
        <p className="nx-st-lede">
          <MaskText text={`${month.count} expenses across ${month.activeDays} of ${month.days} days. Scroll to see where it went.`} delay={0.6} stagger={0.02} />
        </p>
      </m.div>
      <span className="nx-st-cue" aria-hidden="true"><i /></span>
    </section>
  );
}

function RaceBar({ c, i, n, progress, max, color, total, reduce }) {
  const p = useTransform(progress, [i / n, (i + 0.85) / n], [0, 1]);
  const scaleX = useTransform(p, (v) => (v * c.total) / max);
  const amount = useTransform(p, (v) => inr(v * c.total));
  const share = Math.round((c.total / total) * 100);
  return (
    <li className="nx-race-row" style={{ '--c': color }}>
      <div className="nx-race-top">
        <span className="nx-race-name"><i className="nx-dot" />{c.name}</span>
        <m.span className="nx-num nx-race-amt">{reduce ? inr(c.total) : amount}</m.span>
      </div>
      <div className="nx-race-track" aria-hidden="true">
        <m.span className="nx-race-fill" style={reduce ? { transform: `scaleX(${c.total / max})` } : { scaleX }} />
      </div>
      <span className="nx-sr">{c.name}: {inr(c.total)}, {share}% of the month</span>
    </li>
  );
}

function Race({ month, colorFor }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const cats = month.byCategory.slice(0, 6);
  const n = cats.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.max(0, Math.min(n - 1, Math.floor(v * n)))));
  const max = cats[0]?.total || 1;
  const a = cats[reduce ? 0 : active];
  const share = a ? Math.round((a.total / month.total) * 100) : 0;
  const caption = !a ? '' : active === 0 || reduce
    ? `${a.name} took ${share}% — the biggest slice of ${monthName(month.ym)}.`
    : `${a.name}: ${inr(a.total)} over ${a.count} ${a.count === 1 ? 'expense' : 'expenses'}, ${share}% of the month.`;

  return (
    <section ref={ref} className={`nx-race ${reduce ? 'is-static' : ''}`} style={reduce ? undefined : { height: `${n * 55 + 100}vh` }}
      aria-labelledby="nx-race-h">
      <div className="nx-race-stick">
        <div className="nx-st-wrap">
          <p className="nx-eyebrow">Chapter one</p>
          <h2 id="nx-race-h" className="nx-st-h2"><MaskText text="Where it went" inView /></h2>
          <ol className="nx-race-list">
            {cats.map((c, i) => (
              <RaceBar key={c.id} c={c} i={i} n={n} progress={scrollYProgress} max={max}
                color={colorFor(c.id)} total={month.total} reduce={reduce} />
            ))}
          </ol>
          <p className="nx-race-caption" aria-live="polite">
            <m.span key={caption} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: sec(T.normal), ease: EASE }}>{caption}</m.span>
          </p>
          {!reduce && (
            <div className="nx-race-progress" aria-hidden="true">
              <m.span style={{ scaleX: scrollYProgress }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Moment({ eyebrow, figure, title, children, align = 'left' }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  return (
    <section ref={ref} className={`nx-moment nx-moment--${align}`}>
      <div className="nx-st-wrap">
        <p className="nx-eyebrow">{eyebrow}</p>
        <m.div className="nx-moment-fig"
          initial={reduce ? false : { clipPath: 'inset(0% 100% 0% 0%)' }}
          animate={seen || reduce ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
          transition={{ duration: 0.9, ease: EASE }}>
          {figure}
        </m.div>
        <h3 className="nx-moment-title"><MaskText text={title} inView /></h3>
        <m.div className="nx-moment-body" initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={seen || reduce ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: sec(T.slower), ease: EASE, delay: 0.35 }}>
          {children}
        </m.div>
      </div>
    </section>
  );
}

function WeekCard({ w, ym, max, color }) {
  const busiest = w.days.indexOf(Math.max(...w.days));
  const busiestIso = `${ym}-${String(w.from + busiest).padStart(2, '0')}`;
  return (
    <article className="nx-week" style={{ '--c': color }}>
      <p className="nx-eyebrow">{w.from}–{w.to} {monthName(ym, 'short')}</p>
      <p className="nx-week-total nx-num">{inr(w.total)}</p>
      <div className="nx-week-bars" aria-hidden="true">
        {w.days.map((v, i) => (
          <span key={i} style={{ '--h': max ? v / max : 0 }} className={i === busiest && v ? 'is-peak' : ''} />
        ))}
      </div>
      <p className="nx-muted nx-small">
        {w.total ? `Busiest: ${dayLabel(busiestIso, { weekday: 'long' })}, ${inr(w.days[busiest])}` : 'Nothing spent this week'}
      </p>
    </article>
  );
}

function Weeks({ month }) {
  const ref = useRef(null);
  const trackRef = useRef(null);
  const reduce = useReducedMotion();
  const wide = useMedia('(min-width: 900px)');
  const pinned = wide && !reduce;
  const [dist, setDist] = useState(0);
  useEffect(() => {
    if (!pinned || !trackRef.current) return undefined;
    const measure = () => setDist(Math.max(0, trackRef.current.scrollWidth - trackRef.current.parentElement.clientWidth));
    measure();
    const ro = new ResizeObserver(measure); ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [pinned, month.ym]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -dist]);
  const maxDay = Math.max(1, ...month.perDay);
  const peak = Math.max(...month.weeks.map((w) => w.total));

  return (
    <section ref={ref} className={`nx-weeks ${pinned ? 'is-pinned' : ''}`} style={pinned ? { height: '260vh' } : undefined} aria-labelledby="nx-weeks-h">
      <div className="nx-weeks-stick">
        <div className="nx-st-wrap">
          <p className="nx-eyebrow">Chapter three</p>
          <h2 id="nx-weeks-h" className="nx-st-h2"><MaskText text="Week by week" inView /></h2>
        </div>
        <div className="nx-weeks-viewport">
          <m.div ref={trackRef} className="nx-weeks-track" style={pinned ? { x } : undefined}>
            {month.weeks.map((w) => (
              <WeekCard key={w.from} w={w} ym={month.ym} max={maxDay}
                color={w.total === peak ? 'var(--nx-primary)' : 'var(--nx-faint)'} />
            ))}
          </m.div>
        </div>
      </div>
    </section>
  );
}

export default function Story() {
  const L = useLedger();
  const month = useMemo(() => summarizeMonth(L.expenses, L.month), [L.expenses, L.month]);
  const prev = useMemo(() => summarizeMonth(L.expenses, shiftMonth(L.month, -1)), [L.expenses, L.month]);

  if (L.status !== 'ready' || !L.expenses.length) {
    return <LoadState status={L.status} error={L.error} retry={() => L.reload()} empty={!L.expenses.length} />;
  }
  if (!month.count) {
    return (
      <div className="nx-state">
        <h1 className="nx-h1">{monthName(L.month)} hasn’t got a story yet</h1>
        <p className="nx-muted">Nothing is logged for this month. Pick another month on the Overview.</p>
        <Link className="nx-btn nx-btn--primary" to="/next">Go to Overview</Link>
      </div>
    );
  }

  const heavyIso = month.heaviest ? `${month.ym}-${String(month.heaviest.day).padStart(2, '0')}` : null;
  const heavyRows = heavyIso ? month.rows.filter((e) => e.day === heavyIso).sort((a, b) => b.spend - a.spend) : [];
  const delta = prev.count ? month.total - prev.total : null;
  const isCurrent = month.ym === todayIso().slice(0, 7);

  return (
    <div className="nx-story">
      <Hero month={month} />
      <Race month={month} colorFor={L.colorFor} />

      <div className="nx-moments">
        <div className="nx-st-wrap"><p className="nx-eyebrow">Chapter two</p><h2 className="nx-st-h2"><MaskText text="Three moments" inView /></h2></div>
        {month.heaviest && (
          <Moment eyebrow="The heaviest day"
            figure={<span className="nx-moment-num">{month.heaviest.day}<small>{monthName(month.ym, 'short')}</small></span>}
            title={`${dayLabel(heavyIso, { weekday: 'long' })} cost ${inr(month.heaviest.total)}.`}>
            <ul className="nx-moment-list">
              {heavyRows.slice(0, 4).map((e) => (
                <li key={e.id} style={{ '--c': L.colorFor(e.category?.id) }}>
                  <span><i className="nx-dot" />{e.description || e.category?.name}</span><span className="nx-num">{inr(e.spend)}</span>
                </li>
              ))}
            </ul>
          </Moment>
        )}
        {month.biggest && (
          <Moment align="right" eyebrow="The single biggest spend"
            figure={<span className="nx-moment-num nx-moment-num--money">{inr(month.biggest.spend)}</span>}
            title={`${month.biggest.description || month.biggest.category?.name}, on ${dayLabel(month.biggest.day, { day: 'numeric', month: 'long' })}.`}>
            <p className="nx-muted">That one entry is {Math.round((month.biggest.spend / month.total) * 100)}% of everything you spent in {monthName(month.ym)}.</p>
          </Moment>
        )}
        {month.quiet.length > 0 && (
          <Moment eyebrow="The quietest stretch"
            figure={<span className="nx-moment-num">{month.quiet.length}<small>{month.quiet.length === 1 ? 'day' : 'days'}</small></span>}
            title={month.quiet.length === 1 ? `One day with nothing spent: ${month.quiet.from} ${monthName(month.ym, 'short')}.` : `In a row with nothing spent, from ${month.quiet.from} to ${month.quiet.from + month.quiet.length - 1} ${monthName(month.ym, 'short')}.`}>
            <div className="nx-quiet" aria-hidden="true" style={{ '--n': month.days }}>
              {month.perDay.map((v, i) => (
                <span key={i} className={i + 1 >= month.quiet.from && i + 1 < month.quiet.from + month.quiet.length ? 'is-quiet' : v ? 'has' : ''} />
              ))}
            </div>
          </Moment>
        )}
      </div>

      <Weeks month={month} />

      <section className="nx-close" aria-labelledby="nx-close-h">
        <div className="nx-st-wrap">
          <p className="nx-eyebrow">The close</p>
          <h2 id="nx-close-h" className="nx-st-h2">
            <MaskText inView text={delta == null
              ? `${monthName(month.ym)} is your first month on record.`
              : `${inr(Math.abs(delta))} ${delta > 0 ? 'more' : 'less'} than ${monthName(prev.ym)}${isCurrent ? ', so far' : ''}.`} />
          </h2>
          {delta != null && (
            <div className="nx-close-bars">
              {[{ label: monthName(prev.ym), v: prev.total, cls: 'is-prev' }, { label: monthName(month.ym), v: month.total, cls: '' }].map((b) => (
                <div key={b.label} className={`nx-close-bar ${b.cls}`}>
                  <span className="nx-close-label">{b.label}</span>
                  <m.span className="nx-close-fill" initial={{ scaleX: 0 }} whileInView={{ scaleX: b.v / Math.max(prev.total, month.total) }}
                    viewport={{ once: true, amount: 0.8 }} transition={{ duration: 1, ease: EMPHASIS }} />
                  <span className="nx-num">{inr(b.v)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="nx-close-actions">
            <Link to="/next/activity" className="nx-btn nx-btn--primary">See every expense <ArrowOutwardRounded fontSize="small" /></Link>
            <Link to="/next" className="nx-btn nx-btn--ghost">Back to overview</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
