import React from 'react';
import { Box, Typography } from '@mui/material';
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
  const w = deriveWeather({ projection, pulse });
  const Icon = w.icon;

  if (loading) {
    return <Box sx={{ height: compact ? 30 : 56, borderRadius: compact ? 999 : 2.5, border: '1px solid', borderColor: 'divider', opacity: 0.5, ...sx }} />;
  }

  if (compact) {
    return (
      <Box
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        aria-label={`Financial weather: ${w.label}. ${w.reason}`}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5,
          borderRadius: 999, border: '1px solid', borderColor: 'divider',
          cursor: onClick ? 'pointer' : 'default', ...sx,
        }}
      >
        <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: w.color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>{w.label}</Typography>
      </Box>
    );
  }

  // Restrained band: a flat hairline surface. Colour is carried only by a small
  // status icon and the label — no gradient wash, particles, or glow.
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`Financial weather: ${w.label}. ${w.reason}`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
        borderRadius: 2.5, border: '1px solid', borderColor: 'divider',
        backgroundColor: 'background.paper',
        cursor: onClick ? 'pointer' : 'default', ...sx,
      }}
    >
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${w.color}1a`,
      }}>
        <Icon sx={{ fontSize: 18, color: w.color }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: w.color }}>
          {w.label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.25 }} noWrap>
          {w.reason}
        </Typography>
      </Box>
    </Box>
  );
}
