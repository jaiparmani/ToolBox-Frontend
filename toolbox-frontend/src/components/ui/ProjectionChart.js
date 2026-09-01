import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money } from './money';

/**
 * The cash-flow projection — a restrained area+line of the real projected
 * balance, and the dashboard's signature interaction. Hover (or drag) anywhere
 * and a guideline snaps to the nearest day: a dot rides the line, a readout
 * shows that day's exact balance and date, and the endpoint quiets down so the
 * point you're inspecting leads. One accent (green), a dashed zero baseline,
 * markers at the lowest point and next income. Pure data — every point is
 * projection.series[i].balance.
 *
 * The SVG stretches to width (preserveAspectRatio none); the interactive
 * overlay is real DOM positioned in %, so text and the dot stay crisp and
 * un-stretched. Touch drags work; nothing animates per-frame.
 */
export default function ProjectionChart({ series = [], low, nextIncomeDate, height = 190, accent = accents.mint }) {
  const gid = React.useId();
  const wrapRef = React.useRef(null);
  const [hover, setHover] = React.useState(null); // index

  const pts = React.useMemo(() => (series || []).filter((d) => typeof d.balance === 'number'), [series]);

  const geom = React.useMemo(() => {
    if (pts.length < 2) return null;
    const W = 760, H = 200, padY = 22;
    const bals = pts.map((d) => d.balance);
    let min = Math.min(...bals, 0), max = Math.max(...bals, 0);
    if (min === max) max = min + 1;
    const xPx = (i) => (i / (pts.length - 1)) * W;
    const yPx = (b) => padY + (1 - (b - min) / (max - min)) * (H - padY * 2);
    const xPct = (i) => (i / (pts.length - 1)) * 100;
    const yPct = (b) => (yPx(b) / H) * 100;
    const line = pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPx(i).toFixed(1)},${yPx(d.balance).toFixed(1)}`).join(' ');
    return { W, H, padY, min, max, xPx, yPx, xPct, yPct, line, area: `${line} L${W},${H} L0,${H} Z`, zeroY: yPx(0) };
  }, [pts]);

  if (!geom) return <Box sx={{ height, borderRadius: 2, border: '1px solid', borderColor: 'divider', opacity: 0.4 }} />;

  const lowIdx = low?.date ? pts.findIndex((d) => d.date === low.date) : -1;
  const incIdx = nextIncomeDate ? pts.findIndex((d) => d.date === nextIncomeDate) : -1;

  const onMove = (e) => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(frac * (pts.length - 1)));
  };
  const active = hover != null ? pts[hover] : null;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Box
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      sx={{ position: 'relative', width: '100%', height, touchAction: 'pan-y', cursor: 'crosshair' }}
    >
      <svg viewBox={`0 0 ${geom.W} ${geom.H}`} width="100%" height={height} preserveAspectRatio="none" role="img"
        aria-label="Projected balance over the next 30 days" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.22" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {geom.min < 0 && geom.max > 0 && (
          <line x1="0" y1={geom.zeroY} x2={geom.W} y2={geom.zeroY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        )}
        <path d={geom.area} fill={`url(#${gid}-f)`} />
        <path d={geom.line} fill="none" stroke={accent} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {lowIdx >= 0 && (
          <>
            <line x1={geom.xPx(lowIdx)} y1={geom.yPx(pts[lowIdx].balance)} x2={geom.xPx(lowIdx)} y2={geom.H} stroke="rgba(224,161,58,0.4)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            <circle cx={geom.xPx(lowIdx)} cy={geom.yPx(pts[lowIdx].balance)} r="3" fill={accents.amber} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {incIdx >= 0 && <circle cx={geom.xPx(incIdx)} cy={geom.yPx(pts[incIdx].balance)} r="3" fill={accent} vectorEffect="non-scaling-stroke" />}
        {/* endpoint — quiets while inspecting a day */}
        <circle cx={geom.W} cy={geom.yPx(pts[pts.length - 1].balance)} r={active ? 2.5 : 3.5} fill={accent} opacity={active ? 0.35 : 1} vectorEffect="non-scaling-stroke" style={{ transition: 'opacity .15s ease' }} />
      </svg>

      {/* interactive overlay (crisp DOM, positioned in %) */}
      {active && (
        <>
          <Box aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: `${geom.xPct(hover)}%`, width: '1px', bgcolor: 'rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
          <Box aria-hidden sx={{ position: 'absolute', left: `${geom.xPct(hover)}%`, top: `${geom.yPct(active.balance)}%`, width: 9, height: 9, mt: '-4.5px', ml: '-4.5px', borderRadius: '50%', bgcolor: active.balance < 0 ? accents.red : accent, boxShadow: '0 0 0 3px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
          <Box sx={{
            position: 'absolute', top: 6, left: `${geom.xPct(hover)}%`, pointerEvents: 'none',
            transform: geom.xPct(hover) > 62 ? 'translateX(-100%) translateX(-10px)' : 'translateX(10px)',
            px: 1.1, py: 0.6, borderRadius: '9px', border: '1px solid', borderColor: 'divider',
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(20,20,22,0.92)' : 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
          }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 500 }}>{fmtDate(active.date)}</Typography>
            <Typography sx={{ fontFamily: type.displayFamily, fontSize: 14, fontWeight: 650, fontVariantNumeric: 'tabular-nums', color: active.balance < 0 ? accents.red : 'text.primary', lineHeight: 1.1 }}>
              {money(active.balance)}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
