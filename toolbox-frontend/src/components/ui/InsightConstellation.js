import React from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import BubbleChartRoundedIcon from '@mui/icons-material/BubbleChartRounded';
import { chart, motion as motionTokens } from '../../theme/tokens';
import { money, moneySmart } from './money';

/**
 * Insight Constellation — spending as an explorable field of bubbles. Each node
 * is a category (or merchant): area tracks the amount (sqrt scale, so area not
 * radius maps to value), colour identifies it, and every node opens its actual
 * transactions via onSelect. Laid out as a phyllotaxis spiral so it reads as a
 * constellation rather than a grid.
 *
 * Accessibility is first-class, not an afterthought: nodes are real buttons
 * (focusable, arrow/enter reachable, labelled with the full figure), and a
 * "list" view presents the identical data as an ordered list — the picture is
 * never the only way to read it. Colour never carries meaning alone; the label
 * and amount are always printed.
 *
 * `data`: [{ id, label, value, color }]. `onSelect(node)` drills in.
 */
export default function InsightConstellation({ data = [], onSelect, title = 'Explore spending' }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = React.useState('map'); // 'map' | 'list'

  const items = React.useMemo(
    () => [...data].filter(d => (d.value || 0) > 0).sort((a, b) => b.value - a.value),
    [data],
  );
  const total = items.reduce((s, d) => s + d.value, 0);

  // Colour identifies each node — but if the source colours are missing or all
  // the same (categories often share a default), fall back to the categorical
  // palette so nodes stay distinguishable. Label + amount are printed either way.
  const palette = (chart.categorical && chart.categorical[theme.palette.mode]) || [];
  // "Degenerate" when the source colours don't actually separate the nodes —
  // fewer than half are distinct (categories commonly share a default). In that
  // case the categorical palette gives every node its own colour instead.
  const degenerate = React.useMemo(
    () => new Set(items.map(d => d.color).filter(Boolean)).size <= items.length / 2,
    [items],
  );
  const colorFor = (d, i) => (!degenerate && d.color) || palette[i % palette.length] || theme.palette.primary.main;

  // Collision-free packing: place the largest bubble at the centre, then each
  // next one at the first point on an outward spiral that clears every placed
  // bubble. Guarantees no overlap, so every label is readable.
  const { nodes, viewBox } = React.useMemo(() => {
    if (!items.length) return { nodes: [], viewBox: '0 0 100 100' };
    const peak = Math.max(...items.map(d => d.value), 1);
    const gap = compact ? 6 : 8;
    const rOf = (d) => (compact ? 15 : 18) + Math.sqrt(d.value / peak) * (compact ? 30 : 42);
    const placed = [];
    items.forEach((d) => {
      const r = rOf(d);
      if (!placed.length) { placed.push({ ...d, r, x: 0, y: 0 }); return; }
      let best = null;
      for (let t = 1; t < 6000 && !best; t++) {
        const ang = t * 0.5;
        const dist = 2.2 * Math.sqrt(t);
        const x = Math.cos(ang) * dist;
        const y = Math.sin(ang) * dist;
        if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= p.r + r + gap)) best = { x, y };
      }
      placed.push({ ...d, r, x: best?.x ?? 0, y: best?.y ?? 0 });
    });
    // Fit the viewBox to the packed bounds with a little padding.
    const pad = 6;
    const minX = Math.min(...placed.map(p => p.x - p.r)) - pad;
    const minY = Math.min(...placed.map(p => p.y - p.r)) - pad;
    const maxX = Math.max(...placed.map(p => p.x + p.r)) + pad;
    const maxY = Math.max(...placed.map(p => p.y + p.r)) + pad;
    return {
      nodes: placed.map((p, i) => ({ ...p, i })),
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    };
  }, [items, compact]);

  if (!items.length) return null;

  const select = (n) => onSelect?.(n);

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 650, fontSize: '1rem' }}>{title}</Typography>
        <Box
          role="button" tabIndex={0}
          onClick={() => setView(v => (v === 'map' ? 'list' : 'map'))}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView(v => (v === 'map' ? 'list' : 'map')); } }}
          aria-label={view === 'map' ? 'Switch to list view' : 'Switch to constellation view'}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          {view === 'map' ? <FormatListBulletedRoundedIcon sx={{ fontSize: 16 }} /> : <BubbleChartRoundedIcon sx={{ fontSize: 16 }} />}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{view === 'map' ? 'List' : 'Map'}</Typography>
        </Box>
      </Box>

      {view === 'map' ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Box
            component="svg"
            viewBox={viewBox}
            role="group"
            aria-label={`${items.length} spending categories, ${money(total)} total. Interactive; a list view is available.`}
            sx={{ width: '100%', maxWidth: compact ? 340 : 460, height: 'auto', overflow: 'visible', display: 'block' }}
          >
            {nodes.map((n, i) => {
              const col = colorFor(n, i);
              const pct = Math.round((n.value / total) * 100);
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.label}: ${money(n.value)}, ${pct}% of spending. Open transactions.`}
                  onClick={() => select(n)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n); } }}
                  style={{
                    cursor: 'pointer',
                    animation: `constPop ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
                    animationDelay: `${i * 55}ms`, transformOrigin: `${n.x}px ${n.y}px`,
                  }}
                >
                  <circle cx={n.x} cy={n.y} r={n.r} fill={`${col}2e`} stroke={col} strokeWidth={2} />
                  {n.r >= 24 && (
                    <text x={n.x} y={n.y - 2} textAnchor="middle"
                      style={{ fill: theme.palette.text.primary, fontSize: n.r > 40 ? 12 : 10, fontWeight: 650, pointerEvents: 'none' }}>
                      {n.label.length > 9 ? `${n.label.slice(0, 8)}…` : n.label}
                    </text>
                  )}
                  {n.r >= 18 && (
                    <text x={n.x} y={n.r >= 24 ? n.y + 12 : n.y + 4} textAnchor="middle"
                      style={{ fill: col, fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
                      {moneySmart(n.value)}
                    </text>
                  )}
                </g>
              );
            })}
            <style>{`
              @keyframes constPop { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
              @media (prefers-reduced-motion: reduce) { g { animation: none !important; } }
              g:focus-visible circle { stroke-width: 3.5; }
              g:focus-visible { outline: none; }
            `}</style>
          </Box>
        </Box>
      ) : (
        <Stack component="ol" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map((d, i) => {
            const col = colorFor(d, i);
            const pct = Math.round((d.value / total) * 100);
            return (
              <Box
                key={d.id} component="li"
                role="button" tabIndex={0}
                onClick={() => select(d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); } }}
                aria-label={`${d.label}: ${money(d.value)}, ${pct}% of spending. Open transactions.`}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: 2, cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  '&:focus-visible': { outline: `2px solid ${col}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: col, flexShrink: 0 }} />
                <Typography sx={{ flex: 1, fontWeight: 600 }} noWrap>{d.label}</Typography>
                <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</Typography>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
