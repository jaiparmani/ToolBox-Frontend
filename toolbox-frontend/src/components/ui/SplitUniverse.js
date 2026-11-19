import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { accents, color as colorRole } from '../../theme/tokens';
import { moneySmart } from './money';
import AnimatedNumber from './AnimatedNumber';

// Two rings, not three - and the distance itself is the story. Money on its
// way home orbits close; money on its way out orbits far. Nobody has to read
// a legend to know which side of the sky they're looking at.
const RING = { owedToYou: 0.52, youOwe: 0.92 };

/**
 * The split ledger, as a sky - MoneyUniverse's own engine (nebula, starfield,
 * comet trails, a corona'd star at the centre), repointed at people instead of
 * categories. Nothing here is decorative: every body's size is sqrt(balance),
 * every ring is a direction, and the star is your real net, exactly as
 * MoneyUniverse's centre is real income minus real spend.
 *
 * A settle doesn't just remove a row - the body streaks into the star and the
 * whole scene flashes with the direction's colour, then the sky closes back
 * over where it was. `onSettleRef` is handed the live screen point for a
 * person so the caller can hand the same point straight to ParticleFlow.
 */
export default function SplitUniverse({
  people = [], selectedId, onSelect, settlingId, height, onReady,
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

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const net = useMemo(() => people.reduce((s, p) => s + (Number(p.net) || 0), 0), [people]);
  const peak = useMemo(() => Math.max(...people.map(p => Math.abs(p.net) || 0), 1), [people]);
  const totalOwed = useMemo(() => people.reduce((s, p) => s + Math.max(0, p.net || 0), 0), [people]);
  const totalYouOwe = useMemo(() => people.reduce((s, p) => s + Math.max(0, -(p.net || 0)), 0), [people]);

  // Weather of the situation itself: mostly owed to you reads calm, mostly
  // you-owe reads stormy - the same mint/red the rest of the app uses for
  // this exact polarity, just carried into the sky's own colour.
  const totalAbs = totalOwed + totalYouOwe;
  const owedShare = totalAbs > 0 ? totalOwed / totalAbs : 0.5;
  const baseAura = owedShare >= 0.5 ? accents.mint : accents.amber;
  const auraSpeed = 1 + Math.abs(owedShare - 0.5) * 0.8;

  const bodies = useMemo(() => {
    return people.map((p, i) => {
      const magnitude = Math.abs(p.net) || 0;
      const owedToYou = p.net > 0;
      const ring = magnitude === 0 ? (RING.owedToYou + RING.youOwe) / 2 : (owedToYou ? RING.owedToYou : RING.youOwe);
      const scale = Math.sqrt(magnitude / peak);
      // Spread bodies on their own ring by a stable hash of id, not index -
      // so a settled person vanishing doesn't reshuffle everyone else's angle.
      const n = people.filter(q => (Math.abs(q.net) > 0) === (magnitude > 0) && (q.net > 0) === owedToYou).length || 1;
      const sameRing = people.filter(q => (q.net > 0) === owedToYou && Math.abs(q.net) > 0);
      const idx = Math.max(0, sameRing.findIndex(q => q.id === p.id));
      const baseAngle = (idx / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2 + (owedToYou ? 0 : 0.6);
      return {
        id: p.id, name: p.name, net: p.net, magnitude, owedToYou, ring,
        baseAngle, scale,
        r: (compact ? 10 : 13) + scale * (compact ? 16 : 22),
        color: magnitude === 0 ? (dark ? '#8a8f9c' : '#9aa0ac') : owedToYou ? accents.mint : accents.red,
        speed: owedToYou ? 0.1 : 0.065,
        settling: settlingId === p.id,
      };
    });
  }, [people, peak, compact, dark, settlingId]);

  const hasData = bodies.length > 0;

  useEffect(() => {
    if (!hasData) return undefined;
    const canvas = canvasRef.current; const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0, running = true, t = 0, dt = 0, last = 0, dpr = 1, W = 0, Hh = 0;
    const stars = [];
    const trails = bodies.map(() => []);
    const TRAIL = compact ? 14 : 22;
    const meteors = [];
    const dust = [];
    const flares = [];
    // Supernovae: a settled body's final streak into the star, tracked apart
    // from `bodies` so it survives one more render after the person is gone.
    const novae = [];

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
          r: Math.random() * 1.4 + 0.15, a: Math.random() * 0.6 + 0.08,
          twinkleSpeed: 0.3 + Math.random() * 2.5, twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      dust.length = 0;
      const dustCount = compact ? 22 : 44;
      for (let i = 0; i < dustCount; i++) {
        dust.push({
          x: Math.random() * W, y: Math.random() * Hh,
          vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.1,
          r: Math.random() * 1.8 + 0.3, a: Math.random() * 0.2 + 0.03,
          hue: [accents.mint, accents.cyan, accents.violet, accents.amber][Math.floor(Math.random() * 4)],
        });
      }
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce || !running) draw(); }); ro.observe(wrap);

    const orbitMax = () => Math.min(W, Hh) / 2 - (compact ? 30 : 40);

    const draw = () => {
      const cx = W / 2, cy = Hh / 2, oMax = orbitMax();
      ctx.clearRect(0, 0, W, Hh);

      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) / 1.3);
      vg.addColorStop(0, dark ? 'rgba(20,22,34,0.0)' : 'rgba(230,234,244,0.0)');
      vg.addColorStop(1, dark ? 'rgba(8,9,14,0.55)' : 'rgba(210,216,230,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, Hh);

      const nt = reduce ? 0 : t;
      const clouds = [
        { hue: baseAura, ox: 0.32, oy: 0.36, r: 0.58, sp: 0.05, ph: 0 },
        { hue: accents.violet, ox: 0.72, oy: 0.62, r: 0.6, sp: 0.04, ph: 2.1 },
        { hue: owedShare >= 0.5 ? accents.cyan : accents.amber, ox: 0.52, oy: 0.44, r: 0.5, sp: 0.03, ph: 4.3 },
      ];
      ctx.globalCompositeOperation = 'lighter';
      for (const n of clouds) {
        const nx = W * n.ox + Math.sin(nt * n.sp + n.ph) * W * 0.15;
        const ny = Hh * n.oy + Math.cos(nt * n.sp * 0.8 + n.ph) * Hh * 0.15;
        const rad = Math.min(W, Hh) * n.r;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        g.addColorStop(0, hexA(n.hue, dark ? 0.14 : 0.08));
        g.addColorStop(0.6, hexA(n.hue, dark ? 0.05 : 0.025));
        g.addColorStop(1, hexA(n.hue, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, ny, rad, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      const flash = reduce ? 0 : Math.max(0, 1 - t / 1.4);

      for (const s of stars) {
        const twinkle = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.a * twinkle * (dark ? 1 : 0.6);
        ctx.fillStyle = dark ? '#fff' : '#5b6480';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduce) {
        ctx.globalCompositeOperation = 'lighter';
        for (const d of dust) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
          if (d.y < -10) d.y = Hh + 10; if (d.y > Hh + 10) d.y = -10;
          const distToStar = Math.hypot(d.x - cx, d.y - cy);
          const nearStar = Math.max(0, 1 - distToStar / (oMax * 0.6));
          ctx.globalAlpha = d.a + nearStar * 0.12;
          const dg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2);
          dg.addColorStop(0, hexA(d.hue, 0.6)); dg.addColorStop(1, hexA(d.hue, 0));
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 2, 0, 7); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }

      if (!reduce) {
        if (Math.random() < 0.4 * dt && meteors.length < 3) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const hues = [accents.cyan, accents.mint, '#ffffff'];
          meteors.push({
            x: dir > 0 ? -20 : W + 20, y: Math.random() * Hh * 0.6,
            vx: dir * (5 + Math.random() * 4), vy: 1.3 + Math.random() * 2, life: 1,
            hue: hues[Math.floor(Math.random() * hues.length)],
          });
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i]; const step = dt * 60;
          m.x += m.vx * step; m.y += m.vy * step; m.life -= dt * 0.7;
          if (m.life <= 0 || m.x < -40 || m.x > W + 40 || m.y > Hh + 40) { meteors.splice(i, 1); continue; }
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 6, m.y - m.vy * 6);
          grad.addColorStop(0, hexA(m.hue, 0.9 * m.life)); grad.addColorStop(1, hexA(m.hue, 0));
          ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }

      // Orbit rings — one per direction, so "close" and "far" carry meaning.
      ctx.save();
      [
        { ring: RING.owedToYou, label: 'OWED TO YOU', c: accents.mint },
        { ring: RING.youOwe, label: 'YOU OWE', c: accents.red },
      ].forEach(({ ring: ringVal, label, c }) => {
        const ringR = oMax * ringVal;
        ctx.globalCompositeOperation = 'lighter';
        const rg = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8);
        rg.addColorStop(0, hexA(c, 0)); rg.addColorStop(0.4, hexA(c, dark ? 0.05 : 0.03)); rg.addColorStop(1, hexA(c, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, ringR + 8, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([3, 7]); ctx.lineWidth = 0.8;
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.font = `600 ${compact ? 7.5 : 9}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = dark ? 'rgba(140,148,180,0.26)' : 'rgba(80,90,120,0.3)';
        ctx.fillText(label, cx + Math.cos(Math.PI * 0.62) * ringR, cy + Math.sin(Math.PI * 0.62) * ringR);
      });
      ctx.restore();

      const pts = bodies.map((b, i) => {
        const ang = b.baseAngle + (reduce ? 0 : t * b.speed);
        const bob = reduce ? 0 : Math.sin(t * 0.8 + i) * 3;
        const rad = oMax * b.ring + bob;
        return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, ang };
      });
      canvas._pts = pts; canvas._bodies = bodies;

      // Gravity lines
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i;
        const gl = ctx.createLinearGradient(cx, cy, p.x, p.y);
        gl.addColorStop(0, hexA(b.color, on ? 0.35 : 0.08));
        gl.addColorStop(1, hexA(b.color, on ? 0.6 : 0.2));
        ctx.strokeStyle = gl; ctx.lineWidth = on ? 2.5 : 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke();
      });

      // Comet trails
      if (!reduce) {
        bodies.forEach((b, i) => { const tr = trails[i]; tr.push({ ...pts[i] }); if (tr.length > TRAIL) tr.shift(); });
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        bodies.forEach((b, i) => {
          const tr = trails[i]; const on = hoverRef.current === i;
          for (let k = 1; k < tr.length; k++) {
            const a = k / tr.length;
            ctx.globalAlpha = a * a * (on ? 0.65 : 0.38);
            ctx.strokeStyle = b.color; ctx.lineWidth = Math.max(0.5, a * b.r * 1.1);
            ctx.beginPath(); ctx.moveTo(tr[k - 1].x, tr[k - 1].y); ctx.lineTo(tr[k].x, tr[k].y); ctx.stroke();
          }
        });
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }

      // ── The star: your net, exactly as MoneyUniverse's centre is real money ──
      const sColor = net >= 0 ? accents.mint : accents.red;
      const auraCol = net < 0 ? accents.red : baseAura;
      const heft = Math.min(1, Math.abs(net) / (Math.max(totalOwed, totalYouOwe, 1) * 1.2 || 1));
      const coreR = (compact ? 24 : 30) + heft * (compact ? 10 : 14);
      const pulse2 = reduce ? 1 : 1 + Math.sin(t * 1.6 * auraSpeed) * 0.06;

      if (!reduce) {
        ctx.globalCompositeOperation = 'lighter';
        for (let ring = 0; ring < 3; ring++) {
          const coronaR = coreR * (2.2 + ring * 1.2) * pulse2;
          const coronaA = 0.08 - ring * 0.02;
          const cg = ctx.createRadialGradient(cx, cy, coreR, cx, cy, coronaR);
          cg.addColorStop(0, hexA(auraCol, coronaA)); cg.addColorStop(0.5, hexA(auraCol, coronaA * 0.4)); cg.addColorStop(1, hexA(auraCol, 0));
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, 7); ctx.fill();
        }
        if (Math.random() < 0.15 * dt && flares.length < 4) {
          flares.push({ angle: Math.random() * Math.PI * 2, length: coreR * (1.5 + Math.random() * 2),
            width: 1 + Math.random() * 2, life: 1, decay: 0.3 + Math.random() * 0.4, curve: (Math.random() - 0.5) * 0.8 });
        }
        for (let i = flares.length - 1; i >= 0; i--) {
          const f = flares[i]; f.life -= f.decay * dt; f.angle += 0.02 * dt;
          if (f.life <= 0) { flares.splice(i, 1); continue; }
          const fx1 = cx + Math.cos(f.angle) * coreR * 0.8, fy1 = cy + Math.sin(f.angle) * coreR * 0.8;
          const fx2 = cx + Math.cos(f.angle + f.curve) * (coreR + f.length * f.life);
          const fy2 = cy + Math.sin(f.angle + f.curve) * (coreR + f.length * f.life);
          const cpx = cx + Math.cos(f.angle + f.curve * 0.5) * (coreR + f.length * 0.6 * f.life);
          const cpy = cy + Math.sin(f.angle + f.curve * 0.5) * (coreR + f.length * 0.6 * f.life);
          ctx.strokeStyle = hexA(auraCol, f.life * 0.5); ctx.lineWidth = f.width * f.life;
          ctx.beginPath(); ctx.moveTo(fx1, fy1); ctx.quadraticCurveTo(cpx, cpy, fx2, fy2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.8);
      aura.addColorStop(0, hexA(auraCol, 0.48)); aura.addColorStop(0.35, hexA(auraCol, 0.18));
      aura.addColorStop(0.7, hexA(auraCol, 0.06)); aura.addColorStop(1, hexA(auraCol, 0));
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, coreR * 3.8 * pulse2, 0, 7); ctx.fill();

      const core = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
      core.addColorStop(0, '#ffffff'); core.addColorStop(0.25, hexA('#ffffff', 0.9));
      core.addColorStop(0.5, sColor); core.addColorStop(1, hexA(sColor, 0.6));
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 7); ctx.fill();
      ctx.strokeStyle = hexA('#ffffff', 0.25); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, coreR - 0.5, 0, 7); ctx.stroke();

      if (flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(sColor, flash * 0.6); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, coreR + (1 - flash) * coreR * 3, 0, 7); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Supernovae — a settling body's last streak home, then a bright pop.
      for (let i = novae.length - 1; i >= 0; i--) {
        const nv = novae[i]; nv.life -= dt * 1.6;
        if (nv.life <= 0) { novae.splice(i, 1); continue; }
        const k = 1 - nv.life;
        const x = nv.x0 + (cx - nv.x0) * k, y = nv.y0 + (cy - nv.y0) * k;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(nv.color, nv.life); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(nv.x0, nv.y0); ctx.lineTo(x, y); ctx.stroke();
        const bg = ctx.createRadialGradient(x, y, 0, x, y, 10 + (1 - nv.life) * 14);
        bg.addColorStop(0, hexA('#ffffff', nv.life)); bg.addColorStop(1, hexA(nv.color, 0));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, 10 + (1 - nv.life) * 14, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // Bodies
      const pop = 1 + flash * 0.28;
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i || selectedId === b.id;
        const settleK = b.settling ? Math.max(0, 1 - (novaProgress[b.id] || 0)) : 1;
        const br = b.r * pop * settleK;
        if (br <= 0.5) return;
        const halo = br * 3.6;
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        glow.addColorStop(0, hexA(b.color, Math.min(0.95, (on ? 0.7 : 0.45) + flash * 0.4)));
        glow.addColorStop(0.5, hexA(b.color, on ? 0.2 : 0.08));
        glow.addColorStop(1, hexA(b.color, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, halo, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(p.x - br * 0.35, p.y - br * 0.35, 0, p.x, p.y, br);
        g.addColorStop(0, hexA('#ffffff', 0.9)); g.addColorStop(0.3, hexA('#ffffff', 0.4));
        g.addColorStop(0.5, b.color); g.addColorStop(1, hexA(b.color, 0.6));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, 7); ctx.fill();
        if (on || br > 16) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = hexA(b.color, on ? 0.5 : 0.2); ctx.lineWidth = on ? 3 : 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, br + (on ? 5 : 3), 0, 7); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      });

      // Labels — first initial on the body, name+amount radiating outward.
      ctx.save();
      bodies.forEach((b, i) => {
        const p = pts[i]; const on = hoverRef.current === i;
        if (b.settling) return;
        ctx.font = `700 13px -apple-system, "SF Pro Display", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = dark ? '#0a0a0c' : '#fff';
        ctx.globalAlpha = 0.92;
        ctx.fillText((b.name || '?').charAt(0).toUpperCase(), p.x, p.y + 1);
        ctx.globalAlpha = 1;
        if (on) return; // hover readout below handles this one
        const angle = Math.atan2(p.y - cy, p.x - cx);
        const labelR = b.r + (compact ? 12 : 16);
        const lx = p.x + Math.cos(angle) * labelR, ly = p.y + Math.sin(angle) * labelR;
        ctx.textAlign = Math.cos(angle) > 0 ? 'left' : 'right';
        ctx.font = `600 ${compact ? 8 : 9.5}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = dark ? 'rgba(200,210,230,0.8)' : 'rgba(40,50,80,0.8)';
        const name = (b.name || '').length > (compact ? 7 : 11) ? `${b.name.slice(0, compact ? 6 : 10)}…` : b.name;
        ctx.fillText(name, lx, ly);
        ctx.font = `700 ${compact ? 7 : 8.5}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.globalAlpha = 0.42;
        ctx.fillText(moneySmart(b.magnitude), lx, ly + (compact ? 10 : 12));
      });
      ctx.restore(); ctx.globalAlpha = 1;
    };

    // Progress map for bodies mid-supernova, read by the draw loop above.
    const novaProgress = {};
    const spawnNova = (body, pt) => {
      novae.push({ x0: pt.x, y0: pt.y, color: body.color, life: 1 });
      novaProgress[body.id] = 0;
      const start = performance.now();
      const tick = () => {
        const p = Math.min(1, (performance.now() - start) / 500);
        novaProgress[body.id] = p;
        if (p < 1) requestAnimationFrame(tick);
      };
      tick();
    };
    canvas._spawnNova = spawnNova;

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

    onReady?.({
      getPoint: (id) => {
        const idx = bodies.findIndex(b => b.id === id);
        if (idx < 0 || !canvas._pts) return null;
        const rect = canvas.getBoundingClientRect();
        const p = canvas._pts[idx];
        return { x: rect.left + p.x, y: rect.top + p.y };
      },
      getCentre: () => {
        const rect = canvas.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      },
      spawnNova: (id) => {
        const idx = bodies.findIndex(b => b.id === id);
        if (idx < 0 || !canvas._pts) return;
        spawnNova(bodies[idx], canvas._pts[idx]);
      },
    });

    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [bodies, reduce, dark, compact, H, net, totalOwed, totalYouOwe, baseAura, auraSpeed, owedShare, hasData, selectedId, onReady]);

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
  const onClick = (e) => { const i = pick(e.clientX, e.clientY); if (i != null) onSelect?.(bodies[i]); };
  const onKey = (e) => {
    if (!bodies.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setHover(h => ((h == null ? -1 : h) + 1) % bodies.length); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setHover(h => ((h == null ? 1 : h) - 1 + bodies.length) % bodies.length); }
    else if (e.key === 'Enter' && hover != null) onSelect?.(bodies[hover]);
    else if (e.key === 'Escape') setHover(null);
  };

  if (!hasData) return null;

  const active = hover != null ? bodies[hover] : null;
  const netSign = net > 0 ? '+' : net < 0 ? '−' : '';
  const summary = `Split universe. Net ${netSign}${moneySmart(Math.abs(net))}. ` +
    `${bodies.length} ${bodies.length === 1 ? 'person' : 'people'}: ` +
    bodies.map(b => `${b.name} ${b.owedToYou ? 'owes you' : 'you owe'} ${moneySmart(b.magnitude)}`).join('; ') + '.';

  return (
    <Box
      ref={wrapRef}
      sx={{
        position: 'relative', width: '100%', height: H, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        background: dark
          ? `radial-gradient(120% 100% at 50% 40%, ${hexA(colorRole.bg.dark, 0)} 0%, ${colorRole.bg.dark} 100%)`
          : `radial-gradient(120% 100% at 50% 40%, ${hexA(colorRole.bg.light, 0)} 0%, ${colorRole.bg.light} 100%)`,
        '&:focus-within': { borderColor: 'primary.main' },
      }}
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
        style={{ display: 'block', touchAction: 'pan-y', cursor: 'pointer', outline: 'none' }}
      />

      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: { xs: 11, sm: 13 }, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
          {net === 0 ? 'All square' : net > 0 ? 'Owed to you' : 'You owe'}
        </Typography>
        <Typography component="div" sx={{ fontSize: { xs: '1.15rem', sm: '1.45rem' }, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.95)' }}>
          <AnimatedNumber value={Math.abs(net)} format="smart" />
        </Typography>
      </Box>

      {active && (
        <Box sx={{
          position: 'absolute', left: 12, bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1.25,
          px: 2, py: 1.25, borderRadius: 3.5, backdropFilter: 'blur(16px) saturate(180%)',
          bgcolor: dark ? 'rgba(16,18,28,0.82)' : 'rgba(255,255,255,0.88)',
          border: '1px solid', borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
        }}>
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 35% 30%, #fff, ${active.color} 70%)`, boxShadow: `0 0 12px ${active.color}` }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 650, letterSpacing: '-0.01em' }} noWrap>
            {active.name}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: active.color }}>
              {moneySmart(active.magnitude)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 550, color: 'text.disabled' }}>
              {active.owedToYou ? 'owes you' : 'you owe'}
            </Typography>
          </Box>
        </Box>
      )}

      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        <li>Net position: {netSign}{moneySmart(Math.abs(net))}</li>
        {bodies.map((b) => (
          <li key={b.id}>{b.name}: {b.owedToYou ? 'owes you' : 'you owe'} {moneySmart(b.magnitude)}</li>
        ))}
      </Box>
    </Box>
  );
}

function hexA(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
