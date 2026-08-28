import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useReducedMotion } from 'framer-motion';
import { accents } from '../../theme/tokens';

/**
 * A comet that follows the pointer.
 *
 * A soft trail of sparks streams off the cursor as it moves across the surface,
 * fading and drifting like embers. Purely ambient decoration on a fixed,
 * pointer-transparent canvas — it never blocks a click. Desktop only (needs a
 * fine pointer), and a no-op under reduced motion. Emits nothing while the
 * pointer is still, so a resting cursor is calm.
 */
export default function CursorComet() {
  const canvasRef = React.useRef(null);
  const theme = React.useRef(null);
  const t = useTheme();
  theme.current = t.palette.mode;
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (reduce) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0, dpr = 1, W = 0, Hh = 0, running = true;
    const parts = [];
    let last = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; Hh = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = [accents.violet, accents.cyan, accents.blue];
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      if (last) {
        const d = Math.hypot(x - last.x, y - last.y);
        const n = Math.min(4, Math.floor(d / 6)); // more sparks the faster you move
        for (let i = 0; i < n; i++) {
          parts.push({
            x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6 + 0.2,
            life: 1, size: 1.4 + Math.random() * 2.4, c: COLORS[(Math.random() * COLORS.length) | 0],
          });
        }
      }
      last = { x, y };
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const loop = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, Hh);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= 0.03;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else { running = true; raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce]);

  if (reduce) return null;
  return <canvas ref={canvasRef} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1200 }} />;
}
