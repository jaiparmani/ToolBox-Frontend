/**
 * Motion helpers for /next. Durations and curves come from theme/tokens so the
 * new UI moves with the same timing as the classic app. Every animation in
 * /next has a user cause (see the motion budget in NextApp.js).
 */
import { useEffect, useState } from 'react';
import { motion as T } from '../theme/tokens';

const bez = (s) => s.match(/[\d.]+/g).map(Number);
export const EASE = bez(T.ease);          // settle
export const EMPHASIS = bez(T.emphasis);  // overshoot: the stamp's thunk
export const sec = (ms) => ms / 1000;
export const DUR = T;

/** Live media-query subscription (reduced motion, breakpoints). */
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
