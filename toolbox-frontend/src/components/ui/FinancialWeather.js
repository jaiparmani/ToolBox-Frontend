import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import ThunderstormRoundedIcon from '@mui/icons-material/ThunderstormRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import { accents } from '../../theme/tokens';
import { money } from './money';

/**
 * Financial Weather — an ambient read on the *climate* of your money, one layer
 * up from any single number. It maps real conditions (runway, bills ahead,
 * recent spend vs. usual) onto a small weather metaphor so the app can carry a
 * quiet, consistent mood across every screen.
 *
 * It is derived, transparent, and honest: every condition comes with the plain
 * reason and the numbers behind it, and it never claims to know your real bank
 * balance. Reduced-motion collapses the animation to a still icon.
 */

export const WEATHER = {
  clear: { key: 'clear', label: 'Clear skies', color: accents.mint, icon: WbSunnyRoundedIcon },
  tailwind: { key: 'tailwind', label: 'Tailwind', color: accents.cyan, icon: AirRoundedIcon },
  pressure: { key: 'pressure', label: 'Light pressure', color: accents.amber, icon: CloudQueueRoundedIcon },
  storm: { key: 'storm', label: 'Storm approaching', color: accents.red, icon: ThunderstormRoundedIcon },
};

/**
 * Derive the condition from the projection + pulse the dashboard already holds.
 * Returns { ...WEATHER[x], reason } — pure, no fetching. Safe with nulls.
 */
export function deriveWeather({ projection, pulse } = {}) {
  const runway = projection?.runway_days;
  const bills = projection?.upcoming_bills || 0;
  const lowPoint = projection?.projected_low?.balance;
  const status = pulse?.status;

  // Storm: the balance is projected to run out (or nearly) inside the window.
  if (status === 'attention' || (runway != null && runway <= 7) || (lowPoint != null && lowPoint < 0)) {
    const bits = [];
    if (runway != null) bits.push(`about ${runway} day${runway === 1 ? '' : 's'} of runway`);
    if (bills > 0) bits.push(`${money(bills)} in bills ahead`);
    return { ...WEATHER.storm, reason: bits.length ? `You have ${bits.join(' and ')}.` : 'Your projected balance runs low soon.' };
  }
  // Tailwind: an opportunity — income landing, comfortable room.
  if (status === 'opportunity') {
    return { ...WEATHER.tailwind, reason: projection?.upcoming_income > 0
      ? `${money(projection.upcoming_income)} of income is on the way with room to spare.`
      : 'You have comfortable room and spending is easing.' };
  }
  // Light pressure: watchful, or bills are gathering on the horizon.
  if (status === 'watchful' || bills > 0) {
    return { ...WEATHER.pressure, reason: bills > 0
      ? `${money(bills)} in bills is coming up${runway != null ? ` — roughly ${runway} days of runway.` : '.'}`
      : 'Spending is running a little above your usual pace.' };
  }
  return { ...WEATHER.clear, reason: runway != null
    ? `Comfortable runway (~${runway} days) and nothing unusual ahead.`
    : 'Nothing unusual on the horizon.' };
}

/**
 * The full ambient band for the top of a screen. `compact` renders an inline
 * pill instead (for headers / other screens). `onClick` is optional.
 */
export default function FinancialWeather({ projection, pulse, loading, compact, onClick, sx }) {
  const theme = useTheme();
  const w = deriveWeather({ projection, pulse });
  const Icon = w.icon;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (loading) {
    return <Box sx={{ height: compact ? 30 : 52, borderRadius: 999, border: '1px solid', borderColor: 'divider', opacity: 0.5, ...sx }} />;
  }

  if (compact) {
    return (
      <Box
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        aria-label={`Financial weather: ${w.label}. ${w.reason}`}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5,
          borderRadius: 999, border: '1px solid', borderColor: `${w.color}55`,
          backgroundColor: `${w.color}14`, cursor: onClick ? 'pointer' : 'default', ...sx,
        }}
      >
        <Icon sx={{ fontSize: 15, color: w.color }} />
        <Typography variant="caption" sx={{ fontWeight: 650, color: w.color, whiteSpace: 'nowrap' }}>{w.label}</Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`Financial weather: ${w.label}. ${w.reason}`}
      sx={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
        borderRadius: 3, border: '1px solid', borderColor: `${w.color}44`,
        background: `linear-gradient(100deg, ${w.color}1f, transparent 70%)`,
        cursor: onClick ? 'pointer' : 'default', ...sx,
      }}
    >
      {/* drifting particles — subtle, motion-gated */}
      {!reduce && (
        <Box aria-hidden sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          background: `radial-gradient(1.5px 1.5px at 20% 40%, ${w.color}, transparent), radial-gradient(1.5px 1.5px at 60% 70%, ${w.color}, transparent), radial-gradient(1.5px 1.5px at 85% 30%, ${w.color}, transparent)`,
          backgroundSize: '180px 100%',
          animation: 'weatherDrift 14s linear infinite',
          '@keyframes weatherDrift': { from: { backgroundPositionX: '0px' }, to: { backgroundPositionX: '180px' } },
        }} />
      )}
      <Box sx={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${w.color}22`, boxShadow: `0 0 18px ${w.color}44`,
      }}>
        <Icon sx={{ fontSize: 20, color: w.color }} />
      </Box>
      <Box sx={{ minWidth: 0, position: 'relative' }}>
        <Typography variant="caption" sx={{ fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', color: w.color }}>
          {w.label}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.25 }} noWrap>
          {w.reason}
        </Typography>
      </Box>
    </Box>
  );
}
