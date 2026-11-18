/**
 * Motion primitives for the /next UI. Every timing and curve comes from
 * theme/tokens `motion`; each primitive has a reduced-motion path that shows
 * the final state at once, so nothing depends on an animation finishing.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion as m, useReducedMotion } from 'framer-motion';
import { motion as T } from '../theme/tokens';

const bez = (s) => s.match(/[\d.]+/g).map(Number);
export const EASE = bez(T.ease);          // settle
export const EMPHASIS = bez(T.emphasis);  // overshoot
export const sec = (ms) => ms / 1000;

/**
 * Kinetic figure: each digit is a 0–9 reel that rolls to its value. Reels are
 * keyed by place value (from the right) so changing ₹48,210 → ₹49,010 only
 * rolls the digits that actually changed. Screen readers get the plain string.
 */
export function RollingNumber({ value, format, className = '', delay = 0 }) {
  const text = format(value);
  const reduce = useReducedMotion();
  const [armedState, setArmed] = useState(false);
  const armed = armedState || reduce;
  useEffect(() => { const t = setTimeout(() => setArmed(true), 40); return () => clearTimeout(t); }, []);
  const chars = text.split('');
  let place = chars.filter((c) => /\d/.test(c)).length;
  return (
    <span className={`nx-roll ${className}`} role="img" aria-label={text}>
      {chars.map((c, i) => {
        if (!/\d/.test(c)) return <span key={`s${i}-${c}`} aria-hidden="true" className="nx-roll-sym">{c}</span>;
        place -= 1;
        const d = armed ? Number(c) : 0;
        return (
          <span key={`p${place}`} aria-hidden="true" className="nx-roll-win">
            <span
              className="nx-roll-reel"
              style={{ transform: `translateY(${-d * 10}%)`, transitionDelay: `${delay + (chars.length - i) * 28}ms` }}
            >
              {'0123456789'.split('').map((n) => <span key={n}>{n}</span>)}
            </span>
            {/* Invisible copy sets the width of the window to the real glyph. */}
            <span className="nx-roll-ghost">{c}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Kinetic type: words rise out of a mask, one after another. `inView` defers
 * the reveal until the line scrolls into view (story chapters).
 */
export function MaskText({ text, as: Tag = 'span', className = '', delay = 0, inView = false, stagger = 0.045 }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const trigger = inView
    ? { initial: 'hidden', whileInView: 'shown', viewport: { once: true, amount: 0.6 } }
    : { initial: 'hidden', animate: 'shown' };
  return (
    <Tag className={`nx-mask ${className}`}>
      <span className="nx-sr">{text}</span>
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          <span className="nx-mask-win" aria-hidden="true">
            <m.span
              className="nx-mask-word"
              variants={{ hidden: { y: reduce ? 0 : '108%' }, shown: { y: 0 } }}
              {...(reduce ? {} : trigger)}
              transition={{ duration: sec(T.slower), ease: EASE, delay: delay + i * stagger }}
            >
              {w}
            </m.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/**
 * Magnetic pull for the one primary button: the element leans toward the
 * pointer and springs home on leave. Transforms are written straight to the
 * node on the event (no rAF) so it never stalls in a background tab.
 */
export function Magnetic({ children, strength = 0.28, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => {
    if (reduce || !fine) return;
    const el = ref.current; const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transition = 'none';
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.transition = `transform ${T.slow}ms ${T.emphasis}`;
    el.style.transform = 'translate3d(0,0,0)';
  };
  return (
    <span ref={ref} className={`nx-magnetic ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </span>
  );
}

/** Pointer spotlight: writes --mx/--my to the panel; CSS paints a faint light. */
export const spotlight = {
  onPointerMove: (e) => {
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
};

/** Live media-query hook (reduced motion etc. are subscriptions, not reads). */
export function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Stagger container + item variants for lists. */
export const listV = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } },
};
export const itemV = (reduce) => ({
  hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: sec(T.normal), ease: EASE } },
});
