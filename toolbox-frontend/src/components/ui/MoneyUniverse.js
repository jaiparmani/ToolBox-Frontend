import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { accents, chart } from '../../theme/tokens';
import { moneySmart } from './money';
import { deriveWeather } from './FinancialWeather';
import AnimatedNumber from './AnimatedNumber';

/**
 * The Money Universe — your month rendered as a spatial scene.
 *
 * A central star is your net position; around it orbit the bodies that make it:
 * income pulls close, each spending category is a world sized by what it cost,
 * and bills ahead loom on the outer ring. Nothing here is invented — every
 * body's radius maps (on a square-root scale, so area tracks the amount) to a
 * real figure, printed on hover and listed for screen readers. It's atmosphere
 * in service of the truth, not instead of it.
 *
 * Honours the same Financial Weather the rest of the app shows: the star's aura
 * warms and quickens as conditions turn. Reduced motion holds the scene still
 * (one composed frame, no orbit); with no meaningful data it renders nothing and
 * the dashboard's plain cards carry on. Pure 2D canvas — no WebGL, no new deps —
 * so it degrades everywhere and stays cheap to paint.
 */

const RING = { income: 0.42, category: 0.7, bill: 0.96 }; // fraction of max orbit radius

export default function MoneyUniverse({
  income = 0, categories = [], bills = 0, net = 0,
  projection, pulse, weatherKey, onSelectCategory, height,
  netOverride = null, overrideActive = false, overrideLabel = '',
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // index into bodies, or null
  const [reduce, setReduce] = useState(false);

  const H = height || (compact ? 300 : 380);
  const key = weatherKey || deriveWeather({ projection, pulse }).key || 'clear';
  const baseAura = { clear: accents.mint, tailwind: accents.cyan, pressure: accents.amber, storm: accents.red }[key] || accents.mint;
  const auraSpeed = { clear: 1, tailwind: 1.15, pressure: 1.3, storm: 1.6 }[key] || 1;

  // Scrubbing time: the star reflows to the projection's balance at the scrubbed
  // day (a real number from the series). A ref carries the live target into the
  // rAF loop so a scrub never restarts the canvas; the star eases toward it.
  const targetNet = netOverride != null ? netOverride : net;
  const targetNetRef = useRef(targetNet); targetNetRef.current = targetNet;
  const dispNetRef = useRef(targetNet);
  // A day scrubbed into the red storms the aura, on-track keeps the weather hue.
  const auraColor = targetNet < 0 ? accents.red : baseAura;

  // Reduced-motion is a live signal, not a one-shot read.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // Build the bodies from real figures. Categories are capped to the biggest few
  // with the remainder folded into one honest "Other" world, so a long tail
  // never turns into visual noise.
  const bodies = useMemo(() => {
    const cats = [...(categories || [])].filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    const MAX = compact ? 5 : 7;
    let shown = cats;
    if (cats.length > MAX) {
      const head = cats.slice(0, MAX - 1);
      const rest = cats.slice(MAX - 1).reduce((s, c) => s + c.amount, 0);
      shown = [...head, { name: 'Other', amount: rest }];
    }
    const palette = dark ? chart.categorical.dark : chart.categorical.light;

    const list = [];
    if (income > 0) list.push({ kind: 'income', name: 'Income', amount: income, ring: RING.income, color: accents.mint });
    shown.forEach((c, i) => list.push({ kind: 'category', name: c.name, amount: c.amount, ring: RING.category, color: palette[i % palette.length] }));
    if (bills > 0) list.push({ kind: 'bill', name: 'Bills ahead', amount: bills, ring: RING.bill, color: accents.amber });

    const peak = Math.max(...list.map(b => b.amount), 1);
    // Spread same-ring bodies evenly; start at the top and go clockwise.
    const ringCounts = {}; list.forEach(b => { ringCounts[b.ring] = (ringCounts[b.ring] || 0) + 1; });
    const ringIndex = {};
    return list.map((b) => {
      const n = ringCounts[b.ring]; const idx = (ringIndex[b.ring] = (ringIndex[b.ring] ?? -1) + 1);
      const baseAngle = (idx / n) * Math.PI * 2 - Math.PI / 2 + (b.ring * 1.3);
      const scale = Math.sqrt(b.amount / peak); // area ∝ amount
      return { ...b, baseAngle, rMin: compact ? 9 : 11, rMax: compact ? 26 : 34, scale,
        r: (compact ? 9 : 11) + scale * (compact ? 17 : 23),
        speed: (b.ring === RING.income ? 0.16 : b.ring === RING.bill ? 0.07 : 0.11) };
    });
  }, [categories, income, bills, compact, dark]);

  const hasData = bodies.length > 0 || Math.abs(net) > 0;

  // ── Render loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasData) return;
    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // no 2D context → dashboard cards remain the truth

    let raf = 0, running = true, t = 0, dpr = 1, W = 0, Hh = 0;
    const stars = []; // static backdrop specks
    const trails = bodies.map(() => []); // recent positions per body → comet tails
    const TRAIL = compact ? 12 : 18;
    const meteors = []; // occasional shooting stars

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth; Hh = H;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.length = 0;
      const count = compact ? 40 : 80;
      for (let i = 0; i < count; i++) stars.push({ x: Math.random() * W, y: Math.random() * Hh, r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.1 });
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    const orbitMax = () => Math.min(W, Hh) / 2 - (compact ? 30 : 40);

    const draw = () => {
      const cx = W / 2, cy = Hh / 2, oMax = orbitMax();
      ctx.clearRect(0, 0, W, Hh);

      // Deep-space vignette
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) / 1.3);
      vg.addColorStop(0, dark ? 'rgba(20,22,34,0.0)' : 'rgba(230,234,244,0.0)');
      vg.addColorStop(1, dark ? 'rgba(8,9,14,0.55)' : 'rgba(210,216,230,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);

      // Starfield
      for (const s of stars) { ctx.globalAlpha = s.a * (dark ? 1 : 0.6); ctx.fillStyle = dark ? '#fff' : '#5b6480'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;

      // Shooting stars — a rare streak across the field, purely ambient.
      if (!reduce) {
        if (Math.random() < 0.007 && meteors.length < 2) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          meteors.push({ x: dir > 0 ? -20 : W + 20, y: Math.random() * Hh * 0.55, vx: dir * (5 + Math.random() * 3), vy: 1.3 + Math.random() * 1.6, life: 1 });
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx; m.y += m.vy; m.life -= 0.016;
          if (m.life <= 0 || m.x < -40 || m.x > W + 40 || m.y > Hh + 40) { meteors.splice(i, 1); continue; }
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 4.5, m.y - m.vy * 4.5);
          grad.addColorStop(0, `rgba(255,255,255,${0.85 * m.life})`);
          grad.addColorStop(1, 'rgba(120,180,255,0)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 4.5, m.y - m.vy * 4.5); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }

      // Positions
      const pts = bodies.map((b, i) => {
        const ang = b.baseAngle + (reduce ? 0 : t * b.speed);
        const bob = reduce ? 0 : Math.sin(t * 0.8 + i) * 3;
        const rad = oMax * b.ring + bob;
        return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
      });

      // Gravity lines (star → body), faint; brighter for the hovered one
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hover === i;
        ctx.strokeStyle = b.color; ctx.globalAlpha = on ? 0.5 : 0.16; ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Comet trails — each body leaves a fading, tapering tail. Additive so
      // overlaps bloom. (Held still under reduced motion: no history, no tails.)
      if (!reduce) {
        bodies.forEach((b, i) => { const tr = trails[i]; tr.push(pts[i]); if (tr.length > TRAIL) tr.shift(); });
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        bodies.forEach((b, i) => {
          const tr = trails[i]; const on = hover === i;
          for (let k = 1; k < tr.length; k++) {
            const a = k / tr.length; // head brightest
            ctx.globalAlpha = a * a * (on ? 0.55 : 0.32);
            ctx.strokeStyle = b.color;
            ctx.lineWidth = Math.max(0.5, a * b.r * 0.9);
            ctx.beginPath(); ctx.moveTo(tr[k - 1].x, tr[k - 1].y); ctx.lineTo(tr[k].x, tr[k].y); ctx.stroke();
          }
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // Star: net position (eased toward the scrubbed target), weather-tinted aura
      dispNetRef.current += (targetNetRef.current - dispNetRef.current) * (reduce ? 1 : 0.14);
      const dNet = dispNetRef.current;
      const sColor = dNet >= 0 ? accents.mint : accents.red;
      const auraCol = dNet < 0 ? accents.red : baseAura;
      const heft = Math.min(1, Math.abs(dNet) / (Math.max(income, bills, 1) * 1.2 || 1));
      const coreR = (compact ? 20 : 26) + heft * (compact ? 8 : 12);
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.4);
      aura.addColorStop(0, hexA(auraCol, 0.42));
      aura.addColorStop(0.5, hexA(auraCol, 0.14));
      aura.addColorStop(1, hexA(auraCol, 0));
      const pulse2 = reduce ? 1 : 1 + Math.sin(t * 1.6 * auraSpeed) * 0.06;
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, coreR * 3.4 * pulse2, 0, 7); ctx.fill();
      const core = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
      core.addColorStop(0, '#ffffff'); core.addColorStop(0.35, sColor); core.addColorStop(1, hexA(sColor, 0.65));
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 7); ctx.fill();

      // Bodies
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hover === i;
        // Bloom halo — additive so overlapping bodies glow into each other.
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, b.r * 3);
        glow.addColorStop(0, hexA(b.color, on ? 0.6 : 0.4));
        glow.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, b.r * 3, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(p.x - b.r * 0.3, p.y - b.r * 0.3, 0, p.x, p.y, b.r);
        g.addColorStop(0, hexA('#ffffff', dark ? 0.9 : 0.95)); g.addColorStop(0.4, b.color); g.addColorStop(1, hexA(b.color, 0.7));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, b.r, 0, 7); ctx.fill();
        if (on) { ctx.strokeStyle = dark ? '#fff' : '#111'; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, b.r + 4, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      });

      // Expose positions for hit-testing
      canvas._pts = pts; canvas._star = { x: cx, y: cy, r: coreR };
    };

    const loop = () => { if (!running) return; t += 0.016; draw(); raf = requestAnimationFrame(loop); };
    if (reduce) { draw(); } else { raf = requestAnimationFrame(loop); }

    const onVis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!reduce) { running = true; raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } }
      else { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.05 });
    io.observe(wrap);

    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [bodies, reduce, dark, compact, H, income, bills, baseAura, auraSpeed, hover, hasData]);

  // ── Pointer / keyboard hit-testing ─────────────────────────────────────────
  const pick = (clientX, clientY) => {
    const canvas = canvasRef.current; if (!canvas || !canvas._pts) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestD = Infinity;
    bodies.forEach((b, i) => { const p = canvas._pts[i]; const d = Math.hypot(p.x - x, p.y - y); if (d < b.r + 12 && d < bestD) { bestD = d; best = i; } });
    return best;
  };
  const onMove = (e) => setHover(pick(e.clientX, e.clientY));
  const onLeave = () => setHover(null);
  const onClick = (e) => { const i = pick(e.clientX, e.clientY); if (i != null && bodies[i].kind === 'category' && onSelectCategory) onSelectCategory(bodies[i].name); };
  const onKey = (e) => {
    if (!bodies.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setHover(h => ((h == null ? -1 : h) + 1) % bodies.length); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setHover(h => ((h == null ? 1 : h) - 1 + bodies.length) % bodies.length); }
    else if (e.key === 'Enter' && hover != null && bodies[hover].kind === 'category' && onSelectCategory) onSelectCategory(bodies[hover].name);
    else if (e.key === 'Escape') setHover(null);
  };

  if (!hasData) return null;

  const active = hover != null ? bodies[hover] : null;
  const summary = `Money Universe. Net ${moneySmart(net)}. ${income > 0 ? `Income ${moneySmart(income)}. ` : ''}` +
    `${bodies.filter(b => b.kind === 'category').length} spending categories. ${bills > 0 ? `Bills ahead ${moneySmart(bills)}.` : ''}`;

  return (
    <Box
      ref={wrapRef}
      sx={{ position: 'relative', width: '100%', height: H, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        background: dark ? 'radial-gradient(120% 100% at 50% 40%, #16182400 0%, #0b0c12 100%)' : 'radial-gradient(120% 100% at 50% 40%, #eef1f800 0%, #dfe4f0 100%)' }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onClick}
        onKeyDown={onKey}
        style={{ display: 'block', touchAction: 'pan-y', cursor: active?.kind === 'category' ? 'pointer' : 'default', outline: 'none' }}
      />

      {/* Center readout: the star's real figure, always legible. While scrubbing
          it names the day and counts to that day's projected balance. */}
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: overrideActive ? accents.cyan : 'text.secondary', textTransform: 'uppercase' }}>
          {overrideActive ? (overrideLabel || 'Projected') : 'Net'}
        </Typography>
        <Typography component="div" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, fontWeight: 800, color: targetNet >= 0 ? accents.mint : accents.red, fontVariantNumeric: 'tabular-nums', textShadow: dark ? '0 1px 8px rgba(0,0,0,0.6)' : 'none' }}>
          <AnimatedNumber value={targetNet} format="smart" />
        </Typography>
      </Box>

      {/* Hover / focus readout */}
      {active && (
        <Box sx={{ position: 'absolute', left: 12, bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 1, borderRadius: 3, backdropFilter: 'blur(8px)',
          bgcolor: dark ? 'rgba(20,22,32,0.72)' : 'rgba(255,255,255,0.82)', border: '1px solid', borderColor: 'divider', pointerEvents: 'none' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: active.color }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{active.name}</Typography>
          <Typography sx={{ ml: 'auto', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: active.color }}>{moneySmart(active.amount)}</Typography>
        </Box>
      )}

      {/* Hint (fades where a body is active) */}
      {!active && (
        <Typography sx={{ position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', fontSize: 11, color: 'text.secondary', pointerEvents: 'none', opacity: 0.8 }}>
          {reduce ? 'Every body is real money — hover to read it' : 'Hover a world to read it · bigger means it cost more'}
        </Typography>
      )}

      {/* Screen-reader truth: the same figures as a list, never trapped in the canvas */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        {bodies.map((b, i) => <li key={i}>{b.name}: {moneySmart(b.amount)}</li>)}
      </Box>
    </Box>
  );
}

// Turn a #rrggbb into rgba() at a given alpha (accepts a few named accents too).
function hexA(hex, a) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
