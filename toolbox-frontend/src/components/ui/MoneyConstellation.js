import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { chart, motion as motionTokens } from '../../theme/tokens';
import { moneySmart } from './money';

/**
 * Who owes whom, as a picture.
 *
 * A balance list tells you the numbers but not the shape of things - whether
 * you're mostly owed or mostly owing, and who the big relationships are. Here
 * you sit at the centre and each person is a node on a ring: the line between
 * you carries the debt, its colour the direction, its weight the size.
 *
 * Encoding choices worth stating:
 *  - Direction is polarity, so it uses a diverging pair (cool = coming to you,
 *    warm = going out) with a neutral for settled. The sign is also printed on
 *    every node, so the picture survives being read in greyscale.
 *  - Magnitude maps to line width and node radius on a square-root scale.
 *    Area grows with the square of the radius, so scaling radius linearly
 *    would make a debt twice as large look four times as big.
 *  - The centre is not decoration: it carries your signed net across everyone
 *    on the ring, the one figure the picture is summing up.
 *  - Every node is labelled. No legend, because nothing here is identified by
 *    colour alone.
 *
 * The ring is a dial you can spin. It tracks the pointer 1:1, and a flick hands
 * its release velocity to a momentum glide (Apple's projection curve) before
 * settling home — grabbing it mid-flight picks it up from the angle actually on
 * screen, never from the logical target, so it can always be caught and
 * redirected. Labels counter-rotate, so a name is never upside down.
 */

// Apple's momentum projection (Designing Fluid Interfaces): where a flick would
// come to rest under exponential decay. Used to decide how far a spin coasts.
const DECELERATION = 0.995;
const project = (velocity) => (velocity / 1000) * DECELERATION / (1 - DECELERATION);

export default function MoneyConstellation({ people, selectedId, onSelect, centreLabel = 'You' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const flow = isDark ? chart.flow.dark : chart.flow.light;
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const uid = React.useId().replace(/:/g, '');

  // Reduced motion is a live signal - a user can flip it while the page is open.
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

  // Drag-to-rotate: grab the ring, spin it, and it coasts and springs back like
  // a dial. Driven straight through a ref rather than React state or a motion
  // library - the rotation is written to the element's transform on each
  // pointermove, so a fast drag can't be starved by re-renders.
  const rotorRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const labelRefs = React.useRef([]);
  const rotation = React.useRef(0);
  const dragging = React.useRef(false);
  const lastAngle = React.useRef(0);
  const moved = React.useRef(false);
  // Short history of (angle, time) so release velocity is a real measurement,
  // not the last single delta.
  const history = React.useRef([]);
  const settleTimer = React.useRef(0);

  const angleFromEvent = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  };

  /** The angle actually on screen right now, mid-transition included. */
  const presentedRotation = () => {
    const el = rotorRef.current;
    if (!el) return rotation.current;
    try {
      const css = getComputedStyle(el).transform;
      if (!css || css === 'none' || typeof DOMMatrixReadOnly === 'undefined') return rotation.current;
      const m = new DOMMatrixReadOnly(css);
      const live = Math.atan2(m.b, m.a) * (180 / Math.PI);
      // The matrix only reports -180..180; keep the winding the ref already has.
      const turns = Math.round((rotation.current - live) / 360);
      return live + turns * 360;
    } catch {
      return rotation.current;
    }
  };

  const applyRotation = () => {
    const el = rotorRef.current;
    if (!el) return;
    el.style.transform = `rotate(${rotation.current}deg)`;
    // Counter-rotate each node's text so names and amounts stay upright.
    const inv = `rotate(${-rotation.current}deg)`;
    for (const l of labelRefs.current) { if (l) l.style.transform = inv; }
  };

  const onDragStart = (e) => {
    if (reduce || !rotorRef.current) return;
    clearTimeout(settleTimer.current);
    dragging.current = true;
    moved.current = false;
    // Interruptible: pick the spin up from the angle on screen, not the target
    // it was heading for, so catching a coasting ring never jumps.
    rotation.current = presentedRotation();
    lastAngle.current = angleFromEvent(e);
    history.current = [{ a: rotation.current, t: performance.now() }];
    // no transition while dragging - the ring should track the finger exactly
    rotorRef.current.style.transition = 'none';
    for (const l of labelRefs.current) { if (l) l.style.transition = 'none'; }
    applyRotation();
    rotorRef.current.setPointerCapture?.(e.pointerId);
  };

  const onDragMove = (e) => {
    if (!dragging.current) return;
    const a = angleFromEvent(e);
    let delta = a - lastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (Math.abs(delta) > 0.4) moved.current = true;
    rotation.current += delta;
    lastAngle.current = a;
    const now = performance.now();
    history.current.push({ a: rotation.current, t: now });
    while (history.current.length > 6) history.current.shift();
    applyRotation();
  };

  const onDragEnd = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    rotorRef.current?.releasePointerCapture?.(e.pointerId);
    if (!rotorRef.current) return;

    // Velocity handoff: measure deg/s over the recent history, project where the
    // flick would coast to, glide there, then settle home with a soft overshoot.
    const h = history.current;
    const first = h[0], lastPt = h[h.length - 1];
    const dtMs = lastPt && first ? lastPt.t - first.t : 0;
    const velocity = dtMs > 8 ? ((lastPt.a - first.a) / dtMs) * 1000 : 0; // deg/s
    const coast = Math.max(-540, Math.min(540, project(velocity)));

    const setTransition = (ms, easing) => {
      const css = `transform ${ms}ms ${easing}`;
      rotorRef.current.style.transition = css;
      for (const l of labelRefs.current) { if (l) l.style.transition = css; }
    };

    if (Math.abs(coast) > 6) {
      // Glide out on the momentum the finger actually had...
      const glide = Math.min(motionTokens.slower, motionTokens.normal + Math.abs(coast));
      setTransition(glide, motionTokens.ease);
      rotation.current += coast;
      applyRotation();
      // ...then let the dial return to rest.
      settleTimer.current = setTimeout(() => {
        if (dragging.current || !rotorRef.current) return;
        setTransition(motionTokens.slower, motionTokens.emphasis);
        rotation.current = 0;
        applyRotation();
      }, glide);
    } else {
      setTransition(motionTokens.slower, motionTokens.emphasis);
      rotation.current = 0;
      applyRotation();
    }
  };

  React.useEffect(() => () => clearTimeout(settleTimer.current), []);

  const size = compact ? 320 : 420;
  const centre = size / 2;
  const ring = compact ? 108 : 148;

  const nodes = React.useMemo(() => {
    const list = people || [];
    if (!list.length) return [];
    const peak = Math.max(...list.map(p => Math.abs(p.net) || 0), 1);

    return list.map((person, i) => {
      // Start at the top and go clockwise, so the first person is where the
      // eye already is rather than out to the right.
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const magnitude = Math.abs(person.net) || 0;
      // sqrt so area, not radius, tracks the amount
      const scale = Math.sqrt(magnitude / peak);
      return {
        ...person,
        x: centre + Math.cos(angle) * ring,
        y: centre + Math.sin(angle) * ring,
        // Floor of 22px keeps a tiny balance tappable on a phone.
        r: 22 + scale * (compact ? 10 : 16),
        width: 1.5 + scale * 5,
        colour: magnitude === 0 ? flow.settled : person.net > 0 ? flow.owedToYou : flow.youOwe,
        textColour: magnitude === 0
          ? (isDark ? '#999' : '#888')
          : person.net > 0
            ? flow.owedToYou
            : (isDark ? '#f07060' : flow.youOwe),
      };
    });
  }, [people, centre, ring, compact, flow]);

  // The centre's real figure: your signed net across everyone on the ring.
  const centreNet = React.useMemo(
    () => (people || []).reduce((s, p) => s + (Number(p.net) || 0), 0),
    [people],
  );

  if (!nodes.length) return null;

  const centreR = compact ? 34 : 40;
  const netSign = centreNet > 0 ? '+' : centreNet < 0 ? '−' : '';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
      <div
        ref={rotorRef}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          width: '100%', maxWidth: size, willChange: 'transform',
          transformOrigin: '50% 50%',
          touchAction: 'none', cursor: reduce ? 'default' : 'grab',
        }}
      >
      <Box
        component="svg"
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label={`Money owed between you and ${nodes.length} ${nodes.length === 1 ? 'person' : 'people'}. Net ${netSign}${moneySmart(Math.abs(centreNet))}.`}
        sx={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
      >
        <defs>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Links first so nodes sit on top of them */}
        {nodes.map((node, i) => {
          const dimmed = selectedId && selectedId !== node.id;
          return (
            <line
              key={`link-${node.id}`}
              x1={centre} y1={centre} x2={node.x} y2={node.y}
              stroke={node.colour}
              strokeWidth={node.width}
              strokeLinecap="round"
              opacity={dimmed ? 0.15 : 0.55}
              style={{
                // Each line draws itself outward from the centre, so the
                // picture assembles the way you'd describe it.
                strokeDasharray: ring,
                strokeDashoffset: 0,
                animation: `drawLink ${motionTokens.slow}ms ${motionTokens.ease} both`,
                animationDelay: `${i * (motionTokens.instant * 0.78)}ms`,
                transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            />
          );
        })}

        {/* You — and the net the whole picture adds up to */}
        <circle
          data-mc-center
          cx={centre} cy={centre} r={centreR}
          fill={theme.palette.primary.main}
          filter={`url(#${uid}-glow)`}
        />
        <g
          ref={(el) => { labelRefs.current[nodes.length] = el; }}
          style={{ transformOrigin: `${centre}px ${centre}px`, pointerEvents: 'none' }}
        >
          <text
            x={centre} y={centre - 4} textAnchor="middle"
            style={{ fill: '#fff', fontSize: compact ? 10 : 11, fontWeight: 600, opacity: 0.85, letterSpacing: '0.04em' }}
          >
            {centreLabel}
          </text>
          <text
            x={centre} y={centre + 12} textAnchor="middle"
            style={{ fill: '#fff', fontSize: compact ? 12.5 : 14, fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}
          >
            {netSign}{moneySmart(Math.abs(centreNet))}
          </text>
        </g>

        {nodes.map((node, i) => {
          const dimmed = selectedId && selectedId !== node.id;
          const selected = selectedId === node.id;
          const sign = node.net > 0 ? '+' : node.net < 0 ? '−' : '';
          const activate = () => { if (!moved.current) onSelect(selected ? null : node); };
          return (
            <g
              key={node.id}
              data-mc-node={node.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${node.name}: ${node.net > 0 ? 'owes you' : node.net < 0 ? 'you owe' : 'settled with you'} ${moneySmart(Math.abs(node.net))}`}
              onClick={activate}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(selected ? null : node); } }}
              style={{
                cursor: 'pointer',
                opacity: dimmed ? 0.35 : 1,
                // Pop from the node's own centre, not the SVG origin.
                transformOrigin: `${node.x}px ${node.y}px`,
                animation: `popIn ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
                animationDelay: `${motionTokens.fast + i * (motionTokens.instant * 0.78)}ms`,
                transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            >
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={isDark ? '#151518' : '#ffffff'}
                stroke={node.colour}
                strokeWidth={selected ? 3.5 : 2}
                filter={selected ? `url(#${uid}-glow)` : undefined}
              />
              {/* Text counter-rotates with the dial, so a spun ring never
                  leaves a name upside down. */}
              <g
                ref={(el) => { labelRefs.current[i] = el; }}
                style={{ transformOrigin: `${node.x}px ${node.y}px`, pointerEvents: 'none' }}
              >
                <text
                  x={node.x} y={node.y + 4} textAnchor="middle"
                  style={{ fill: node.colour, fontSize: 13, fontWeight: 700 }}
                >
                  {node.name.charAt(0).toUpperCase()}
                </text>
                {/* Name and signed amount, always shown: the chart must not
                    depend on colour to say which way the money goes. */}
                <text
                  x={node.x} y={node.y + node.r + 15} textAnchor="middle"
                  style={{ fill: theme.palette.text.primary, fontSize: 11.5, fontWeight: 600 }}
                >
                  {node.name.length > 10 ? `${node.name.slice(0, 9)}…` : node.name}
                </text>
                <text
                  x={node.x} y={node.y + node.r + 29} textAnchor="middle"
                  style={{ fill: node.textColour, fontSize: 11, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}
                >
                  {sign}{moneySmart(Math.abs(node.net))}
                </text>
              </g>
            </g>
          );
        })}

        <style>{`
          @keyframes drawLink { from { stroke-dashoffset: ${ring}; opacity: 0; } }
          @keyframes popIn { from { transform: scale(0.3); opacity: 0; } }
          [data-mc-node]:focus-visible { outline: none; }
          [data-mc-node]:focus-visible circle { stroke-width: 4; }
          @media (prefers-reduced-motion: reduce) {
            line, g, circle { animation: none !important; }
          }
        `}</style>
      </Box>
      </div>
    </Box>
  );
}
