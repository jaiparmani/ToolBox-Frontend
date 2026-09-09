import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { accents, chart, color as colorRole } from '../../theme/tokens';
import { moneySmart } from './money';
import { deriveWeather } from './FinancialWeather';
import AnimatedNumber from './AnimatedNumber';

/**
 * CashFlow Pulse — your month's spending as a living heartbeat.
 *
 * Every day is a pulse in a waveform. Bigger spend = taller beat. Category
 * colours fill each peak. Particles stream along the waveform like money in
 * motion. A scanner line sweeps the current day. The cumulative balance curves
 * underneath as a second, calmer wave.
 *
 * Data-true: peak heights are real daily totals, balance curve is real
 * cumulative, category splits inside each peak match the API's breakdown.
 * The exact figure is reachable on hover/touch.
 */
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

  const H = height || (compact ? 340 : 420);
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

  // Build day data with category splits
  const dayData = useMemo(() => {
    if (!days.length) return [];
    const maxSpend = Math.max(...days.map(d => d.total || 0), 1);
    return days.map(d => ({
      ...d,
      norm: (d.total || 0) / maxSpend,
      cats: (d.cats || []).map((c, i) => ({
        ...c,
        color: palette[i % palette.length],
        share: d.total > 0 ? c.amount / d.total : 0,
      })),
    }));
  }, [days, palette]);

  // Cumulative balance curve
  const balanceCurve = useMemo(() => {
    let cum = income;
    return dayData.map(d => {
      cum -= (d.total || 0);
      return cum;
    });
  }, [dayData, income]);

  const maxBal = useMemo(
    () => Math.max(Math.abs(Math.max(...balanceCurve, 0)), Math.abs(Math.min(...balanceCurve, 0)), 1),
    [balanceCurve],
  );

  const totalSpent = useMemo(() => days.reduce((s, d) => s + (d.total || 0), 0), [days]);
  const hasData = dayData.length > 0;

  // ── Render loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasData) return;
    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0, running = true, t = 0, dt = 0, last = 0, dpr = 1, W = 0, Hh = 0;
    const particles = [];
    const bgStars = [];
    const scannerParticles = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth; Hh = H;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgStars.length = 0;
      const count = compact ? 40 : 80;
      for (let i = 0; i < count; i++) {
        bgStars.push({
          x: Math.random() * W, y: Math.random() * Hh,
          r: Math.random() * 1.2 + 0.15,
          a: Math.random() * 0.4 + 0.05,
          twinkleSpeed: 0.4 + Math.random() * 2,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce || !running) draw(); }); ro.observe(wrap);

    const PAD_L = compact ? 12 : 20;
    const PAD_R = compact ? 12 : 20;
    const PAD_T = compact ? 50 : 60;
    const PAD_B = compact ? 40 : 50;

    // Waveform geometry helpers
    const waveW = () => W - PAD_L - PAD_R;
    const baseline = () => Hh * 0.52;
    const peakH = () => (Hh - PAD_T - PAD_B) * 0.42;
    const balH = () => (Hh - PAD_T - PAD_B) * 0.25;

    const dayX = (i) => PAD_L + (i / Math.max(dayData.length - 1, 1)) * waveW();
    const spendY = (norm) => baseline() - norm * peakH();
    const balY = (val) => baseline() + 18 - (val / maxBal) * balH();

    // Smooth spline through points
    const splinePoints = (pts, tension = 0.35) => {
      if (pts.length < 2) return pts;
      const result = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        for (let s = 0; s <= 1; s += 0.05) {
          const ss = s * s, sss = ss * s;
          const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s * tension +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * ss * tension +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * sss * tension);
          const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * s * tension +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * ss * tension +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * sss * tension);
          result.push({ x, y });
        }
      }
      result.push(pts[pts.length - 1]);
      return result;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, Hh);
      const bl = baseline();

      // ── Deep background vignette ─────────────────────────────────────
      const vg = ctx.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, Math.max(W, Hh) * 0.7);
      vg.addColorStop(0, dark ? 'rgba(18,20,32,0.0)' : 'rgba(235,238,248,0.0)');
      vg.addColorStop(1, dark ? 'rgba(6,7,12,0.6)' : 'rgba(210,216,230,0.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);

      // ── Nebula wash ──────────────────────────────────────────────────
      const nt = reduce ? 0 : t;
      ctx.globalCompositeOperation = 'lighter';
      const clouds = [
        { hue: baseAura, ox: 0.3, oy: 0.35, r: 0.5, sp: 0.04, ph: 0 },
        { hue: accents.violet, ox: 0.7, oy: 0.65, r: 0.55, sp: 0.03, ph: 2.5 },
        { hue: accents.blue, ox: 0.5, oy: 0.4, r: 0.45, sp: 0.025, ph: 4.8 },
      ];
      for (const n of clouds) {
        const nx = W * n.ox + Math.sin(nt * n.sp + n.ph) * W * 0.12;
        const ny = Hh * n.oy + Math.cos(nt * n.sp * 0.7 + n.ph) * Hh * 0.1;
        const rad = Math.min(W, Hh) * n.r;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        g.addColorStop(0, hexA(n.hue, dark ? 0.1 : 0.06));
        g.addColorStop(0.6, hexA(n.hue, dark ? 0.04 : 0.02));
        g.addColorStop(1, hexA(n.hue, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, ny, rad, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // ── Twinkling stars ──────────────────────────────────────────────
      for (const s of bgStars) {
        const tw = reduce ? 1 : 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.a * tw * (dark ? 1 : 0.5);
        ctx.fillStyle = dark ? '#fff' : '#5b6480';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Grid lines (faint) ───────────────────────────────────────────
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        const gy = PAD_T + i * ((Hh - PAD_T - PAD_B) / 4);
        ctx.beginPath(); ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy); ctx.stroke();
      }

      // ── Baseline ─────────────────────────────────────────────────────
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(PAD_L, bl); ctx.lineTo(W - PAD_R, bl); ctx.stroke();
      ctx.setLineDash([]);

      // ── Build waveform points ────────────────────────────────────────
      const wPts = dayData.map((d, i) => ({ x: dayX(i), y: spendY(d.norm) }));
      const bPts = balanceCurve.map((v, i) => ({ x: dayX(i), y: balY(v) }));
      const smoothW = splinePoints(wPts, 0.4);
      const smoothB = splinePoints(bPts, 0.3);

      // ── Balance curve (behind) ───────────────────────────────────────
      if (smoothB.length > 1) {
        // Fill under curve
        ctx.beginPath();
        ctx.moveTo(smoothB[0].x, bl + 18);
        smoothB.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(smoothB[smoothB.length - 1].x, bl + 18);
        ctx.closePath();
        const bf = ctx.createLinearGradient(0, bl + 18 - balH(), 0, bl + 18 + balH());
        bf.addColorStop(0, hexA(accents.mint, dark ? 0.08 : 0.06));
        bf.addColorStop(0.5, hexA(accents.blue, dark ? 0.03 : 0.02));
        bf.addColorStop(1, hexA(accents.red, dark ? 0.06 : 0.04));
        ctx.fillStyle = bf; ctx.fill();

        // Line
        ctx.beginPath();
        smoothB.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        const bGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
        bGrad.addColorStop(0, hexA(accents.mint, 0.5));
        bGrad.addColorStop(0.5, hexA(accents.blue, 0.4));
        bGrad.addColorStop(1, hexA(net >= 0 ? accents.mint : accents.red, 0.6));
        ctx.strokeStyle = bGrad; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // ── Spending waveform — category-coloured fill ───────────────────
      if (smoothW.length > 1) {
        // Gradient fill under the curve
        ctx.beginPath();
        ctx.moveTo(smoothW[0].x, bl);
        smoothW.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(smoothW[smoothW.length - 1].x, bl);
        ctx.closePath();
        const wf = ctx.createLinearGradient(0, spendY(1), 0, bl);
        wf.addColorStop(0, hexA(baseAura, dark ? 0.22 : 0.16));
        wf.addColorStop(0.4, hexA(accents.violet, dark ? 0.12 : 0.08));
        wf.addColorStop(1, hexA(baseAura, 0));
        ctx.fillStyle = wf; ctx.fill();

        // Glow behind the waveform line
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        smoothW.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = hexA(baseAura, 0.2); ctx.lineWidth = 8; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';

        // The waveform line itself
        ctx.beginPath();
        smoothW.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        const wGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
        wGrad.addColorStop(0, accents.mint);
        wGrad.addColorStop(0.3, accents.cyan);
        wGrad.addColorStop(0.6, accents.violet);
        wGrad.addColorStop(1, accents.blue);
        ctx.strokeStyle = wGrad; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      }

      // ── Day dots on the waveform ─────────────────────────────────────
      dayData.forEach((d, i) => {
        const px = dayX(i), py = spendY(d.norm);
        const isHov = hoverRef.current === i;
        const dotR = isHov ? 6 : (d.norm > 0.6 ? 4 : d.norm > 0 ? 3 : 2);

        if (d.norm > 0 || isHov) {
          // Glow
          ctx.globalCompositeOperation = 'lighter';
          const dg = ctx.createRadialGradient(px, py, 0, px, py, dotR * 3);
          dg.addColorStop(0, hexA(isHov ? '#fff' : baseAura, isHov ? 0.5 : 0.3));
          dg.addColorStop(1, hexA(baseAura, 0));
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(px, py, dotR * 3, 0, 7); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';

          // Dot
          const dGrad = ctx.createRadialGradient(px - dotR * 0.3, py - dotR * 0.3, 0, px, py, dotR);
          dGrad.addColorStop(0, '#fff');
          dGrad.addColorStop(0.4, isHov ? '#fff' : baseAura);
          dGrad.addColorStop(1, hexA(baseAura, 0.7));
          ctx.fillStyle = dGrad; ctx.beginPath(); ctx.arc(px, py, dotR, 0, 7); ctx.fill();
        } else {
          ctx.fillStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
          ctx.beginPath(); ctx.arc(px, bl, 1.5, 0, 7); ctx.fill();
        }

        // Category stacked bars inside peak days (vertical mini-bar)
        if (d.cats && d.cats.length > 0 && d.norm > 0.15 && !compact) {
          const barW = Math.max(3, Math.min(8, waveW() / dayData.length * 0.5));
          const barH = (bl - py) * 0.6;
          let yOff = bl - 4;
          d.cats.forEach(c => {
            const h = c.share * barH;
            if (h < 1) return;
            ctx.globalAlpha = isHov ? 0.7 : 0.35;
            ctx.fillStyle = c.color;
            ctx.beginPath();
            roundRect(ctx, px - barW / 2, yOff - h, barW, h, 1.5);
            ctx.fill();
            yOff -= h;
          });
          ctx.globalAlpha = 1;
        }
      });

      // ── Flowing particles along the waveform ─────────────────────────
      if (!reduce) {
        // Spawn
        if (particles.length < (compact ? 25 : 50) && Math.random() < 2 * dt) {
          const startI = Math.floor(Math.random() * dayData.length);
          const col = [accents.mint, accents.cyan, accents.violet, accents.blue, '#ffffff'];
          particles.push({
            prog: startI / Math.max(dayData.length - 1, 1),
            speed: 0.015 + Math.random() * 0.03,
            r: 1 + Math.random() * 2,
            a: 0.4 + Math.random() * 0.5,
            color: col[Math.floor(Math.random() * col.length)],
            yOff: (Math.random() - 0.5) * 12,
            life: 1,
          });
        }

        ctx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.prog += p.speed * dt;
          p.life -= dt * 0.2;
          if (p.prog > 1.05 || p.life <= 0) { particles.splice(i, 1); continue; }

          // Interpolate position on waveform
          const idx = p.prog * (dayData.length - 1);
          const lo = Math.floor(idx), hi = Math.min(lo + 1, dayData.length - 1);
          const frac = idx - lo;
          const px2 = dayX(lo) + (dayX(hi) - dayX(lo)) * frac;
          const loY = spendY(dayData[lo]?.norm || 0);
          const hiY = spendY(dayData[hi]?.norm || 0);
          const py2 = loY + (hiY - loY) * frac + p.yOff;

          ctx.globalAlpha = p.a * p.life;
          const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, p.r * 2.5);
          pg.addColorStop(0, hexA(p.color, 0.9));
          pg.addColorStop(1, hexA(p.color, 0));
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px2, py2, p.r * 2.5, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── Scanner line (today's position) ──────────────────────────────
      if (!reduce) {
        const todayFrac = Math.min(1, (dayData.length - 1) / Math.max(dayData.length - 1, 1));
        const scanX = dayX(Math.floor(todayFrac * (dayData.length - 1)));
        const scanPulse = 0.5 + 0.5 * Math.sin(t * 2);

        // Vertical scanner beam
        const sg = ctx.createLinearGradient(0, PAD_T, 0, Hh - PAD_B);
        sg.addColorStop(0, hexA(accents.cyan, 0));
        sg.addColorStop(0.3, hexA(accents.cyan, 0.15 * scanPulse));
        sg.addColorStop(0.5, hexA(accents.cyan, 0.25 * scanPulse));
        sg.addColorStop(0.7, hexA(accents.cyan, 0.15 * scanPulse));
        sg.addColorStop(1, hexA(accents.cyan, 0));
        ctx.fillStyle = sg;
        ctx.fillRect(scanX - 1, PAD_T, 2, Hh - PAD_T - PAD_B);

        // Scanner dot
        ctx.globalCompositeOperation = 'lighter';
        const sdg = ctx.createRadialGradient(scanX, bl, 0, scanX, bl, 12);
        sdg.addColorStop(0, hexA(accents.cyan, 0.6 * scanPulse));
        sdg.addColorStop(1, hexA(accents.cyan, 0));
        ctx.fillStyle = sdg; ctx.beginPath(); ctx.arc(scanX, bl, 12, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Scanner emitter particles
        if (Math.random() < 3 * dt && scannerParticles.length < 8) {
          scannerParticles.push({
            x: scanX, y: bl + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 2,
            life: 1, r: 1 + Math.random(),
          });
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = scannerParticles.length - 1; i >= 0; i--) {
          const sp = scannerParticles[i];
          sp.x += sp.vx; sp.y += sp.vy; sp.life -= dt * 1.5;
          if (sp.life <= 0) { scannerParticles.splice(i, 1); continue; }
          ctx.globalAlpha = sp.life * 0.5;
          ctx.fillStyle = accents.cyan;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // ── Heartbeat pulse effect at the top ────────────────────────────
      if (!reduce) {
        const pulseAlpha = 0.3 + 0.3 * Math.sin(t * 1.5);
        const pw = waveW();
        const hbY = PAD_T - 10;
        ctx.globalCompositeOperation = 'lighter';

        // Mini ECG-style heartbeat
        ctx.beginPath();
        ctx.strokeStyle = hexA(accents.red, pulseAlpha * 0.6);
        ctx.lineWidth = 1.5;
        const hbSegs = 60;
        for (let i = 0; i <= hbSegs; i++) {
          const prog = i / hbSegs;
          const hx = PAD_L + prog * pw;
          // A repeating heartbeat pattern
          const phase = (prog * 6 + t * 0.8) % 1;
          let hy = hbY;
          if (phase > 0.3 && phase < 0.35) hy -= 8;
          else if (phase > 0.35 && phase < 0.4) hy += 12;
          else if (phase > 0.4 && phase < 0.45) hy -= 14;
          else if (phase > 0.45 && phase < 0.5) hy += 4;
          else hy += Math.sin(prog * 20 + t) * 0.5;
          if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      // ── Hover vertical slice ─────────────────────────────────────────
      const hi = hoverRef.current;
      if (hi != null && hi >= 0 && hi < dayData.length) {
        const hx = dayX(hi);
        // Vertical line
        ctx.strokeStyle = hexA('#fff', dark ? 0.3 : 0.2);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(hx, PAD_T); ctx.lineTo(hx, Hh - PAD_B); ctx.stroke();
        ctx.setLineDash([]);

        // Highlight circle on balance curve
        if (smoothB.length > 0) {
          const bIdx = Math.min(Math.round(hi / (dayData.length - 1) * (smoothB.length - 1)), smoothB.length - 1);
          const bp = smoothB[bIdx];
          if (bp) {
            const balColor = balanceCurve[hi] >= 0 ? accents.mint : accents.red;
            ctx.globalCompositeOperation = 'lighter';
            const bg2 = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, 8);
            bg2.addColorStop(0, hexA(balColor, 0.6));
            bg2.addColorStop(1, hexA(balColor, 0));
            ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bp.x, bp.y, 8, 0, 7); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = balColor;
            ctx.beginPath(); ctx.arc(bp.x, bp.y, 3, 0, 7); ctx.fill();
          }
        }
      }

      // ── Day labels (sparse) ──────────────────────────────────────────
      ctx.save();
      ctx.font = `500 ${compact ? 8 : 9}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = dark ? 'rgba(160,170,200,0.35)' : 'rgba(80,90,120,0.4)';
      const step = dayData.length <= 15 ? 1 : dayData.length <= 22 ? 2 : 3;
      dayData.forEach((d, i) => {
        if (i % step !== 0 && i !== dayData.length - 1) return;
        ctx.fillText(d.label || `${i + 1}`, dayX(i), Hh - PAD_B + 8);
      });
      ctx.restore();

      // ── Axis labels ──────────────────────────────────────────────────
      ctx.save();
      ctx.font = `600 ${compact ? 7 : 8}px -apple-system, "SF Pro Display", sans-serif`;
      ctx.fillStyle = dark ? 'rgba(140,150,180,0.3)' : 'rgba(80,90,120,0.35)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('SPENDING', PAD_L, bl - 6);
      ctx.textBaseline = 'top';
      ctx.fillText('BALANCE', PAD_L, bl + 22);
      ctx.restore();

      // Store hit-test data on canvas
      canvas._dayData = dayData;
      canvas._dayX = dayX;
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
  }, [dayData, balanceCurve, maxBal, reduce, dark, compact, H, baseAura, net, hasData]);

  // ── Pointer hit-testing ─────────────────────────────────────────────────
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

      {/* Center label */}
      <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: { xs: 10, sm: 11 }, fontWeight: 700, letterSpacing: '0.16em', color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)', textTransform: 'uppercase' }}>
          Cash Flow Pulse
        </Typography>
      </Box>

      {/* Hover readout — glassmorphism */}
      {activeDay && (
        <Box sx={{ position: 'absolute', left: 12, bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1.25, borderRadius: 3.5, backdropFilter: 'blur(16px) saturate(180%)',
          bgcolor: dark ? 'rgba(16,18,28,0.85)' : 'rgba(255,255,255,0.9)',
          border: '1px solid', borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
          pointerEvents: 'none' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'text.disabled', textTransform: 'uppercase' }}>
              {activeDay.dateLabel || activeDay.label || `Day ${hover + 1}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: accents.violet }}>
                {moneySmart(activeDay.total || 0)} spent
              </Typography>
              {activeBal != null && (
                <Typography sx={{ fontSize: 12, fontWeight: 650, fontVariantNumeric: 'tabular-nums', color: activeBal >= 0 ? accents.mint : accents.red }}>
                  Bal: {moneySmart(activeBal)}
                </Typography>
              )}
              {activeDay.count > 0 && (
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                  {activeDay.count} txn{activeDay.count !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
          {activeDay.cats && activeDay.cats.length > 0 && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, flexShrink: 0 }}>
              {activeDay.cats.slice(0, 4).map((c, i) => (
                <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, boxShadow: `0 0 4px ${c.color}` }} />
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

function roundRect(ctx, x, y, w, h, r) {
  if (w < 0 || h < 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}
