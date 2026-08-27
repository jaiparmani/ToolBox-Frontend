import React from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * A single, app-wide particle layer for money in motion.
 *
 * Mounted once behind the shell; any action fires a stream by dispatching a
 * `toolbox:flow` event — settle a split and a ribbon of light streams from that
 * person's node home to you, then dissolves. Emission is tied to the real
 * amount (more money, more particles, within a sane cap), so the spectacle
 * still tells the truth. Fully decoupled (no context/prop wiring), pointer-
 * transparent, and a no-op under reduced motion.
 *
 * Fire it like:
 *   window.dispatchEvent(new CustomEvent('toolbox:flow', { detail: {
 *     from: elementOrPoint, to: elementOrPoint, amount, color
 *   }}));
 */
export default function ParticleFlow() {
  const canvasRef = React.useRef(null);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (reduce) return undefined; // honour reduced-motion: no particles at all
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0, dpr = 1, running = false;
    const particles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const point = (v) => {
      if (!v) return null;
      if (typeof v.x === 'number') return { x: v.x, y: v.y };
      if (v.getBoundingClientRect) { const r = v.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      return null;
    };

    const spawn = ({ from, to, amount = 0, color = '#0A84FF' }) => {
      const a = point(from), b = point(to);
      if (!a || !b) return;
      // Particle count scales with the amount but stays bounded.
      const n = Math.max(14, Math.min(64, Math.round(14 + Math.sqrt(Math.abs(amount)) * 1.1)));
      // A gentle control point to one side gives the stream a curved, alive arc.
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y), ny = (b.x - a.x); const len = Math.hypot(nx, ny) || 1;
      const bow = (Math.hypot(b.x - a.x, b.y - a.y)) * 0.22;
      const cx = mx + (nx / len) * bow, cy = my + (ny / len) * bow;
      for (let i = 0; i < n; i++) {
        particles.push({
          a, b, c: { x: cx, y: cy }, color,
          t: -Math.random() * 0.5,           // staggered start (negative = delay)
          speed: 0.012 + Math.random() * 0.01,
          size: 1.4 + Math.random() * 2.2,
          jitter: (Math.random() - 0.5) * 10,
          life: 1,
        });
      }
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    };

    const bezier = (p, t) => {
      const u = 1 - t;
      return {
        x: u * u * p.a.x + 2 * u * t * p.c.x + t * t * p.b.x,
        y: u * u * p.a.y + 2 * u * t * p.c.y + t * t * p.b.y,
      };
    };

    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter'; // additive glow where streams overlap
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.speed;
        if (p.t < 0) continue;
        if (p.t >= 1) { particles.splice(i, 1); continue; }
        const pos = bezier(p, p.t);
        // Perpendicular jitter that eases to zero as it arrives (the stream
        // gathers into you at the end).
        const perp = Math.sin(p.t * Math.PI);
        const fade = p.t < 0.15 ? p.t / 0.15 : 1 - Math.max(0, (p.t - 0.7) / 0.3);
        ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = p.color;
        const size = p.size * (0.6 + perp * 0.6);
        ctx.beginPath();
        ctx.arc(pos.x + p.jitter * perp * 0.3, pos.y + p.jitter * perp * 0.3, size, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (particles.length) raf = requestAnimationFrame(loop);
      else { running = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    };

    const onFlow = (e) => spawn(e.detail || {});
    window.addEventListener('toolbox:flow', onFlow);

    return () => {
      window.removeEventListener('toolbox:flow', onFlow);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1250 }}
    />
  );
}
