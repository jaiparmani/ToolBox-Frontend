import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { chart } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';
import { money } from './money';

/**
 * The dashboard's money headline: a ring, not the full constellation.
 *
 * The constellation is the splits page's job and looked sparse here with only a
 * couple of people. This is compact and reads at a glance: a progress ring
 * split into what's owed to you (cool) and what you owe (warm), the net figure
 * counting up in the middle, and a little stack of the people beneath it.
 *
 * The arcs draw themselves in on mount, and a slow shimmer sweeps the ring so
 * it feels alive rather than a static gauge. Everything settles behind
 * prefers-reduced-motion.
 */
export default function OwedHero({ people, totalOwed, totalYouOwe, net, onOpen }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const flow = isDark ? chart.flow.dark : chart.flow.light;

  const size = 232;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const total = Math.max(totalOwed + totalYouOwe, 1);
  const gap = 0.06; // fraction of the circle left blank between the two arcs
  const owedFrac = (totalOwed / total) * (1 - gap * 2);
  const oweFrac = (totalYouOwe / total) * (1 - gap * 2);

  const netPositive = net >= 0;
  const heroColour = netPositive ? flow.owedToYou : flow.youOwe;

  // Up to five people shown as a stack; the rest fold into a "+N".
  const shown = (people || []).slice(0, 5);
  const extra = Math.max((people || []).length - shown.length, 0);

  return (
    <Box
      onClick={onOpen}
      sx={{
        position: 'relative', cursor: 'pointer', textAlign: 'center',
        py: 3, px: 2, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        transition: 'transform 0.25s ease',
        '&:hover': { transform: 'translateY(-3px)' },
        '&::before': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          background: netPositive
            ? 'radial-gradient(circle at 50% 20%, rgba(57,135,229,0.16), transparent 60%)'
            : 'radial-gradient(circle at 50% 20%, rgba(217,79,61,0.16), transparent 60%)',
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ position: 'relative', mb: 1.5 }}>
        <Typography variant="overline" color="text.secondary">
          {(people || []).length === 0 ? 'All settled' : netPositive ? "You're owed overall" : 'You owe overall'}
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'text.secondary' }}>
          <Typography variant="button" sx={{ fontWeight: 600 }}>Open</Typography>
          <ArrowForwardIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>

      {/* Ring */}
      <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
        <Box
          component="svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          sx={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="owedArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={flow.owedToYou} />
              <stop offset="1" stopColor={isDark ? '#64D2FF' : '#2a78d6'} />
            </linearGradient>
          </defs>
          <defs>
            <linearGradient id="shimmerArc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={heroColour} stopOpacity="0" />
              <stop offset="1" stopColor={heroColour} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={stroke} />
          {/* a bright short arc that sweeps the ring forever - the 'alive' touch */}
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="url(#shimmerArc)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * 0.12} ${c}`}
            style={{
              transformOrigin: '50% 50%',
              animation: 'sweep 3.8s linear infinite',
              mixBlendMode: isDark ? 'screen' : 'multiply',
            }}
          />
          {/* owed-to-you arc */}
          {owedFrac > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke="url(#owedArc)" strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${owedFrac * c} ${c}`}
              strokeDashoffset={0}
              style={{ animation: 'drawArc 900ms cubic-bezier(0.32,0.72,0,1) both' }}
            />
          )}
          {/* you-owe arc, offset to sit after the owed arc + gap */}
          {oweFrac > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={flow.youOwe} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${oweFrac * c} ${c}`}
              strokeDashoffset={-(owedFrac + gap) * c}
              style={{ animation: 'drawArc 900ms cubic-bezier(0.32,0.72,0,1) 120ms both' }}
            />
          )}
        </Box>

        {/* Centre figure */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            sx={{
              fontWeight: 700, letterSpacing: '-0.03em', fontSize: '2.1rem', lineHeight: 1, color: heroColour,
              animation: 'glowPulse 3.8s ease-in-out infinite',
              '@keyframes glowPulse': {
                '0%, 100%': { textShadow: `0 0 0px ${heroColour}00` },
                '50%': { textShadow: `0 0 18px ${heroColour}66` },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            <AnimatedNumber value={Math.abs(net)} />
          </Typography>
          {(totalOwed > 0 || totalYouOwe > 0) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
              {netPositive ? 'net in your favour' : 'net you owe'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* People stack + legend */}
      {shown.length > 0 && (
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Box display="flex" justifyContent="center" alignItems="center">
            {shown.map((p, i) => (
              <Box
                key={p.id}
                sx={{
                  width: 34, height: 34, borderRadius: '50%', ml: i === 0 ? 0 : '-9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                  border: '2px solid', borderColor: 'background.paper',
                  background: p.net >= 0
                    ? `linear-gradient(135deg, ${flow.owedToYou}, ${isDark ? '#64D2FF' : '#2a78d6'})`
                    : `linear-gradient(135deg, ${flow.youOwe}, #FF9F0A)`,
                  animation: `avatarIn 420ms cubic-bezier(0.34,1.56,0.64,1) both`,
                  animationDelay: `${300 + i * 70}ms`,
                  zIndex: shown.length - i,
                  '@keyframes avatarIn': { from: { opacity: 0, transform: 'scale(0.4)' }, to: { opacity: 1, transform: 'none' } },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </Box>
            ))}
            {extra > 0 && (
              <Box sx={{ width: 34, height: 34, borderRadius: '50%', ml: '-9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', border: '2px solid', borderColor: 'background.paper', backgroundColor: 'action.selected' }}>
                +{extra}
              </Box>
            )}
          </Box>
          <Box display="flex" justifyContent="center" gap={2} sx={{ mt: 1.5 }}>
            {totalOwed > 0 && <Legend colour={flow.owedToYou} label={`${money(totalOwed)} to you`} />}
            {totalYouOwe > 0 && <Legend colour={flow.youOwe} label={`${money(totalYouOwe)} you owe`} />}
          </Box>
        </Box>
      )}

      <style>{`
        @keyframes drawArc { from { stroke-dasharray: 0 ${c}; } }
        @keyframes sweep { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
      `}</style>
    </Box>
  );
}

function Legend({ colour, label }) {
  return (
    <Box display="flex" alignItems="center" gap={0.75}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colour }} />
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
