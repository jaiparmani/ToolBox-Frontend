import React from 'react';
import { Box, Chip, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { chart, motion as motionTokens } from '../../theme/tokens';
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
 * Two figures the eye should never have to hunt for are marked on the water
 * itself: today, and the lowest point the balance is projected to reach - the
 * number that decides whether the month is comfortable or not. Both come
 * straight from the same series that draws the line.
 *
 * Interaction follows the physics rules: the play-head tracks the pointer 1:1,
 * a flick hands its release velocity to a decaying glide that coasts to where
 * the gesture was going, and grabbing it again cancels that glide instantly.
 * Arrow keys scrub a day at a time; the whole thing is a slider to assistive
 * tech, with the day's real balance as its value text.
 *
 * The viewBox is measured in real pixels rather than a fixed 1000-unit grid, so
 * circles stay circular and stroke weights stay honest at any width.
 */

// Apple's momentum projection curve (Designing Fluid Interfaces).
const DECEL = 0.9975;

export default function CashFlowRiver({ projection, onSelectEvent, onSelectCategory, onScrub }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  // Reduced motion is a live signal, not a one-shot read at first render.
  const [reduce, setReduce] = React.useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const series = React.useMemo(() => projection?.series || [], [projection]);
  const wrapRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const headRef = React.useRef(null);
  const [selIdx, setSelIdx] = React.useState(null);
  const selRef = React.useRef(null); selRef.current = selIdx;

  // Broadcast the scrubbed day so the wider scene (the Money Universe star) can
  // reflow to that day's real projected balance. Null when the scrub is idle.
  React.useEffect(() => {
    if (!onScrub) return;
    const d = selIdx != null ? series[selIdx] : null;
    onScrub(d ? { index: selIdx, date: d.date, balance: d.balance, isToday: !!d.is_today } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selIdx]);

  // Measure the drawing surface so one SVG unit is one CSS pixel: no anisotropic
  // scaling, so event dots are circles and the trough label sits where it should.
  const [W, setW] = React.useState(720);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const w = Math.max(240, Math.round(el.clientWidth));
      setW(prev => (Math.abs(prev - w) > 0.5 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = compact ? 260 : 300, padY = 34;
  const inColor = isDark ? chart.flow.dark.owedToYou : chart.flow.light.owedToYou;
  const outColor = isDark ? chart.flow.dark.youOwe : chart.flow.light.youOwe;
  const uid = React.useId().replace(/:/g, '');

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
    const maxFlow = events.reduce((m, e) => Math.max(m, e.amount || 0), 0) || 1;
    // The trough: the lowest balance the projection reaches, and the day it
    // happens. Straight off the same series - never a separate estimate.
    let lowI = 0;
    series.forEach((d, i) => { if (d.balance < series[lowI].balance) lowI = i; });
    const todayI = Math.max(0, series.findIndex(d => d.is_today));
    return { x, y, zeroY, linePts, areaPts, events, maxFlow, lo, hi, lowI, todayI };
  }, [series, W, H]);

  // ── Scrub: 1:1 tracking, velocity handoff, interruptible glide ────────────
  const drag = React.useRef({ on: false, hist: [], raf: 0, px: 0 });

  const commit = React.useCallback((i) => {
    const clamped = Math.max(0, Math.min(series.length - 1, Math.round(i)));
    if (selRef.current !== clamped) { selRef.current = clamped; setSelIdx(clamped); }
    if (headRef.current && geom) headRef.current.style.transform = `translateX(${geom.x(clamped)}px)`;
    return clamped;
  }, [series.length, geom]);

  const stopGlide = () => { cancelAnimationFrame(drag.current.raf); drag.current.raf = 0; };

  const xFromClient = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    return Math.min(Math.max(clientX - rect.left, 0), rect.width) * (W / (rect.width || 1));
  };

  const onDown = (e) => {
    stopGlide(); // interruptible: a coasting play-head is caught, not queued behind
    // setPointerCapture throws if the pointer isn't active (rare, but real);
    // the scrub works without it, so never let it break the interaction.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
    const px = xFromClient(e.clientX);
    drag.current.on = true;
    drag.current.px = px;
    drag.current.hist = [{ x: px, t: performance.now() }];
    commit((px / W) * (series.length - 1));
  };

  const onMove = (e) => {
    if (!drag.current.on) return;
    const px = xFromClient(e.clientX);
    drag.current.px = px;
    drag.current.hist.push({ x: px, t: performance.now() });
    while (drag.current.hist.length > 6) drag.current.hist.shift();
    commit((px / W) * (series.length - 1));
  };

  const onUp = () => {
    if (!drag.current.on) return;
    drag.current.on = false;
    const h = drag.current.hist;
    const a = h[0], b = h[h.length - 1];
    const dtMs = a && b ? b.t - a.t : 0;
    let v = dtMs > 8 ? ((b.x - a.x) / dtMs) * 1000 : 0; // px/s
    if (reduce || Math.abs(v) < 120) return;            // a slow release just stops
    // Coast on the velocity the finger actually had, decaying exponentially -
    // it comes to rest at the projected endpoint rather than snapping there.
    let px = drag.current.px;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      px += v * dt;
      v *= Math.pow(DECEL, dt * 1000);
      if (px <= 0 || px >= W) { px = Math.max(0, Math.min(W, px)); v = 0; } // the horizon is a hard edge
      commit((px / W) * (series.length - 1));
      if (Math.abs(v) > 40) drag.current.raf = requestAnimationFrame(step);
      else drag.current.raf = 0;
    };
    drag.current.raf = requestAnimationFrame(step);
  };

  React.useEffect(() => () => cancelAnimationFrame(drag.current.raf), []);

  const onKey = (e) => {
    if (!geom) return;
    const cur = selRef.current ?? geom.todayI;
    const last = series.length - 1;
    const set = (i) => { e.preventDefault(); stopGlide(); commit(i); };
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(cur - 1);
    else if (e.key === 'PageUp') set(cur + 7);
    else if (e.key === 'PageDown') set(cur - 7);
    else if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(last);
    else if (e.key === 'Escape') { selRef.current = null; setSelIdx(null); }
  };

  if (!geom) return (
    <Box sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        Add a recurring income or bill to see your cash flow ahead.
      </Typography>
    </Box>
  );

  const sel = selIdx != null ? series[selIdx] : null;
  const negative = geom.lo < 0;
  const low = series[geom.lowI];
  const lowX = geom.x(geom.lowI), lowY = geom.y(low.balance);
  const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  // Keep the trough label inside the frame at any width.
  const lowAnchor = lowX < 64 ? 'start' : lowX > W - 64 ? 'end' : 'middle';
  const lowDx = lowAnchor === 'start' ? 8 : lowAnchor === 'end' ? -8 : 0;

  return (
    <Box ref={wrapRef}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Next {projection.horizon_days} days
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <LegendDot color={inColor} label="in" up />
          <LegendDot color={outColor} label="out" />
          <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', sm: 'block' } }}>drag to scrub</Typography>
        </Stack>
      </Box>

      <Box
        component="svg"
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        tabIndex={0}
        role="slider"
        aria-label={`Projected balance over the next ${projection.horizon_days} days. Scrub to a day.`}
        aria-valuemin={0}
        aria-valuemax={series.length - 1}
        aria-valuenow={selIdx ?? geom.todayI}
        aria-valuetext={sel
          ? `${sel.is_today ? 'Today' : fmtDay(sel.date)}: ${money(sel.balance)}`
          : `Today: ${money(series[geom.todayI].balance)}`}
        sx={{
          width: '100%', height: H, touchAction: 'none', cursor: 'ew-resize', display: 'block',
          outline: 'none',
          '&:focus-visible': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}`, borderRadius: 1 },
        }}
      >
        <defs>
          <linearGradient id={`${uid}-river`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={inColor} stopOpacity="0.42" />
            <stop offset="1" stopColor={inColor} stopOpacity="0.02" />
          </linearGradient>
          {/* income stream: bright at the river, fading as it rises in */}
          <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={inColor} stopOpacity="0.02" />
            <stop offset="1" stopColor={inColor} stopOpacity="0.55" />
          </linearGradient>
          {/* expense stream: bright at the river, fading as it drops out */}
          <linearGradient id={`${uid}-out`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={outColor} stopOpacity="0.55" />
            <stop offset="1" stopColor={outColor} stopOpacity="0.02" />
          </linearGradient>
          {/* everything below zero is water you don't have */}
          <clipPath id={`${uid}-under`}>
            <rect x="0" y={geom.zeroY} width={W} height={Math.max(0, H - geom.zeroY)} />
          </clipPath>
        </defs>

        <polygon points={geom.areaPts} fill={`url(#${uid}-river)`} />

        {/* zero baseline and the shortfall below it, when the balance dips */}
        {negative && (
          <>
            <polygon points={geom.areaPts} fill={alpha(outColor, 0.28)} clipPath={`url(#${uid}-under)`} />
            <line x1="0" y1={geom.zeroY} x2={W} y2={geom.zeroY}
              stroke={outColor} strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
          </>
        )}

        {/* Event streams — money entering (income, rising in from above) and
            leaving (bills, dropping out below), each sized by its amount. */}
        {geom.events.map((ev, k) => {
          const isIn = ev.type === 'income';
          const h = 26 + (ev.amount / geom.maxFlow) * (H * 0.42);
          const w = 7;
          const yTop = isIn ? ev.y - h : ev.y;
          return (
            <rect key={`s${k}`} x={ev.x - w / 2} y={yTop} width={w} height={h} rx={w / 2}
              fill={isIn ? `url(#${uid}-in)` : `url(#${uid}-out)`} />
          );
        })}

        <polyline points={geom.linePts} fill="none" stroke={inColor} strokeWidth="2.5"
          strokeLinejoin="round" />

        {/* Live current: a shimmer of dashes drifting along the stream, so the
            river reads as flowing. Texture, not a figure — it encodes nothing,
            and it is motion-gated. */}
        {!reduce && (
          <polyline points={geom.linePts} fill="none" stroke={isDark ? '#eaf3ff' : '#ffffff'} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray="1 14" opacity="0.85"
            style={{ animation: `riverFlow ${motionTokens.slower * 3}ms linear infinite` }} />
        )}
        <style>{`
          @keyframes riverFlow { to { stroke-dashoffset: -15; } }
          @media (prefers-reduced-motion: reduce) { polyline { animation: none !important; } }
        `}</style>

        {/* Today */}
        <line x1={geom.x(geom.todayI)} y1={padY - 14} x2={geom.x(geom.todayI)} y2={H}
          stroke={theme.palette.text.primary} strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />
        <text x={geom.x(geom.todayI) + 5} y={padY - 16} textAnchor="start"
          style={{ fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 600 }}>
          today
        </text>

        {/* The trough — the lowest the projection goes, and when. The single
            most consequential number on this chart, so it is drawn, not hidden
            behind a scrub. */}
        <circle cx={lowX} cy={lowY} r="4.5" fill={low.balance < 0 ? outColor : inColor}
          stroke={isDark ? '#0b0b10' : '#fff'} strokeWidth="2" />
        <text x={lowX + lowDx} y={lowY + 20} textAnchor={lowAnchor}
          style={{ fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 600 }}>
          low {moneySmart(low.balance)} · {fmtDay(low.date)}
        </text>

        {/* event markers */}
        {geom.events.map((ev, k) => (
          <circle key={k} cx={ev.x} cy={ev.y} r="5"
            fill={ev.type === 'income' ? inColor : outColor}
            stroke={isDark ? '#0b0b10' : '#fff'} strokeWidth="2" />
        ))}

        {/* play-head (ref-driven) */}
        <g ref={headRef} style={{ transform: `translateX(${selIdx != null ? geom.x(selIdx) : 0}px)`, opacity: selIdx != null ? 1 : 0, transition: `opacity ${motionTokens.instant}ms linear` }}>
          <line x1="0" y1="0" x2="0" y2={H} stroke={theme.palette.text.primary} strokeWidth="1" opacity="0.5" />
          <circle cx="0" cy={selIdx != null ? geom.y(series[selIdx].balance) : 0} r="4"
            fill={theme.palette.text.primary} opacity="0.75" />
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
        <>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="space-between">
            <Mini label="Safe today" value={moneySmart(projection.safe_to_spend_today)} tone={inColor} />
            <Mini label="Income due" value={moneySmart(projection.upcoming_income)} tone={inColor} />
            <Mini label="Bills due" value={moneySmart(projection.upcoming_bills)} tone={outColor} />
            <Mini label="Runway" value={projection.runway_days != null ? `${projection.runway_days}d` : 'clear'}
              tone={projection.runway_days != null && projection.runway_days <= 14 ? outColor : theme.palette.text.primary} />
          </Stack>
          <MixBar
            mix={projection.discretionary_mix}
            daily={projection.daily_discretionary}
            isDark={isDark}
            onSelectCategory={onSelectCategory}
          />
        </>
      )}

      {/* The chart's figures in text, so nothing important lives only inside the
          drawing (or only behind a drag). */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        <li>Today: {money(series[geom.todayI].balance)}</li>
        <li>Lowest projected balance: {money(low.balance)} on {fmtDay(low.date)}</li>
        <li>In {projection.horizon_days} days: {money(series[series.length - 1].balance)}</li>
        {geom.events.map((ev, k) => (
          <li key={`a${k}`}>
            {fmtDay(ev.date)}: {ev.description} {ev.type === 'income' ? '+' : '−'}{money(ev.amount)}
          </li>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Where the ordinary daily spend goes — the discretionary drain broken into its
 * recent category mix as a stacked bar. Each segment drills into that category's
 * transactions. Colours fall back to the categorical palette when the source
 * colours don't separate the categories (they often share a default).
 */
function MixBar({ mix, daily, isDark, onSelectCategory }) {
  const palette = (chart.categorical && chart.categorical[isDark ? 'dark' : 'light']) || [];
  if (!mix || mix.length === 0) return null;
  const degenerate = new Set(mix.map(m => m.color).filter(Boolean)).size <= mix.length / 2;
  const colorFor = (m, i) => (!degenerate && m.color) || palette[i % palette.length] || chart.sequential[isDark ? 'dark' : 'light'];

  return (
    <Box sx={{ mt: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Where your daily spend goes
        </Typography>
        <Typography variant="caption" color="text.secondary">≈{moneySmart(daily)}/day</Typography>
      </Box>
      <Box sx={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', gap: '2px' }}>
        {mix.map((m, i) => (
          <Box
            key={m.category_id ?? `other-${i}`}
            role={m.category_id != null && onSelectCategory ? 'button' : undefined}
            tabIndex={m.category_id != null && onSelectCategory ? 0 : undefined}
            onClick={() => m.category_id != null && onSelectCategory?.(m.category_id)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && m.category_id != null) { e.preventDefault(); onSelectCategory?.(m.category_id); } }}
            aria-label={`${m.category}: ${Math.round(m.share * 100)}% of daily spend`}
            title={`${m.category} · ${Math.round(m.share * 100)}%`}
            sx={{
              width: `${Math.max(m.share * 100, 2)}%`, backgroundColor: colorFor(m, i),
              cursor: m.category_id != null && onSelectCategory ? 'pointer' : 'default',
              transition: `opacity ${motionTokens.fast}ms ${motionTokens.ease}`, '&:hover': { opacity: 0.82 },
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 1 }}>
        {mix.slice(0, 4).map((m, i) => (
          <Box key={m.category_id ?? `l-${i}`} display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colorFor(m, i) }} />
            <Typography variant="caption" color="text.secondary">
              {m.category} {Math.round(m.share * 100)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function LegendDot({ color, label, up }) {
  return (
    <Box display="inline-flex" alignItems="center" gap={0.4}>
      <Box sx={{
        width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
        ...(up ? { borderBottom: `6px solid ${color}` } : { borderTop: `6px solid ${color}` }),
      }} />
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>{label}</Typography>
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
