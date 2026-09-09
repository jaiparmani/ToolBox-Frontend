import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { accents, chart, color as colorRole } from '../../theme/tokens';
import { moneySmart } from './money';
import { deriveWeather } from './FinancialWeather';
import AnimatedNumber from './AnimatedNumber';

const RING = { income: 0.42, category: 0.7, bill: 0.96 };

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
  const [hover, setHover] = useState(null);
  const hoverRef = useRef(hover); hoverRef.current = hover;
  const [reduce, setReduce] = useState(false);

  const H = height || (compact ? 340 : 420);
  const key = weatherKey || deriveWeather({ projection, pulse }).key || 'clear';
  const baseAura = { clear: accents.mint, tailwind: accents.cyan, pressure: accents.amber, storm: accents.red }[key] || accents.mint;
  const auraSpeed = { clear: 1, tailwind: 1.15, pressure: 1.3, storm: 1.6 }[key] || 1;

  const targetNet = netOverride != null ? netOverride : net;
  const targetNetRef = useRef(targetNet); targetNetRef.current = targetNet;
  const dispNetRef = useRef(targetNet);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const bodies = useMemo(() => {
    const cats = [...(categories || [])].filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    const MAX = compact ? 5 : 7;
    let shown = cats;
    if (cats.length > MAX) {
      const head = cats.slice(0, MAX - 1);
      const tail = cats.slice(MAX - 1);
      shown = [...head, { name: 'Other', amount: tail.reduce((s, c) => s + c.amount, 0), folds: tail.length }];
    }
    const palette = dark ? chart.categorical.dark : chart.categorical.light;
    const spend = shown.reduce((s, c) => s + c.amount, 0);

    const list = [];
    if (income > 0) list.push({ kind: 'income', name: 'Income', amount: income, ring: RING.income, color: accents.mint });
    let acc = 0;
    shown.forEach((c, i) => {
      const share = spend > 0 ? c.amount / spend : 1 / shown.length;
      const a0 = acc; acc += share;
      list.push({ kind: 'category', name: c.name, amount: c.amount, ring: RING.category,
        color: palette[i % palette.length], share, a0, a1: acc, folds: c.folds });
    });
    if (bills > 0) list.push({ kind: 'bill', name: 'Bills ahead', amount: bills, ring: RING.bill, color: accents.amber });

    const peak = Math.max(...list.map(b => b.amount), 1);
    const ringCounts = {}; list.forEach(b => { if (b.share == null) ringCounts[b.ring] = (ringCounts[b.ring] || 0) + 1; });
    const ringIndex = {};
    return list.map((b) => {
      let baseAngle;
      if (b.share != null) {
        baseAngle = ((b.a0 + b.a1) / 2) * Math.PI * 2 - Math.PI / 2;
      } else {
        const n = ringCounts[b.ring]; const idx = (ringIndex[b.ring] = (ringIndex[b.ring] ?? -1) + 1);
        baseAngle = (idx / n) * Math.PI * 2 - Math.PI / 2 + (b.ring * 1.3);
      }
      const scale = Math.sqrt(b.amount / peak);
      return { ...b, baseAngle, rMin: compact ? 9 : 11, rMax: compact ? 26 : 34, scale,
        r: (compact ? 9 : 11) + scale * (compact ? 17 : 23),
        speed: (b.ring === RING.income ? 0.16 : b.ring === RING.bill ? 0.07 : 0.11) };
    });
  }, [categories, income, bills, compact, dark]);

  const totalSpent = useMemo(() => (categories || []).filter(c => c.amount > 0).reduce((s, c) => s + c.amount, 0), [categories]);

  const allCats = useMemo(
    () => [...(categories || [])].filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount),
    [categories],
  );

  const hasData = bodies.length > 0 || Math.abs(net) > 0;

  // ── Render loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasData) return;
    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0, running = true, t = 0, dt = 0, last = 0, dpr = 1, W = 0, Hh = 0;
    const stars = [];
    const trails = bodies.map(() => []);
    const TRAIL = compact ? 14 : 22;
    const meteors = [];
    // Ambient dust — tiny particles drifting slowly through the void
    const dust = [];
    // Solar flare wisps from the star
    const flares = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth; Hh = H;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.length = 0;
      const count = compact ? 60 : 120;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * Hh,
          r: Math.random() * 1.4 + 0.15,
          a: Math.random() * 0.6 + 0.08,
          twinkleSpeed: 0.3 + Math.random() * 2.5,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      // Seed dust particles
      dust.length = 0;
      const dustCount = compact ? 25 : 50;
      for (let i = 0; i < dustCount; i++) {
        dust.push({
          x: Math.random() * W, y: Math.random() * Hh,
          vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.1,
          r: Math.random() * 1.8 + 0.3,
          a: Math.random() * 0.2 + 0.03,
          hue: [accents.mint, accents.cyan, accents.violet, accents.blue][Math.floor(Math.random() * 4)],
        });
      }
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce || !running) draw(); }); ro.observe(wrap);

    const orbitMax = () => Math.min(W, Hh) / 2 - (compact ? 30 : 40);

    const draw = () => {
      const cx = W / 2, cy = Hh / 2, oMax = orbitMax();
      ctx.clearRect(0, 0, W, Hh);

      // Deep-space vignette
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) / 1.3);
      vg.addColorStop(0, dark ? 'rgba(20,22,34,0.0)' : 'rgba(230,234,244,0.0)');
      vg.addColorStop(1, dark ? 'rgba(8,9,14,0.55)' : 'rgba(210,216,230,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);

      // Nebula wash — more dynamic, richer clouds
      const nt = reduce ? 0 : t;
      const clouds = [
        { hue: baseAura, ox: 0.32, oy: 0.36, r: 0.58, sp: 0.05, ph: 0 },
        { hue: accents.violet, ox: 0.72, oy: 0.62, r: 0.65, sp: 0.04, ph: 2.1 },
        { hue: accents.blue, ox: 0.52, oy: 0.44, r: 0.55, sp: 0.03, ph: 4.3 },
        { hue: accents.cyan, ox: 0.24, oy: 0.68, r: 0.48, sp: 0.035, ph: 5.6 },
        { hue: accents.purple || accents.violet, ox: 0.58, oy: 0.28, r: 0.42, sp: 0.025, ph: 1.4 },
      ];
      ctx.globalCompositeOperation = 'lighter';
      for (const n of clouds) {
        const nx = W * n.ox + Math.sin(nt * n.sp + n.ph) * W * 0.15;
        const ny = Hh * n.oy + Math.cos(nt * n.sp * 0.8 + n.ph) * Hh * 0.15;
        const rad = Math.min(W, Hh) * n.r;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        g.addColorStop(0, hexA(n.hue, dark ? 0.15 : 0.09));
        g.addColorStop(0.6, hexA(n.hue, dark ? 0.06 : 0.03));
        g.addColorStop(1, hexA(n.hue, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, ny, rad, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      const flash = reduce ? 0 : Math.max(0, 1 - t / 1.4);

      // Twinkling starfield
      for (const s of stars) {
        const twinkle = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.a * twinkle * (dark ? 1 : 0.6);
        ctx.fillStyle = dark ? '#fff' : '#5b6480';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
        // Brightest stars get a cross-shaped diffraction spike
        if (s.a > 0.4 && s.r > 0.8) {
          ctx.globalAlpha = s.a * twinkle * 0.3;
          ctx.strokeStyle = dark ? '#fff' : '#8090b0';
          ctx.lineWidth = 0.5;
          const spikeLen = s.r * 4;
          ctx.beginPath(); ctx.moveTo(s.x - spikeLen, s.y); ctx.lineTo(s.x + spikeLen, s.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.x, s.y - spikeLen); ctx.lineTo(s.x, s.y + spikeLen); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Ambient dust particles drifting through the void
      if (!reduce) {
        ctx.globalCompositeOperation = 'lighter';
        for (const d of dust) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < -10) d.x = W + 10;
          if (d.x > W + 10) d.x = -10;
          if (d.y < -10) d.y = Hh + 10;
          if (d.y > Hh + 10) d.y = -10;
          // Dust near the star glows brighter
          const distToStar = Math.hypot(d.x - cx, d.y - cy);
          const nearStar = Math.max(0, 1 - distToStar / (oMax * 0.6));
          ctx.globalAlpha = d.a + nearStar * 0.12;
          const dg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2);
          dg.addColorStop(0, hexA(d.hue, 0.6));
          dg.addColorStop(1, hexA(d.hue, 0));
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 2, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // Shooting stars — enhanced with colour and longer tails
      if (!reduce) {
        if (Math.random() < 0.5 * dt && meteors.length < 3) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const hues = [accents.cyan, accents.mint, '#ffffff', accents.blue];
          meteors.push({
            x: dir > 0 ? -20 : W + 20, y: Math.random() * Hh * 0.6,
            vx: dir * (5 + Math.random() * 4), vy: 1.3 + Math.random() * 2, life: 1,
            hue: hues[Math.floor(Math.random() * hues.length)],
          });
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          const step = dt * 60;
          m.x += m.vx * step; m.y += m.vy * step; m.life -= dt * 0.7;
          if (m.life <= 0 || m.x < -40 || m.x > W + 40 || m.y > Hh + 40) { meteors.splice(i, 1); continue; }
          // Wider, more vivid trail
          const tailLen = 6;
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tailLen, m.y - m.vy * tailLen);
          grad.addColorStop(0, hexA(m.hue, 0.9 * m.life));
          grad.addColorStop(0.3, hexA(m.hue, 0.5 * m.life));
          grad.addColorStop(1, hexA(m.hue, 0));
          ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * tailLen, m.y - m.vy * tailLen); ctx.stroke();
          // Core glow at head
          const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 4);
          hg.addColorStop(0, hexA('#ffffff', 0.8 * m.life));
          hg.addColorStop(1, hexA(m.hue, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }

      // Orbit ring outlines — glowing instead of plain dashed
      ctx.save();
      for (const ringVal of [RING.income, RING.category, RING.bill]) {
        const ringR = oMax * ringVal;
        const ringPulse = reduce ? 1 : 1 + Math.sin(t * 0.5 + ringVal * 7) * 0.015;
        // Glow behind the ring
        ctx.globalCompositeOperation = 'lighter';
        const rg = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8);
        rg.addColorStop(0, hexA(baseAura, 0));
        rg.addColorStop(0.4, hexA(baseAura, dark ? 0.04 : 0.025));
        rg.addColorStop(1, hexA(baseAura, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, ringR + 8, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // The ring line itself
        ctx.setLineDash([3, 7]);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * ringPulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring labels
      ctx.save();
      ctx.font = `600 ${compact ? 7.5 : 9}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = dark ? 'rgba(140,148,180,0.24)' : 'rgba(80,90,120,0.28)';
      const labelAngle = Math.PI * 0.62;
      [
        { text: 'INCOME', ring: RING.income },
        { text: 'SPENDING', ring: RING.category },
        { text: 'BILLS', ring: RING.bill },
      ].forEach(l => {
        const rl = oMax * l.ring;
        ctx.fillText(l.text, cx + Math.cos(labelAngle) * rl, cy + Math.sin(labelAngle) * rl);
      });
      ctx.restore();

      // Share wedges — enhanced with gradient arcs
      const catRot = reduce ? 0 : t * 0.11;
      ctx.save();
      ctx.lineCap = 'butt';
      bodies.forEach((b, i) => {
        if (b.share == null) return;
        const on = hoverRef.current === i;
        const rl = oMax * RING.category;
        const hair = Math.min(0.05, (Math.PI * 2 * b.share) * 0.08);
        const a0 = b.a0 * Math.PI * 2 - Math.PI / 2 + catRot + hair;
        const a1 = b.a1 * Math.PI * 2 - Math.PI / 2 + catRot - hair;
        if (a1 <= a0) return;
        // Outer glow for the wedge
        if (on && !reduce) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = b.color; ctx.globalAlpha = 0.3; ctx.lineWidth = 12;
          ctx.beginPath(); ctx.arc(cx, cy, rl, a0, a1); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = b.color; ctx.globalAlpha = on ? 0.9 : 0.4;
        ctx.lineWidth = on ? 6 : 3;
        ctx.beginPath(); ctx.arc(cx, cy, rl, a0, a1); ctx.stroke();
      });
      ctx.restore();
      ctx.globalAlpha = 1;

      // Positions
      const pts = bodies.map((b, i) => {
        const ang = b.baseAngle + (reduce ? 0 : t * b.speed);
        const bob = reduce ? 0 : Math.sin(t * 0.8 + i) * 3;
        const rad = oMax * b.ring + bob;
        return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, ang };
      });

      // Gravity lines — enhanced with gradient
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i;
        const gl = ctx.createLinearGradient(cx, cy, p.x, p.y);
        gl.addColorStop(0, hexA(b.color, on ? 0.35 : 0.08));
        gl.addColorStop(1, hexA(b.color, on ? 0.6 : 0.2));
        ctx.strokeStyle = gl; ctx.lineWidth = on ? 2.5 : 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Constellation web
      const cats = [];
      bodies.forEach((b, i) => { if (b.kind === 'category') cats.push(pts[i]); });
      if (cats.length > 1) {
        ctx.strokeStyle = dark ? '#9ec5ff' : '#6b7fb0'; ctx.lineWidth = 0.75;
        for (let a = 0; a < cats.length; a++) {
          for (let c = a + 1; c < cats.length; c++) {
            const d = Math.hypot(cats[a].x - cats[c].x, cats[a].y - cats[c].y);
            ctx.globalAlpha = Math.max(0, 0.16 - d / (oMax * 20));
            if (ctx.globalAlpha <= 0.01) continue;
            ctx.beginPath(); ctx.moveTo(cats[a].x, cats[a].y); ctx.lineTo(cats[c].x, cats[c].y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // Comet trails — thicker, more vivid
      if (!reduce) {
        bodies.forEach((b, i) => { const tr = trails[i]; tr.push({ ...pts[i] }); if (tr.length > TRAIL) tr.shift(); });
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        bodies.forEach((b, i) => {
          const tr = trails[i]; const on = hoverRef.current === i;
          for (let k = 1; k < tr.length; k++) {
            const a = k / tr.length;
            ctx.globalAlpha = a * a * (on ? 0.65 : 0.38);
            ctx.strokeStyle = b.color;
            ctx.lineWidth = Math.max(0.5, a * b.r * 1.1);
            ctx.beginPath(); ctx.moveTo(tr[k - 1].x, tr[k - 1].y); ctx.lineTo(tr[k].x, tr[k].y); ctx.stroke();
          }
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── Star: solar corona / flares ─────────────────────────────────────
      const k = reduce ? 1 : 1 - Math.exp(-9 * dt);
      dispNetRef.current += (targetNetRef.current - dispNetRef.current) * k;
      const dNet = dispNetRef.current;
      const sColor = dNet >= 0 ? accents.mint : accents.red;
      const auraCol = dNet < 0 ? accents.red : baseAura;
      const heft = Math.min(1, Math.abs(dNet) / (Math.max(income, bills, 1) * 1.2 || 1));
      const coreR = (compact ? 22 : 28) + heft * (compact ? 10 : 14);
      const pulse2 = reduce ? 1 : 1 + Math.sin(t * 1.6 * auraSpeed) * 0.06;

      // Solar corona — multiple layered rings around the star
      if (!reduce) {
        ctx.globalCompositeOperation = 'lighter';
        for (let ring = 0; ring < 3; ring++) {
          const coronaR = coreR * (2.2 + ring * 1.2) * pulse2;
          const coronaA = 0.08 - ring * 0.02;
          const cg = ctx.createRadialGradient(cx, cy, coreR, cx, cy, coronaR);
          cg.addColorStop(0, hexA(auraCol, coronaA));
          cg.addColorStop(0.5, hexA(auraCol, coronaA * 0.4));
          cg.addColorStop(1, hexA(auraCol, 0));
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, 7); ctx.fill();
        }

        // Solar flare wisps — curved wisps that extend from the star
        if (Math.random() < 0.15 * dt && flares.length < 4) {
          flares.push({
            angle: Math.random() * Math.PI * 2,
            length: coreR * (1.5 + Math.random() * 2),
            width: 1 + Math.random() * 2,
            life: 1, decay: 0.3 + Math.random() * 0.4,
            curve: (Math.random() - 0.5) * 0.8,
          });
        }
        for (let i = flares.length - 1; i >= 0; i--) {
          const f = flares[i];
          f.life -= f.decay * dt;
          f.angle += 0.02 * dt;
          if (f.life <= 0) { flares.splice(i, 1); continue; }
          const fx1 = cx + Math.cos(f.angle) * coreR * 0.8;
          const fy1 = cy + Math.sin(f.angle) * coreR * 0.8;
          const fx2 = cx + Math.cos(f.angle + f.curve) * (coreR + f.length * f.life);
          const fy2 = cy + Math.sin(f.angle + f.curve) * (coreR + f.length * f.life);
          const cpx = cx + Math.cos(f.angle + f.curve * 0.5) * (coreR + f.length * 0.6 * f.life);
          const cpy = cy + Math.sin(f.angle + f.curve * 0.5) * (coreR + f.length * 0.6 * f.life);
          ctx.strokeStyle = hexA(auraCol, f.life * 0.5);
          ctx.lineWidth = f.width * f.life;
          ctx.beginPath(); ctx.moveTo(fx1, fy1); ctx.quadraticCurveTo(cpx, cpy, fx2, fy2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // Main aura
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.8);
      aura.addColorStop(0, hexA(auraCol, 0.48));
      aura.addColorStop(0.35, hexA(auraCol, 0.18));
      aura.addColorStop(0.7, hexA(auraCol, 0.06));
      aura.addColorStop(1, hexA(auraCol, 0));
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, coreR * 3.8 * pulse2, 0, 7); ctx.fill();

      // Star core — enhanced with surface detail
      const core = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.25, hexA('#ffffff', 0.9));
      core.addColorStop(0.5, sColor);
      core.addColorStop(1, hexA(sColor, 0.6));
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 7); ctx.fill();
      // Surface shimmer — subtle moving highlight
      if (!reduce) {
        const shimAngle = t * 0.4;
        const sx2 = cx + Math.cos(shimAngle) * coreR * 0.25;
        const sy2 = cy + Math.sin(shimAngle) * coreR * 0.25;
        const shim = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, coreR * 0.6);
        shim.addColorStop(0, 'rgba(255,255,255,0.25)');
        shim.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shim; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 7); ctx.fill();
      }
      // Rim highlight
      ctx.strokeStyle = hexA('#ffffff', 0.25); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, coreR - 0.5, 0, 7); ctx.stroke();

      // Arrival ripple
      if (flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(sColor, flash * 0.6); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, coreR + (1 - flash) * coreR * 3, 0, 7); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Bodies — enhanced with surface detail and atmosphere
      const pop = 1 + flash * 0.28;
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i;
        const br = b.r * pop;
        const depth = (reduce || on) ? 0 : Math.min(1, Math.max(0, (b.ring - 0.55) / 0.5));
        const spec = 0.9 - depth * 0.55;
        const halo = br * (3.5 + depth * 1.6);
        // Bloom halo
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        glow.addColorStop(0, hexA(b.color, Math.min(0.95, (on ? 0.7 : 0.45 - depth * 0.12) + flash * 0.4)));
        glow.addColorStop(0.5, hexA(b.color, (on ? 0.2 : 0.08)));
        glow.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, halo, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // Body sphere with enhanced specular
        const g = ctx.createRadialGradient(p.x - br * 0.35, p.y - br * 0.35, 0, p.x, p.y, br);
        g.addColorStop(0, hexA('#ffffff', dark ? spec : spec + 0.05));
        g.addColorStop(0.3, hexA('#ffffff', spec * 0.4));
        g.addColorStop(0.5, b.color);
        g.addColorStop(1, hexA(b.color, 0.6 - depth * 0.15));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, 7); ctx.fill();
        // Atmosphere ring
        if (on || br > 14) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = hexA(b.color, on ? 0.5 : 0.2); ctx.lineWidth = on ? 3 : 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, br + (on ? 5 : 3), 0, 7); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        // Hover selection ring
        if (on) {
          ctx.strokeStyle = dark ? '#fff' : '#111'; ctx.globalAlpha = 0.8; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, br + 8, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        }
      });

      // Body labels — category names displayed next to each body
      ctx.save();
      ctx.font = `600 ${compact ? 8 : 9.5}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.textBaseline = 'middle';
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i;
        if (on) return; // hover readout handles this
        const labelR = b.r + (compact ? 10 : 14);
        // Place label radially outward from center
        const angle = Math.atan2(p.y - cy, p.x - cx);
        const lx = p.x + Math.cos(angle) * labelR;
        const ly = p.y + Math.sin(angle) * labelR;
        ctx.textAlign = Math.cos(angle) > 0 ? 'left' : 'right';
        ctx.globalAlpha = 0.55 + (b.r > 16 ? 0.2 : 0);
        ctx.fillStyle = dark ? 'rgba(200,210,230,0.75)' : 'rgba(40,50,80,0.75)';
        // Truncate long names
        const name = b.name.length > (compact ? 6 : 10) ? b.name.slice(0, compact ? 5 : 9) + '…' : b.name;
        ctx.fillText(name, lx, ly);
        // Amount below name
        ctx.font = `700 ${compact ? 7 : 8.5}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.globalAlpha = 0.4;
        ctx.fillText(moneySmart(b.amount), lx, ly + (compact ? 10 : 12));
        ctx.font = `600 ${compact ? 8 : 9.5}px -apple-system, "SF Pro Display", sans-serif`;
      });
      ctx.restore();
      ctx.globalAlpha = 1;

      canvas._pts = pts; canvas._star = { x: cx, y: cy, r: coreR };
    };

    const loop = (now) => {
      if (!running) return;
      dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now; t += dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { last = 0; raf = requestAnimationFrame(loop); };
    if (reduce) { dt = 0.016; draw(); } else { start(); }

    let visible = true, onScreen = true;
    const sync = () => {
      const want = visible && onScreen && !reduce;
      if (want === running) return;
      running = want;
      if (want) start(); else cancelAnimationFrame(raf);
    };
    const onVis = () => { visible = !document.hidden; sync(); };
    document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: 0.05 });
    io.observe(wrap);

    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [bodies, reduce, dark, compact, H, income, bills, baseAura, auraSpeed, hasData]);

  // ── Pointer / keyboard hit-testing ─────────────────────────────────────────
  const pick = (clientX, clientY) => {
    const canvas = canvasRef.current; if (!canvas || !canvas._pts) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestD = Infinity;
    bodies.forEach((b, i) => { const p = canvas._pts[i]; const d = Math.hypot(p.x - x, p.y - y); if (d < b.r + 12 && d < bestD) { bestD = d; best = i; } });
    return best;
  };
  const onMove = (e) => { const i = pick(e.clientX, e.clientY); if (i !== hoverRef.current) setHover(i); };
  const onLeave = () => { if (hoverRef.current !== null) setHover(null); };
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
    `${allCats.length} spending categories totalling ${moneySmart(totalSpent)}. ${bills > 0 ? `Bills ahead ${moneySmart(bills)}.` : ''}`;

  return (
    <Box
      ref={wrapRef}
      sx={{ position: 'relative', width: '100%', height: H, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        background: dark
          ? `radial-gradient(120% 100% at 50% 40%, ${hexA(colorRole.bg.dark, 0)} 0%, ${colorRole.bg.dark} 100%)`
          : `radial-gradient(120% 100% at 50% 40%, ${hexA(colorRole.bg.light, 0)} 0%, ${colorRole.bg.light} 100%)`,
        '&:focus-within': { borderColor: 'primary.main' } }}
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

      {/* Center readout */}
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: { xs: 11, sm: 13 }, fontWeight: 700, letterSpacing: '0.16em', color: overrideActive ? accents.cyan : 'rgba(255,255,255,0.92)', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
          {overrideActive ? (overrideLabel || 'Projected') : 'Net'}
        </Typography>
        <Typography component="div" sx={{ fontSize: { xs: '1.15rem', sm: '1.45rem' }, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.95)' }}>
          <AnimatedNumber value={targetNet} format="smart" />
        </Typography>
      </Box>

      {/* Hover / focus readout — enhanced glassmorphism */}
      {active && (
        <Box sx={{ position: 'absolute', left: 12, bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1.25,
          px: 2, py: 1.25, borderRadius: 3.5, backdropFilter: 'blur(16px) saturate(180%)',
          bgcolor: dark ? 'rgba(16,18,28,0.82)' : 'rgba(255,255,255,0.88)',
          border: '1px solid', borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
          pointerEvents: 'none' }}>
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 35% 30%, #fff, ${active.color} 70%)`, boxShadow: `0 0 12px ${active.color}` }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 650, letterSpacing: '-0.01em' }} noWrap>
            {active.name}{active.folds ? ` · ${active.folds} smaller categories` : ''}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: active.color }}>{moneySmart(active.amount)}</Typography>
            {active.kind === 'category' && totalSpent > 0 && (
              <Typography sx={{ fontSize: 11.5, fontWeight: 550, color: 'text.disabled' }}>
                {Math.round(active.amount / totalSpent * 100)}%
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Screen-reader truth */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        <li>Net position: {moneySmart(net)}</li>
        {income > 0 && <li>Income: {moneySmart(income)}</li>}
        {allCats.map((c, i) => (
          <li key={`c${i}`}>
            {c.name}: {moneySmart(c.amount)}
            {totalSpent > 0 ? `, ${Math.round((c.amount / totalSpent) * 100)}% of spending` : ''}
          </li>
        ))}
        {bills > 0 && <li>Bills ahead: {moneySmart(bills)}</li>}
      </Box>
    </Box>
  );
}

function hexA(hex, a) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
