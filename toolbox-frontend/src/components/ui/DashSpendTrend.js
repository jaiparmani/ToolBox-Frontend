import React from 'react';
import { Box, Typography } from '@mui/material';
import { accents, type } from '../../theme/tokens';
import { money, moneySmart } from './money';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);

/**
 * Six months of spend, so the current month sits in context.
 *
 * Pure fact: each bar is one month's total (`total_amount`, your netted share —
 * the same figure the hero shows for the current month). The current month is
 * still in progress, so it's drawn as a solid "you are here" bar labelled "so
 * far" and is deliberately excluded from the average, which is taken over
 * completed months only. Renders nothing until at least three months carry real
 * spend — one or two points isn't a trend.
 */
export default function DashSpendTrend({ months = [] }) {
  const data = (months || []).filter((m) => m && m.ok !== false);
  const withSpend = data.filter((m) => m.total > 0);
  if (data.length < 4 || withSpend.length < 3) return null;

  const completed = data.filter((m) => !m.partial);
  const max = Math.max(...data.map((m) => m.total)) || 1;
  const avg = completed.length ? completed.reduce((s, m) => s + m.total, 0) / completed.length : 0;
  const avgPct = avg > 0 ? Math.max(0, Math.min(100, (avg / max) * 100)) : 0;

  return (
    <Box
      role="group"
      aria-label={`Monthly spend over the last ${data.length} months. ${completed.length > 0 ? `Average ${money(avg)} per completed month.` : ''}`}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, gap: 1 }}>
        <Eyebrow>6-month trend</Eyebrow>
        {avg > 0 && (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
            avg <Box component="span" sx={{ ...num, color: 'text.primary', fontWeight: 600 }}>{money(avg)}</Box> / mo
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative' }}>
        {/* average reference across completed months — positioned against the fixed 70px bar track (label row 11px + 4.8px gap sit above it), so it lines up exactly with the bars regardless of label content */}
        {avgPct > 0 && (
          <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, top: `${(11 + 4.8 + (1 - avgPct / 100) * 70).toFixed(1)}px`, height: 0, borderTop: '1px dashed', borderColor: 'divider', zIndex: 1 }} />
        )}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1 } }}>
          {data.map((m, i) => {
            const h = m.total > 0 ? Math.max(6, (m.total / max) * 100) : 2;
            const cur = m.partial;
            return (
              <Box key={i} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6 }}>
                {/* fixed-height label row, independent of the bar track below, so the tallest bar's own value never gets pushed out the top */}
                <Typography sx={{ ...num, fontSize: 9, height: 11, lineHeight: '11px', color: cur ? 'text.primary' : 'text.disabled', fontWeight: cur ? 650 : 500, visibility: m.total > 0 ? 'visible' : 'hidden' }} noWrap>
                  {moneySmart(m.total)}
                </Typography>
                <Box sx={{ width: '100%', height: 70, display: 'flex', alignItems: 'flex-end', zIndex: 2 }}>
                  <Box
                    title={`${m.label}${cur ? ' (so far)' : ''} · ${money(m.total)}`}
                    sx={{
                      width: '100%', height: `${h}%`, borderRadius: '5px 5px 3px 3px',
                      bgcolor: m.total <= 0 ? 'action.hover' : cur ? GREEN : `${GREEN}33`,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 10, color: cur ? 'text.secondary' : 'text.disabled', fontWeight: cur ? 600 : 500, letterSpacing: '0.02em' }} noWrap>{m.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: GREEN }} />
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>this month so far</Typography>
        </Box>
        {avg > 0 && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>- - avg / mo</Typography>
        )}
      </Box>

      {/* text path to every real figure, for assistive tech */}
      <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', m: -0.125, p: 0 }}>
        {data.map((m, i) => (
          <li key={i}>{m.label}{m.partial ? ' (so far)' : ''}: {moneySmart(m.total)}</li>
        ))}
      </Box>
    </Box>
  );
}
