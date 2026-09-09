import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { accents, chart, color as colorRole } from '../../theme/tokens';
import { moneySmart } from './money';
import { deriveWeather } from './FinancialWeather';

export default function CashFlowPulse({
  days = [], categories = [], net = 0, income = 0,
  projection, pulse, weatherKey, height,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const hoverRef = useRef(hover); hoverRef.current = hover;
  const [reduce, setReduce] = useState(false);

  const H = height || (compact ? 380 : 480);
  const key = weatherKey || deriveWeather({ projection, pulse }).key || 'clear';
  const baseAura = { clear: accents.mint, tailwind: accents.cyan, pressure: accents.amber, storm: accents.red }[key] || accents.mint;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const palette = dark ? chart.categorical.dark : chart.categorical.light;

  const dayData = useMemo(() => {
    if (!days.length) return [];
    const maxSpend = Math.max(...days.map(d => d.total || 0), 1);
    return days.map((d, i) => {
      const prev = i > 0 ? (days[i - 1].total || 0) : 0;
      const velocity = Math.abs((d.total || 0) - prev) / maxSpend;
      return {
        ...d,
        norm: (d.total || 0) / maxSpend,
        velocity,
        cats: (d.cats || []).map((c, ci) => ({
          ...c,
          color: palette[ci % palette.length],
          share: d.total > 0 ? c.amount / d.total : 0,
        })),
      };
    });
  }, [days, palette]);

  const balanceCurve = useMemo(() => {
    let cum = income;
    return dayData.map(d => { cum -= (d.total || 0); return cum; });
  }, [dayData, income]);

  const maxBal = useMemo(
    () => Math.max(Math.abs(Math.max(...balanceCurve, 0)), Math.abs(Math.min(...balanceCurve, 0)), 1),
    [balanceCurve],
  );

  const totalSpent = useMemo(() => days.reduce((s, d) => s + (d.total || 0), 0), [days]);
  const hasData = dayData.length > 0;

  useEffect(() => {
    if (!hasData) return;
    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0, running = true, t = 0, dt = 0, last = 0, dpr = 1, W = 0, Hh = 0;
    let revealProg = reduce ? 1 : 0;
    const particles = [];
    const bgStars = [];
    const wisps = [];
    const burstParticles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth; Hh = H;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgStars.length = 0;
      const count = compact ? 50 : 100;
      for (let i = 0; i < count; i++) {
        bgStars.push({
          x: Math.random() * W, y: Math.random() * Hh,
          r: Math.random() * 1.3 + 0.1,
          a: Math.random() * 0.5 + 0.03,
          twinkleSpeed: 0.3 + Math.random() * 2.5,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce || !running) draw(); }); ro.observe(wrap);

    const PAD_L = compact ? 14 : 24;
    const PAD_R = compact ? 14 : 24;
    const PAD_T = compact ? 55 : 70;
    const PAD_B = compact ? 45 : 55;

    const waveW = () => W - PAD_L - PAD_R;
    const baseline = () => Hh * 0.48;
    const peakH = () => (Hh - PAD_T - PAD_B) * 0.38;
    const balH = () => (Hh - PAD_T - PAD_B) * 0.22;

    const dayX = (i) => PAD_L + (i / Math.max(dayData.length - 1, 1)) * waveW();
    const spendY = (norm) => baseline() - norm * peakH();
    const balY = (val) => baseline() + 28 - (val / maxBal) * balH();

    const spline = (pts, tension = 0.4) => {
      if (pts.length < 2) return pts;
      const res = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
        const steps = 20;
        for (let s = 0; s <= steps; s++) {
          const f = s / steps, ff = f * f, fff = ff * f;
          res.push({
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * f * tension + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * ff * tension + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * fff * tension),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * f * tension + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * ff * tension + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * fff * tension),
          });
        }
      }
      res.push(pts[pts.length - 1]);
      return res;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, Hh);
      const bl = baseline();
      const nt = reduce ? 0 : t;

      // Reveal animation — left to right unveil
      if (!reduce && revealProg < 1) revealProg = Math.min(1, revealProg + dt * 0.7);
      const revealX = PAD_L + revealProg * waveW();

      // ── ATMOSPHERIC BACKGROUND ───────────────────────────────────────
      // Data-reactive gradient mesh: warm near heavy spend areas
      const vg = ctx.createRadialGradient(W * 0.5, Hh * 0.4, 0, W * 0.5, Hh * 0.5, Math.max(W, Hh) * 0.75);
      vg.addColorStop(0, dark ? 'rgba(14,16,28,0.0)' : 'rgba(238,240,250,0.0)');
      vg.addColorStop(1, dark ? 'rgba(4,5,10,0.7)' : 'rgba(205,212,228,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);

      // Flowing nebula clouds — 5 layers, data-tinted
      ctx.globalCompositeOperation = 'lighter';
      const nebulaHues = [baseAura, accents.violet, accents.blue, accents.cyan, accents.purple];
      for (let ni = 0; ni < 5; ni++) {
        const n = { hue: nebulaHues[ni], ox: 0.15 + ni * 0.18, oy: 0.25 + (ni % 3) * 0.2, r: 0.4 + ni * 0.05 };
        const nx = W * n.ox + Math.sin(nt * (0.02 + ni * 0.008) + ni * 1.7) * W * 0.14;
        const ny = Hh * n.oy + Math.cos(nt * (0.015 + ni * 0.006) + ni * 2.3) * Hh * 0.12;
        const rad = Math.min(W, Hh) * n.r;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        g.addColorStop(0, hexA(n.hue, dark ? 0.08 : 0.05));
        g.addColorStop(0.5, hexA(n.hue, dark ? 0.03 : 0.015));
        g.addColorStop(1, hexA(n.hue, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, ny, rad, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Twinkling starfield with diffraction spikes on bright ones
      for (const s of bgStars) {
        const tw = reduce ? 1 : 0.4 + 0.6 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.a * tw * (dark ? 1 : 0.45);
        ctx.fillStyle = dark ? '#fff' : '#5b6480';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
        if (s.a > 0.35 && s.r > 0.7) {
          ctx.globalAlpha = s.a * tw * 0.2;
          ctx.strokeStyle = dark ? '#fff' : '#8090b0';
          ctx.lineWidth = 0.4;
          const sp = s.r * 5;
          ctx.beginPath(); ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // ── GRID — faint horizontal bands ────────────────────────────────
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        const gy = PAD_T + i * ((Hh - PAD_T - PAD_B) / 5);
        ctx.beginPath(); ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy); ctx.stroke();
      }

      // ── BASELINE — pulsing dashed line ───────────────────────────────
      const blPulse = reduce ? 0.1 : 0.06 + 0.06 * Math.sin(t * 0.8);
      ctx.strokeStyle = dark ? `rgba(255,255,255,${blPulse})` : `rgba(0,0,0,${blPulse})`;
      ctx.lineWidth = 1; ctx.setLineDash([3, 8]);
      ctx.beginPath(); ctx.moveTo(PAD_L, bl); ctx.lineTo(W - PAD_R, bl); ctx.stroke();
      ctx.setLineDash([]);

      // ── BUILD WAVEFORM POINTS ────────────────────────────────────────
      // Breathing displacement — the waveform itself is alive
      const wPts = dayData.map((d, i) => {
        const breathe = reduce ? 0 : Math.sin(t * 1.2 + i * 0.5) * 2 * d.norm;
        return { x: dayX(i), y: spendY(d.norm) + breathe };
      });
      const bPts = balanceCurve.map((v, i) => ({ x: dayX(i), y: balY(v) }));
      const smoothW = spline(wPts, 0.45);
      const smoothB = spline(bPts, 0.35);

      // Clip to reveal progress
      if (revealProg < 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, revealX + 2, Hh); ctx.clip(); }

      // ── MULTI-TRACE DEPTH ECHOES ─────────────────────────────────────
      // 3 ghost traces behind the main waveform for oscilloscope depth
      if (!reduce && smoothW.length > 1) {
        const drawEcho = (echo) => {
          const off = echo * 4;
          const ea = 0.04 / echo;
          ctx.beginPath();
          smoothW.forEach((p, i) => {
            const ep = { x: p.x, y: p.y + off + Math.sin(nt * 0.6 + i * 0.02 + echo) * 2 };
            i === 0 ? ctx.moveTo(ep.x, ep.y) : ctx.lineTo(ep.x, ep.y);
          });
          ctx.strokeStyle = hexA(baseAura, ea); ctx.lineWidth = 2; ctx.stroke();
        };
        for (let echo = 3; echo >= 1; echo--) drawEcho(echo);
      }

      // ── BALANCE CURVE ────────────────────────────────────────────────
      if (smoothB.length > 1) {
        // Gradient fill
        ctx.beginPath();
        ctx.moveTo(smoothB[0].x, bl + 28);
        smoothB.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(smoothB[smoothB.length - 1].x, bl + 28);
        ctx.closePath();
        const bf = ctx.createLinearGradient(0, bl + 28 - balH(), 0, bl + 28 + balH());
        bf.addColorStop(0, hexA(accents.mint, dark ? 0.06 : 0.04));
        bf.addColorStop(0.5, hexA(accents.blue, dark ? 0.02 : 0.015));
        bf.addColorStop(1, hexA(accents.red, dark ? 0.05 : 0.03));
        ctx.fillStyle = bf; ctx.fill();

        // Glow behind
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        smoothB.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = hexA(net >= 0 ? accents.mint : accents.red, 0.12); ctx.lineWidth = 6; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';

        // Line
        ctx.beginPath();
        smoothB.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        const bGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
        bGrad.addColorStop(0, hexA(accents.mint, 0.45));
        bGrad.addColorStop(0.5, hexA(accents.blue, 0.35));
        bGrad.addColorStop(1, hexA(net >= 0 ? accents.mint : accents.red, 0.55));
        ctx.strokeStyle = bGrad; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
      }

      // ── GRAVITATIONAL BANDS between spending + balance curves ────────
      if (!reduce && smoothW.length > 1 && smoothB.length > 1) {
        ctx.globalCompositeOperation = 'lighter';
        const bandCount = 8;
        for (let b = 0; b < bandCount; b++) {
          const bandPhase = (b / bandCount) * Math.PI * 2 + t * 0.3;
          const bandAlpha = (0.01 + 0.01 * Math.sin(bandPhase)) * (dark ? 1 : 0.5);
          ctx.strokeStyle = hexA(accents.violet, bandAlpha);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          const step = Math.max(1, Math.floor(smoothW.length / 40));
          for (let si = 0; si < smoothW.length; si += step) {
            const bi = Math.min(si, smoothB.length - 1);
            const wx = smoothW[si].x, wy = smoothW[si].y, by = smoothB[bi].y;
            const mid = wy + (by - wy) * ((b + 0.5) / bandCount);
            const wave = Math.sin(si * 0.08 + bandPhase) * 3;
            if (si === 0) ctx.moveTo(wx, mid + wave); else ctx.lineTo(wx, mid + wave);
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // ── AURORA ENERGY FILL under the waveform ────────────────────────
      if (smoothW.length > 1) {
        // Multiple layered aurora bands flowing upward inside the waveform
        ctx.save();
        // Clip to waveform shape
        ctx.beginPath();
        ctx.moveTo(smoothW[0].x, bl);
        smoothW.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(smoothW[smoothW.length - 1].x, bl);
        ctx.closePath();
        ctx.clip();

        // Flowing aurora bands — category-tinted
        const auroraColors = [baseAura, accents.violet, accents.cyan, accents.blue, accents.purple];
        for (let ai = 0; ai < 5; ai++) {
          const aFlow = reduce ? 0 : t * (0.15 + ai * 0.04);
          const aY = bl - (ai / 5) * peakH() * 1.2 + Math.sin(aFlow + ai * 1.3) * 15;
          const ag = ctx.createLinearGradient(0, aY - 20, 0, aY + 20);
          ag.addColorStop(0, hexA(auroraColors[ai], 0));
          ag.addColorStop(0.5, hexA(auroraColors[ai], dark ? 0.06 : 0.04));
          ag.addColorStop(1, hexA(auroraColors[ai], 0));
          ctx.fillStyle = ag;
          ctx.fillRect(PAD_L, aY - 20, waveW(), 40);
        }

        // Category-colored vertical bands per day region
        dayData.forEach((d, i) => {
          if (d.cats.length === 0 || d.norm < 0.05) return;
          const x0 = i === 0 ? PAD_L : (dayX(i - 1) + dayX(i)) / 2;
          const x1 = i === dayData.length - 1 ? W - PAD_R : (dayX(i) + dayX(i + 1)) / 2;
          let yAcc = bl;
          d.cats.forEach(c => {
            const h = c.share * (bl - spendY(d.norm)) * 0.8;
            if (h < 1) return;
            ctx.globalAlpha = dark ? 0.12 : 0.08;
            ctx.fillStyle = c.color;
            ctx.fillRect(x0, yAcc - h, x1 - x0, h);
            yAcc -= h;
          });
          ctx.globalAlpha = 1;
        });
        ctx.restore();

        // Main waveform glow (multiple layers for neon effect)
        ctx.globalCompositeOperation = 'lighter';
        for (let gl = 3; gl >= 1; gl--) {
          ctx.beginPath();
          smoothW.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.strokeStyle = hexA(baseAura, 0.06 * gl);
          ctx.lineWidth = gl * 4;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        // The waveform line — vivid gradient
        ctx.beginPath();
        smoothW.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        const wGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
        wGrad.addColorStop(0, accents.mint);
        wGrad.addColorStop(0.25, accents.cyan);
        wGrad.addColorStop(0.5, accents.violet);
        wGrad.addColorStop(0.75, accents.blue);
        wGrad.addColorStop(1, accents.purple);
        ctx.strokeStyle = wGrad; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      }

      // ── MIRROR REFLECTION below baseline ─────────────────────────────
      if (smoothW.length > 1) {
        ctx.save();
        ctx.globalAlpha = dark ? 0.08 : 0.05;
        ctx.beginPath();
        ctx.moveTo(smoothW[0].x, bl);
        smoothW.forEach(p => {
          const mirrorY = bl + (bl - p.y) * 0.35;
          ctx.lineTo(p.x, mirrorY);
        });
        ctx.lineTo(smoothW[smoothW.length - 1].x, bl);
        ctx.closePath();
        const mg = ctx.createLinearGradient(0, bl, 0, bl + peakH() * 0.4);
        mg.addColorStop(0, baseAura);
        mg.addColorStop(1, hexA(baseAura, 0));
        ctx.fillStyle = mg; ctx.fill();
        ctx.restore();
      }

      // ── ELECTROMAGNETIC NODES (day dots) ─────────────────────────────
      dayData.forEach((d, i) => {
        const px = dayX(i), py = wPts[i].y;
        const isHov = hoverRef.current === i;
        const nodeR = isHov ? 7 : (d.norm > 0.6 ? 5 : d.norm > 0.2 ? 3.5 : 2.5);

        if (d.norm > 0 || isHov) {
          // Concentric pulsing rings on significant days
          if (!reduce && (d.norm > 0.3 || isHov)) {
            ctx.globalCompositeOperation = 'lighter';
            const ringCount = isHov ? 4 : 2;
            for (let ri = 0; ri < ringCount; ri++) {
              const ringPhase = (t * 1.5 + ri * 0.8 + i * 0.3) % (Math.PI * 2);
              const ringExpand = 1 + Math.sin(ringPhase) * 0.3;
              const ringR = nodeR * (2 + ri * 1.5) * ringExpand;
              const ringA = (isHov ? 0.25 : 0.08) / (ri + 1);
              ctx.strokeStyle = hexA(isHov ? '#fff' : baseAura, ringA);
              ctx.lineWidth = isHov ? 1.5 : 0.8;
              ctx.beginPath(); ctx.arc(px, py, ringR, 0, 7); ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
          }

          // Core glow
          ctx.globalCompositeOperation = 'lighter';
          const glowR = nodeR * (isHov ? 5 : 3);
          const dg = ctx.createRadialGradient(px, py, 0, px, py, glowR);
          dg.addColorStop(0, hexA(isHov ? '#fff' : baseAura, isHov ? 0.6 : 0.35));
          dg.addColorStop(0.4, hexA(baseAura, isHov ? 0.2 : 0.1));
          dg.addColorStop(1, hexA(baseAura, 0));
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(px, py, glowR, 0, 7); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';

          // The node itself — sphere gradient
          const ng = ctx.createRadialGradient(px - nodeR * 0.3, py - nodeR * 0.3, 0, px, py, nodeR);
          ng.addColorStop(0, '#ffffff');
          ng.addColorStop(0.3, hexA('#fff', 0.8));
          ng.addColorStop(0.6, isHov ? '#fff' : baseAura);
          ng.addColorStop(1, hexA(baseAura, 0.5));
          ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(px, py, nodeR, 0, 7); ctx.fill();

          // Hover — category-colored arcs radiating out
          if (isHov && d.cats.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            let arcAcc = 0;
            d.cats.forEach(c => {
              const a0 = arcAcc * Math.PI * 2 - Math.PI / 2;
              arcAcc += c.share;
              const a1 = arcAcc * Math.PI * 2 - Math.PI / 2;
              ctx.strokeStyle = hexA(c.color, 0.6);
              ctx.lineWidth = 3;
              ctx.beginPath(); ctx.arc(px, py, nodeR + 12, a0, a1); ctx.stroke();
              // Outer echo
              ctx.strokeStyle = hexA(c.color, 0.2);
              ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(px, py, nodeR + 20, a0, a1); ctx.stroke();
            });
            ctx.globalCompositeOperation = 'source-over';
          }
        } else {
          // Zero-spend day — faint dot on baseline
          ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
          ctx.beginPath(); ctx.arc(px, bl, 1.5, 0, 7); ctx.fill();
        }
      });

      // ── PARTICLE RIVER with comet trails ─────────────────────────────
      if (!reduce) {
        const maxP = compact ? 35 : 70;
        if (particles.length < maxP && Math.random() < 4 * dt) {
          const startFrac = Math.random();
          const dayIdx = Math.floor(startFrac * (dayData.length - 1));
          const dayNorm = dayData[dayIdx]?.norm || 0;
          // Category-colored particles near heavy days
          let pColor;
          if (dayNorm > 0.3 && dayData[dayIdx]?.cats?.length > 0) {
            const rc = dayData[dayIdx].cats[Math.floor(Math.random() * dayData[dayIdx].cats.length)];
            pColor = rc.color;
          } else {
            pColor = [accents.mint, accents.cyan, accents.violet, accents.blue, '#ffffff'][Math.floor(Math.random() * 5)];
          }
          particles.push({
            prog: startFrac,
            speed: 0.02 + Math.random() * 0.04 + dayNorm * 0.03,
            r: 1 + Math.random() * 2.5,
            a: 0.3 + Math.random() * 0.6,
            color: pColor,
            yOff: (Math.random() - 0.5) * 8,
            life: 1,
            trail: [],
          });
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          // Accelerate through peaks
          const dayIdx = Math.floor(p.prog * (dayData.length - 1));
          const localNorm = dayData[Math.min(dayIdx, dayData.length - 1)]?.norm || 0;
          p.prog += (p.speed + localNorm * 0.02) * dt;
          p.life -= dt * 0.15;
          if (p.prog > 1.05 || p.life <= 0) { particles.splice(i, 1); continue; }

          const idx = p.prog * (dayData.length - 1);
          const lo = Math.max(0, Math.floor(idx)), hi2 = Math.min(lo + 1, dayData.length - 1);
          const frac = idx - lo;
          const px2 = dayX(lo) + (dayX(hi2) - dayX(lo)) * frac;
          const loY = wPts[lo]?.y || bl, hiY2 = wPts[hi2]?.y || bl;
          const py2 = loY + (hiY2 - loY) * frac + p.yOff;

          // Trail
          p.trail.push({ x: px2, y: py2 });
          if (p.trail.length > 12) p.trail.shift();

          // Draw comet trail
          for (let ti = 1; ti < p.trail.length; ti++) {
            const ta = (ti / p.trail.length) * p.a * p.life;
            ctx.globalAlpha = ta * 0.5;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.r * (ti / p.trail.length);
            ctx.beginPath();
            ctx.moveTo(p.trail[ti - 1].x, p.trail[ti - 1].y);
            ctx.lineTo(p.trail[ti].x, p.trail[ti].y);
            ctx.stroke();
          }

          // Head glow
          ctx.globalAlpha = p.a * p.life;
          const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, p.r * 3);
          pg.addColorStop(0, hexA(p.color, 0.9));
          pg.addColorStop(0.3, hexA(p.color, 0.4));
          pg.addColorStop(1, hexA(p.color, 0));
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px2, py2, p.r * 3, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── SPENDING VELOCITY WISPS (solar flares at sharp changes) ──────
      if (!reduce) {
        // Spawn wisps at high-velocity days
        dayData.forEach((d, i) => {
          if (d.velocity > 0.4 && Math.random() < 0.08 * dt && wisps.length < 6) {
            const px = dayX(i), py = wPts[i].y;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            wisps.push({
              x: px, y: py, angle,
              length: 15 + d.velocity * 40,
              life: 1, decay: 0.4 + Math.random() * 0.3,
              curve: (Math.random() - 0.5) * 0.6,
              color: d.norm > 0.5 ? accents.red : accents.amber,
            });
          }
        });

        ctx.globalCompositeOperation = 'lighter';
        for (let i = wisps.length - 1; i >= 0; i--) {
          const w = wisps[i];
          w.life -= w.decay * dt;
          w.angle += 0.015 * dt;
          if (w.life <= 0) { wisps.splice(i, 1); continue; }
          const ex = w.x + Math.cos(w.angle + w.curve) * w.length * w.life;
          const ey = w.y + Math.sin(w.angle + w.curve) * w.length * w.life;
          const cpx = w.x + Math.cos(w.angle + w.curve * 0.5) * w.length * 0.6 * w.life;
          const cpy = w.y + Math.sin(w.angle + w.curve * 0.5) * w.length * 0.6 * w.life;
          ctx.strokeStyle = hexA(w.color, w.life * 0.5);
          ctx.lineWidth = 1.5 * w.life;
          ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // ── REAL ECG from spending velocity ──────────────────────────────
      if (!reduce) {
        const ecgY = PAD_T - 16;
        ctx.globalCompositeOperation = 'lighter';

        // Glow behind ECG
        ctx.beginPath();
        dayData.forEach((d, i) => {
          const ex = dayX(i);
          const beat = d.velocity * 18;
          const ey = ecgY - (i > 0 ? (d.norm > dayData[i - 1].norm ? beat : -beat * 0.6) : 0);
          i === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
        });
        ctx.strokeStyle = hexA(accents.red, 0.1); ctx.lineWidth = 4; ctx.stroke();

        // ECG line
        ctx.beginPath();
        dayData.forEach((d, i) => {
          const ex = dayX(i);
          const beat = d.velocity * 18;
          const ey = ecgY - (i > 0 ? (d.norm > dayData[i - 1].norm ? beat : -beat * 0.6) : 0);
          i === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
        });
        const ecgGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
        ecgGrad.addColorStop(0, hexA(accents.red, 0.35));
        ecgGrad.addColorStop(0.5, hexA(accents.red, 0.55));
        ecgGrad.addColorStop(1, hexA(accents.red, 0.35));
        ctx.strokeStyle = ecgGrad; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();

        // ECG label
        ctx.font = `600 ${compact ? 6 : 7}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.fillStyle = hexA(accents.red, 0.3);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('VELOCITY', PAD_L, ecgY);

        ctx.globalCompositeOperation = 'source-over';
      }

      // ── SCANNER BEAM 2.0 ─────────────────────────────────────────────
      if (!reduce) {
        const scanIdx = dayData.length - 1;
        const scanX = dayX(scanIdx);
        const scanPulse = 0.5 + 0.5 * Math.sin(t * 2.5);

        // Wide cone of light
        ctx.globalCompositeOperation = 'lighter';
        const coneW = 30;
        const sg = ctx.createLinearGradient(scanX - coneW, 0, scanX + coneW, 0);
        sg.addColorStop(0, hexA(accents.cyan, 0));
        sg.addColorStop(0.3, hexA(accents.cyan, 0.03 * scanPulse));
        sg.addColorStop(0.5, hexA(accents.cyan, 0.12 * scanPulse));
        sg.addColorStop(0.7, hexA(accents.cyan, 0.03 * scanPulse));
        sg.addColorStop(1, hexA(accents.cyan, 0));
        ctx.fillStyle = sg;
        ctx.fillRect(scanX - coneW, PAD_T - 20, coneW * 2, Hh - PAD_T - PAD_B + 40);

        // Bright center line
        ctx.strokeStyle = hexA(accents.cyan, 0.35 * scanPulse);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(scanX, PAD_T - 20); ctx.lineTo(scanX, Hh - PAD_B + 20); ctx.stroke();

        // Lens flare at waveform intersection
        const intY = wPts[scanIdx]?.y || bl;
        const flareR = 15 + scanPulse * 8;
        for (let fi = 0; fi < 3; fi++) {
          const fr = flareR * (1 + fi * 0.6);
          const fa = 0.12 / (fi + 1) * scanPulse;
          const fg = ctx.createRadialGradient(scanX, intY, 0, scanX, intY, fr);
          fg.addColorStop(0, hexA(accents.cyan, fa));
          fg.addColorStop(0.5, hexA(accents.cyan, fa * 0.3));
          fg.addColorStop(1, hexA(accents.cyan, 0));
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(scanX, intY, fr, 0, 7); ctx.fill();
        }

        // Horizontal lens streak
        ctx.strokeStyle = hexA(accents.cyan, 0.15 * scanPulse);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(scanX - 40, intY); ctx.lineTo(scanX + 40, intY); ctx.stroke();

        // Burst particles at intersection
        if (Math.random() < 5 * dt && burstParticles.length < 12) {
          const angle = Math.random() * Math.PI * 2;
          burstParticles.push({
            x: scanX, y: intY,
            vx: Math.cos(angle) * (1.5 + Math.random() * 2),
            vy: Math.sin(angle) * (1.5 + Math.random() * 2),
            life: 1, r: 0.8 + Math.random() * 1.5,
            color: Math.random() > 0.5 ? accents.cyan : '#ffffff',
          });
        }
        for (let i = burstParticles.length - 1; i >= 0; i--) {
          const bp = burstParticles[i];
          bp.x += bp.vx; bp.y += bp.vy; bp.life -= dt * 2;
          bp.vx *= 0.97; bp.vy *= 0.97;
          if (bp.life <= 0) { burstParticles.splice(i, 1); continue; }
          ctx.globalAlpha = bp.life * 0.6;
          ctx.fillStyle = bp.color;
          ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r * bp.life, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── HOVER VERTICAL SLICE ─────────────────────────────────────────
      const hi = hoverRef.current;
      if (hi != null && hi >= 0 && hi < dayData.length) {
        const hx = dayX(hi);

        // Glowing vertical slice
        ctx.globalCompositeOperation = 'lighter';
        const sliceG = ctx.createLinearGradient(hx - 15, 0, hx + 15, 0);
        sliceG.addColorStop(0, hexA('#fff', 0));
        sliceG.addColorStop(0.5, hexA('#fff', dark ? 0.04 : 0.03));
        sliceG.addColorStop(1, hexA('#fff', 0));
        ctx.fillStyle = sliceG;
        ctx.fillRect(hx - 15, PAD_T, 30, Hh - PAD_T - PAD_B);
        ctx.globalCompositeOperation = 'source-over';

        ctx.strokeStyle = hexA('#fff', dark ? 0.2 : 0.15);
        ctx.lineWidth = 0.8; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(hx, PAD_T); ctx.lineTo(hx, Hh - PAD_B); ctx.stroke();
        ctx.setLineDash([]);

        // Balance dot
        if (smoothB.length > 0) {
          const bIdx = Math.min(Math.round(hi / (dayData.length - 1) * (smoothB.length - 1)), smoothB.length - 1);
          const bp = smoothB[bIdx];
          if (bp) {
            const balColor = balanceCurve[hi] >= 0 ? accents.mint : accents.red;
            ctx.globalCompositeOperation = 'lighter';
            const bg2 = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, 10);
            bg2.addColorStop(0, hexA(balColor, 0.5));
            bg2.addColorStop(1, hexA(balColor, 0));
            ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bp.x, bp.y, 10, 0, 7); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = balColor;
            ctx.beginPath(); ctx.arc(bp.x, bp.y, 3, 0, 7); ctx.fill();
          }
        }

        // Hover amount label on canvas
        const hDay = dayData[hi];
        if (hDay && hDay.total > 0) {
          ctx.save();
          const labelText = moneySmart(hDay.total);
          ctx.font = `700 ${compact ? 10 : 12}px -apple-system, "SF Pro Display", sans-serif`;
          const tw = ctx.measureText(labelText).width;
          const lx = Math.max(PAD_L + tw / 2 + 8, Math.min(W - PAD_R - tw / 2 - 8, hx));
          const ly = wPts[hi].y - 18;
          // Label bg
          ctx.fillStyle = dark ? 'rgba(10,12,20,0.75)' : 'rgba(255,255,255,0.85)';
          roundRect2(ctx, lx - tw / 2 - 6, ly - 8, tw + 12, 18, 6);
          ctx.fill();
          // Label text
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = baseAura;
          ctx.fillText(labelText, lx, ly + 1);
          ctx.restore();
        }
      }

      // End reveal clip
      if (revealProg < 1) ctx.restore();

      // ── Reveal edge glow ─────────────────────────────────────────────
      if (!reduce && revealProg < 1) {
        ctx.globalCompositeOperation = 'lighter';
        const eg = ctx.createLinearGradient(revealX - 30, 0, revealX + 5, 0);
        eg.addColorStop(0, hexA(accents.cyan, 0));
        eg.addColorStop(0.7, hexA(accents.cyan, 0.3));
        eg.addColorStop(1, hexA('#fff', 0.5));
        ctx.fillStyle = eg;
        ctx.fillRect(revealX - 30, 0, 35, Hh);
        ctx.globalCompositeOperation = 'source-over';
      }

      // ── DAY LABELS ───────────────────────────────────────────────────
      ctx.save();
      ctx.font = `500 ${compact ? 7.5 : 9}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const step = dayData.length <= 12 ? 1 : dayData.length <= 20 ? 2 : 3;
      dayData.forEach((d, i) => {
        if (i % step !== 0 && i !== dayData.length - 1) return;
        const isHov = hoverRef.current === i;
        ctx.fillStyle = isHov
          ? (dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')
          : (dark ? 'rgba(160,170,200,0.3)' : 'rgba(80,90,120,0.35)');
        ctx.fillText(d.label || `${i + 1}`, dayX(i), Hh - PAD_B + 10);
      });
      ctx.restore();

      // ── AXIS LABELS ──────────────────────────────────────────────────
      ctx.save();
      ctx.font = `600 ${compact ? 6.5 : 8}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.fillStyle = dark ? 'rgba(140,150,180,0.25)' : 'rgba(80,90,120,0.3)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('SPENDING', PAD_L, bl - 8);
      ctx.textBaseline = 'top';
      ctx.fillText('BALANCE', PAD_L, bl + 32);
      ctx.restore();

      canvas._dayData = dayData; canvas._dayX = dayX;
    };

    const loop = (now) => {
      if (!running) return;
      dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now; t += dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { last = 0; raf = requestAnimationFrame(loop); };
    if (reduce) { dt = 0.016; revealProg = 1; draw(); } else { start(); }

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
  }, [dayData, balanceCurve, maxBal, reduce, dark, compact, H, baseAura, net, hasData]);

  const pick = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas._dayX || !dayData.length) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    let best = null, bestD = Infinity;
    dayData.forEach((_, i) => {
      const dx2 = Math.abs(canvas._dayX(i) - x);
      if (dx2 < bestD) { bestD = dx2; best = i; }
    });
    return bestD < 30 ? best : null;
  };
  const onMove = (e) => { const i = pick(e.clientX); if (i !== hoverRef.current) setHover(i); };
  const onLeave = () => { if (hoverRef.current !== null) setHover(null); };

  if (!hasData) return null;

  const activeDay = hover != null ? dayData[hover] : null;
  const activeBal = hover != null ? balanceCurve[hover] : null;
  const summary = `CashFlow Pulse. ${dayData.length} days. Total spent ${moneySmart(totalSpent)}. Net ${moneySmart(net)}.`;

  return (
    <Box
      ref={wrapRef}
      sx={{ position: 'relative', width: '100%', height: H, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        background: dark
          ? `radial-gradient(120% 100% at 50% 30%, ${hexA(colorRole.bg.dark, 0)} 0%, ${colorRole.bg.dark} 100%)`
          : `radial-gradient(120% 100% at 50% 30%, ${hexA(colorRole.bg.light, 0)} 0%, ${colorRole.bg.light} 100%)`,
        '&:focus-within': { borderColor: 'primary.main' } }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ display: 'block', touchAction: 'pan-y', cursor: 'crosshair', outline: 'none' }}
      />

      {/* Hover readout — glassmorphism */}
      {activeDay && (
        <Box sx={{ position: 'absolute', left: 12, bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1.25, borderRadius: 3.5, backdropFilter: 'blur(20px) saturate(200%)',
          bgcolor: dark ? 'rgba(12,14,24,0.88)' : 'rgba(255,255,255,0.92)',
          border: '1px solid', borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          boxShadow: dark ? `0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)` : '0 8px 40px rgba(0,0,0,0.12)',
          pointerEvents: 'none' }}>
          {/* Accent line top */}
          <Box sx={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: `linear-gradient(90deg, transparent, ${baseAura}, transparent)`, opacity: 0.4 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'text.disabled', textTransform: 'uppercase' }}>
              {activeDay.dateLabel || activeDay.label || `Day ${hover + 1}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, ${accents.violet}, ${accents.cyan})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {moneySmart(activeDay.total || 0)}
              </Typography>
              {activeBal != null && (
                <Typography sx={{ fontSize: 12, fontWeight: 650, fontVariantNumeric: 'tabular-nums', color: activeBal >= 0 ? accents.mint : accents.red }}>
                  {moneySmart(activeBal)}
                </Typography>
              )}
              {activeDay.count > 0 && (
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>
                  {activeDay.count} txn{activeDay.count !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
          {activeDay.cats && activeDay.cats.length > 0 && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75, flexShrink: 0, alignItems: 'center' }}>
              {activeDay.cats.slice(0, 5).map((c, i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 30%, #fff, ${c.color} 70%)`,
                    boxShadow: `0 0 6px ${c.color}` }} />
                  <Typography sx={{ fontSize: 7, color: 'text.disabled', fontWeight: 600 }}>
                    {Math.round(c.share * 100)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Screen-reader truth */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        <li>Total spent: {moneySmart(totalSpent)}</li>
        <li>Net position: {moneySmart(net)}</li>
        {dayData.map((d, i) => (
          <li key={i}>{d.label || `Day ${i + 1}`}: {moneySmart(d.total || 0)}, {d.count || 0} transactions</li>
        ))}
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

function roundRect2(ctx, x, y, w, h, r) {
  if (w < 0 || h < 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
