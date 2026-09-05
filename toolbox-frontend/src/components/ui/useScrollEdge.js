import { useState, useEffect, useRef } from 'react';

/**
 * Scroll-edge materialization — Apple Design §12.
 *
 * Uses an IntersectionObserver on a tiny sentinel element placed at the top
 * of the scroll area. When the sentinel scrolls out of view, `scrolled`
 * becomes true — the topbar border materializes. When it scrolls back into
 * view, it fades out. No scroll listeners, no JS measurement, pure observer.
 *
 * Usage:
 *   const { sentinelRef, scrolled } = useScrollEdge();
 *   <div ref={sentinelRef} style={{ height: 1 }} />  // place at top of content
 *   <header style={{ borderColor: scrolled ? 'var(--divider)' : 'transparent' }}>
 */
export default function useScrollEdge() {
  const sentinelRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, scrolled };
}
