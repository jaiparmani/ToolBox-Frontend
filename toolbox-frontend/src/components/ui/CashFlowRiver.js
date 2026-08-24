import React from 'react';
import { Box, Chip, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { chart, accents } from '../../theme/tokens';
import { money, moneySmart } from './money';

/**
 * Cash Flow River - your money as a river of time.
 *
 * The projection series becomes an area whose height is the balance, flowing
 * left (today) to right (the horizon). Income lifts it, bills cut into it, and
 * a marker sits on every event. Drag anywhere to scrub: a play-head follows the
 * finger and the panel below reads out that day's balance and what moved it.
 * Tapping an event's detail opens its source.
 *
 * The scrub is driven through a ref (play-head position on the compositor) with
 * the selected day in React state, so it stays exact under the frequent
 * re-renders this screen does - the same approach the constellation uses.
 */
export default function CashFlowRiver({ projection, onSelectEvent }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  const series = projection?.series || [];
  const svgRef = React.useRef(null);
  const headRef = React.useRef(null);
  const [selIdx, setSelIdx] = React.useState(null);

  const W = 1000, H = compact ? 260 : 300, padY = 34;
  const inColor = isDark ? chart.flow.dark.owedToYou : chart.flow.light.owedToYou;
  const outColor = isDark ? chart.flow.dark.youOwe : chart.flow.light.youOwe;

  const geom = React.useMemo(() => {
    if (series.length < 2) return null;
    const balances = series.map(d => d.balance);
    let lo = Math.min(...balances, 0), hi = Math.max(...balances, 0);
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.12;
    lo -= pad; hi += pad;
    const x = (i) => (i / (series.length - 1)) * W;
    const y = (v) => H - padY - ((v - lo) / (hi - lo)) * (H - padY * 2);
    const zeroY = y(0);
    const linePts = series.map((d, i) => `${x(i)},${y(d.balance)}`).join(' ');
    const areaPts = `0,${H} ${linePts} ${W},${H}`;
    const events = [];
    series.forEach((d, i) => (d.events || []).forEach(ev =>
      events.push({ ...ev, i, x: x(i), y: y(d.balance), date: d.date })));
    return { x, y, zeroY, linePts, areaPts, events, lo, hi };
  }, [series, W, H]);

  if (!geom) return (
    <Box sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        Add a recurring income or bill to see your cash flow ahead.
      </Typography>
    </Box>
  );

  const idxFromClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    const frac = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return Math.round(frac * (series.length - 1));
  };
  const moveHead = (clientX) => {
    const i = idxFromClientX(clientX);
    setSelIdx(i);
    if (headRef.current) headRef.current.style.transform = `translateX(${geom.x(i)}px)`;
  };
  const onDown = (e) => {
    // setPointerCapture throws if the pointer isn't active (rare, but real);
    // the scrub works without it, so never let it break the interaction.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
    moveHead(e.clientX);
  };
  const onMove = (e) => { if (e.buttons || e.pressure) moveHead(e.clientX); };

  const sel = selIdx != null ? series[selIdx] : null;
  const negative = geom.lo < 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Next {projection.horizon_days} days
        </Typography>
        <Typography variant="caption" color="text.secondary">drag to scrub</Typography>
      </Box>

      <Box
        component="svg"
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        sx={{ width: '100%', height: H, touchAction: 'none', cursor: 'ew-resize', display: 'block' }}
      >
        <defs>
          <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={inColor} stopOpacity="0.42" />
            <stop offset="1" stopColor={inColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* zero baseline when the balance dips negative */}
        {negative && (
          <line x1="0" y1={geom.zeroY} x2={W} y2={geom.zeroY}
            stroke={outColor} strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
        )}

        <polygon points={geom.areaPts} fill="url(#river)" />
        <polyline points={geom.linePts} fill="none" stroke={inColor} strokeWidth="2.5"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

        {/* event markers */}
        {geom.events.map((ev, k) => (
          <circle key={k} cx={ev.x} cy={ev.y} r="5"
            fill={ev.type === 'income' ? inColor : outColor}
            stroke={isDark ? '#0b0b10' : '#fff'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}

        {/* play-head (ref-driven) */}
        <g ref={headRef} style={{ transform: `translateX(${selIdx != null ? geom.x(selIdx) : 0}px)`, opacity: selIdx != null ? 1 : 0, transition: 'opacity 120ms linear' }}>
          <line x1="0" y1="0" x2="0" y2={H} stroke={theme.palette.text.primary} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
        </g>
      </Box>

      {/* readout: the scrubbed day, or the summary when idle */}
      {sel ? (
        <Box sx={{ mt: 1.5, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="baseline">
            <Typography variant="caption" color="text.secondary">
              {sel.is_today ? 'Today' : new Date(sel.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: sel.balance >= 0 ? inColor : outColor, fontVariantNumeric: 'tabular-nums' }}>
              {money(sel.balance)}
            </Typography>
          </Box>
          {(sel.events || []).length > 0 && (
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {sel.events.map((ev, k) => (
                <Box key={k} display="flex" alignItems="center" gap={1}
                  onClick={() => onSelectEvent?.(ev)}
                  sx={{ cursor: onSelectEvent ? 'pointer' : 'default' }}>
                  {ev.type === 'income'
                    ? <NorthEastIcon sx={{ fontSize: 16, color: inColor }} />
                    : <SouthWestIcon sx={{ fontSize: 16, color: outColor }} />}
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{ev.description}</Typography>
                  <Chip label="recurring" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: ev.type === 'income' ? inColor : outColor }}>
                    {ev.type === 'income' ? '+' : '−'}{money(ev.amount)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      ) : (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="space-between">
          <Mini label="Safe today" value={moneySmart(projection.safe_to_spend_today)} tone={inColor} />
          <Mini label="Income due" value={moneySmart(projection.upcoming_income)} tone={inColor} />
          <Mini label="Bills due" value={moneySmart(projection.upcoming_bills)} tone={outColor} />
          <Mini label="Runway" value={projection.runway_days != null ? `${projection.runway_days}d` : 'clear'}
            tone={projection.runway_days != null && projection.runway_days <= 14 ? outColor : theme.palette.text.primary} />
        </Stack>
      )}
    </Box>
  );
}

function Mini({ label, value, tone }) {
  return (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: tone, fontVariantNumeric: 'tabular-nums' }} noWrap>{value}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
    </Box>
  );
}
