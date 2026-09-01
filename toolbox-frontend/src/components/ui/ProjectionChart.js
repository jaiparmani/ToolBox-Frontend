import React from 'react';
import { Box } from '@mui/material';
import { accents } from '../../theme/tokens';

/**
 * The cash-flow projection — a restrained area+line of the real projected
 * balance over the horizon. One accent (green), a dashed zero baseline, a
 * marker at the lowest point and at the next income day, an emphasized
 * endpoint. No glow, no gradient wash beyond a faint area fill. Pure data:
 * every point is projection.series[i].balance.
 *
 * SVG in a fixed viewBox, stretched to width (preserveAspectRatio none) so it
 * fills any card; strokes stay crisp because we counter-scale them via
 * vector-effect. Reduced-motion is irrelevant — it's static.
 */
export default function ProjectionChart({ series = [], low, nextIncomeDate, height = 150, accent = accents.mint }) {
  const gid = React.useId();
  const pts = (series || []).filter((d) => typeof d.balance === 'number');
  if (pts.length < 2) return <Box sx={{ height, borderRadius: 2, border: '1px solid', borderColor: 'divider', opacity: 0.4 }} />;

  const W = 760, H = 160, padY = 18;
  const bals = pts.map((d) => d.balance);
  let min = Math.min(...bals, 0), max = Math.max(...bals, 0);
  if (min === max) { max = min + 1; }
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (b) => padY + (1 - (b - min) / (max - min)) * (H - padY * 2);
  const zeroY = y(0);

  const line = pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const lowIdx = low?.date ? pts.findIndex((d) => d.date === low.date) : -1;
  const incIdx = nextIncomeDate ? pts.findIndex((d) => d.date === nextIncomeDate) : -1;

  return (
    <Box sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img"
        aria-label="Projected balance over the next 30 days">
        <defs>
          <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.20" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* zero baseline (only if within range) */}
        {min < 0 && max > 0 && (
          <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        )}
        <path d={area} fill={`url(#${gid}-f)`} />
        <path d={line} fill="none" stroke={accent} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {/* lowest-point marker */}
        {lowIdx >= 0 && (
          <>
            <line x1={x(lowIdx)} y1={y(pts[lowIdx].balance)} x2={x(lowIdx)} y2={H} stroke="rgba(224,161,58,0.4)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            <circle cx={x(lowIdx)} cy={y(pts[lowIdx].balance)} r="3" fill={accents.amber} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {/* next-income marker */}
        {incIdx >= 0 && <circle cx={x(incIdx)} cy={y(pts[incIdx].balance)} r="3" fill={accent} vectorEffect="non-scaling-stroke" />}
        {/* endpoint */}
        <circle cx={W} cy={y(pts[pts.length - 1].balance)} r="3.5" fill={accent} vectorEffect="non-scaling-stroke" />
      </svg>
    </Box>
  );
}
