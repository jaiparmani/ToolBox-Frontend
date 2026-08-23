import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
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
 *  - Every node is labelled. No legend, because nothing here is identified by
 *    colour alone.
 */
export default function MoneyConstellation({ people, selectedId, onSelect, centreLabel = 'You' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const flow = isDark ? chart.flow.dark : chart.flow.light;
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

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
      };
    });
  }, [people, centre, ring, compact, flow]);

  if (!nodes.length) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
      <Box
        component="svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Money owed between you and ${nodes.length} people`}
        sx={{ width: '100%', maxWidth: size, height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <filter id="flowGlow" x="-50%" y="-50%" width="200%" height="200%">
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
                animationDelay: `${i * 70}ms`,
                transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            />
          );
        })}

        {/* You */}
        <circle
          cx={centre} cy={centre} r={compact ? 30 : 36}
          fill={theme.palette.primary.main}
          filter="url(#flowGlow)"
          style={{ animation: `pulseCentre 3.5s ${motionTokens.ease} infinite` }}
        />
        <text
          x={centre} y={centre + 5} textAnchor="middle"
          style={{ fill: '#fff', fontSize: compact ? 13 : 15, fontWeight: 650, pointerEvents: 'none' }}
        >
          {centreLabel}
        </text>

        {nodes.map((node, i) => {
          const dimmed = selectedId && selectedId !== node.id;
          const selected = selectedId === node.id;
          const sign = node.net > 0 ? '+' : node.net < 0 ? '−' : '';
          return (
            <g
              key={node.id}
              onClick={() => onSelect(selected ? null : node)}
              style={{
                cursor: 'pointer',
                opacity: dimmed ? 0.35 : 1,
                transformOrigin: `${node.x}px ${node.y}px`,
                animation: `popIn ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
                animationDelay: `${120 + i * 70}ms`,
                transition: `opacity ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            >
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={isDark ? '#151518' : '#ffffff'}
                stroke={node.colour}
                strokeWidth={selected ? 3.5 : 2}
                filter={selected ? 'url(#flowGlow)' : undefined}
              />
              <text
                x={node.x} y={node.y + 4} textAnchor="middle"
                style={{ fill: node.colour, fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}
              >
                {node.name.charAt(0).toUpperCase()}
              </text>
              {/* Name and signed amount, always shown: the chart must not
                  depend on colour to say which way the money goes. */}
              <text
                x={node.x} y={node.y + node.r + 15} textAnchor="middle"
                style={{
                  fill: theme.palette.text.primary, fontSize: 11.5, fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                {node.name.length > 10 ? `${node.name.slice(0, 9)}…` : node.name}
              </text>
              <text
                x={node.x} y={node.y + node.r + 29} textAnchor="middle"
                style={{
                  fill: node.colour, fontSize: 11, fontWeight: 650,
                  fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
                }}
              >
                {sign}{moneySmart(Math.abs(node.net))}
              </text>
            </g>
          );
        })}

        <style>{`
          @keyframes drawLink { from { stroke-dashoffset: ${ring}; opacity: 0; } }
          @keyframes popIn { from { transform: scale(0.3); opacity: 0; } }
          @keyframes pulseCentre {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.82; }
          }
          @media (prefers-reduced-motion: reduce) {
            line, g, circle { animation: none !important; }
          }
        `}</style>
      </Box>
    </Box>
  );
}
