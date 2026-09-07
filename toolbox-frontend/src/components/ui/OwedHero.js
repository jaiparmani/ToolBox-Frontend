import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { accents, chart, motion as motionTokens } from '../../theme/tokens';
import AnimatedNumber from './AnimatedNumber';
import { money, moneySmart } from './money';

/**
 * The dashboard's money headline: a ring, not the full constellation.
 *
 * The constellation is the splits page's job and looked sparse here with only a
 * couple of people. This is compact and reads at a glance: a ring split into
 * what's owed to you (cool) and what you owe (warm), the net figure counting up
 * in the middle, and a little stack of the people beneath it.
 *
 * The ring is not two blocks of colour — it is subdivided per person, each
 * segment's arc length being that person's share of the side they sit on. So
 * "you're owed ₹4,000" also shows whether that's one big debt or six small
 * ones, which is a different situation. Every figure is printed underneath, and
 * the whole ring is described in text for screen readers.
 *
 * The arcs draw themselves in on mount and settle. Everything degrades behind
 * prefers-reduced-motion; the card is a real button, reachable by keyboard.
 */
export default function OwedHero({ people, totalOwed, totalYouOwe, net, onOpen }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const flow = isDark ? chart.flow.dark : chart.flow.light;
  const uid = React.useId().replace(/:/g, '');

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

  // Per-person segments: each side of the ring is cut up in proportion to who
  // makes it up. Sorted biggest-first so the ring reads like the list does.
  const segments = React.useMemo(() => {
    const list = people || [];
    const side = (sign) => list
      .filter(p => (sign > 0 ? p.net > 0 : p.net < 0))
      .map(p => ({ id: p.id, name: p.name, amount: Math.abs(p.net) }))
      .sort((a, b) => b.amount - a.amount);
    const owed = side(1), owes = side(-1);
    const out = [];
    // Owed-to-you runs from the top; you-owe starts after the gap.
    let cursor = 0;
    owed.forEach((p) => {
      const frac = totalOwed > 0 ? (p.amount / totalOwed) * owedFrac : 0;
      out.push({ ...p, side: 'in', offset: cursor, frac });
      cursor += frac;
    });
    cursor = owedFrac + gap;
    owes.forEach((p) => {
      const frac = totalYouOwe > 0 ? (p.amount / totalYouOwe) * oweFrac : 0;
      out.push({ ...p, side: 'out', offset: cursor, frac });
      cursor += frac;
    });
    const kept = out.filter(s => s.frac > 0);
    // If the totals arrive without a per-person breakdown, fall back to the two
    // whole arcs rather than drawing an empty ring — the totals are still real.
    if (!kept.length) {
      if (totalOwed > 0) kept.push({ id: 'all-in', name: 'Everyone', whole: true, amount: totalOwed, side: 'in', offset: 0, frac: owedFrac });
      if (totalYouOwe > 0) kept.push({ id: 'all-out', name: 'Everyone', whole: true, amount: totalYouOwe, side: 'out', offset: owedFrac + gap, frac: oweFrac });
    }
    return kept;
  }, [people, totalOwed, totalYouOwe, owedFrac, oweFrac]);

  // Up to five people shown as a stack; the rest fold into a "+N".
  const shown = (people || []).slice(0, 5);
  const extra = Math.max((people || []).length - shown.length, 0);

  const summary = (people || []).length === 0
    ? 'All settled.'
    : `${netPositive ? "You're owed" : 'You owe'} ${money(Math.abs(net))} overall. ` +
      `${totalOwed > 0 ? `${money(totalOwed)} owed to you. ` : ''}${totalYouOwe > 0 ? `${money(totalYouOwe)} you owe. ` : ''}` +
      `Across ${(people || []).length} ${(people || []).length === 1 ? 'person' : 'people'}. Open splits.`;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={summary}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } }}
      sx={{
        position: 'relative', cursor: 'pointer', textAlign: 'center',
        py: 3, px: 2, borderRadius: 5, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        transition: `transform ${motionTokens.normal}ms ${motionTokens.ease}`,
        '&:hover': { transform: 'translateY(-3px)' },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
        '&::before': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at 50% 20%, ${alpha(heroColour, 0.16)}, transparent 60%)`,
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
          aria-hidden
          sx={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={flow.owedToYou} />
              <stop offset="1" stopColor={isDark ? accents.cyan : chart.sequential.light} />
            </linearGradient>
            <linearGradient id={`${uid}-out`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={flow.youOwe} />
              <stop offset="1" stopColor={accents.amber} />
            </linearGradient>
          </defs>
          {/* track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={isDark ? alpha('#ffffff', 0.06) : alpha('#000000', 0.06)} strokeWidth={stroke} />

          {/* one arc per person — length is that person's share of their side */}
          {segments.map((seg, i) => (
            <circle
              key={`${seg.side}-${seg.id}`}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={`url(#${uid}-${seg.side})`}
              strokeWidth={stroke}
              strokeLinecap={segments.length > 1 ? 'butt' : 'round'}
              // A hairline of the track shows between neighbours, so six small
              // debts never read as one large one.
              strokeDasharray={`${Math.max(seg.frac * c - (segments.length > 1 ? 2.5 : 0), 0.5)} ${c}`}
              strokeDashoffset={-seg.offset * c}
              style={{
                animation: `drawArc ${motionTokens.slow}ms ${motionTokens.ease} both`,
                animationDelay: `${i * (motionTokens.instant * 0.7)}ms`,
              }}
            />
          ))}
        </Box>

        {/* Centre figure */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            sx={{
              fontWeight: 700, letterSpacing: '-0.03em', fontSize: '2.1rem', lineHeight: 1, color: heroColour,
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
                title={`${p.name}: ${p.net >= 0 ? 'owes you' : 'you owe'} ${moneySmart(Math.abs(p.net))}`}
                sx={{
                  width: 34, height: 34, borderRadius: '50%', ml: i === 0 ? 0 : '-9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                  border: '2px solid', borderColor: 'background.paper',
                  background: p.net >= 0
                    ? `linear-gradient(135deg, ${flow.owedToYou}, ${isDark ? accents.cyan : chart.sequential.light})`
                    : `linear-gradient(135deg, ${flow.youOwe}, ${accents.amber})`,
                  animation: `avatarIn ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
                  animationDelay: `${motionTokens.normal + i * (motionTokens.instant * 0.7)}ms`,
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

      {/* Every segment's real figure, in text — the ring is a second reading of
          these, never the only one. */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -1, p: 0 }}>
        {segments.map((seg) => (
          <li key={`sr-${seg.side}-${seg.id}`}>
            {seg.name}: {seg.side === 'in' ? (seg.whole ? 'owes you in total' : 'owes you') : (seg.whole ? 'you owe in total' : 'you owe')} {money(seg.amount)}
          </li>
        ))}
      </Box>

      <style>{`
        @keyframes drawArc { from { stroke-dasharray: 0 ${c}; } }
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
