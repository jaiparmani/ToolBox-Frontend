import React from 'react';
import { Box, Typography } from '@mui/material';
import { money, moneySmart } from './money';

const DONUT_SHADES = ['#35c98a', '#2ba377', '#3f6f5c', '#4a4a52', '#33333a', '#2a2a30'];

export default function CategoryDonut({ cats, size = 120 }) {
  const items = (cats || []).map((c) => ({ name: c.name, amount: Math.abs(Number(c.amount || 0)), color: c.color }))
    .filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = items.reduce((s, c) => s + c.amount, 0);
  if (!total) {
    return <Box sx={{ py: 3, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>No spending yet this month</Typography>
      <Typography sx={{ fontSize: 12, mt: 0.5, color: 'text.disabled' }}>Add an expense and the breakdown appears here.</Typography>
    </Box>;
  }
  const top = items.slice(0, 5);
  const otherAmt = items.slice(5).reduce((s, c) => s + c.amount, 0);
  const segs = otherAmt > 0 ? [...top, { name: 'Other', amount: otherAmt }] : top;
  let acc = 25; const R = 15.9, C = 2 * Math.PI * R;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <svg width={size} height={size} viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {segs.map((s, i) => {
          const len = (s.amount / total) * 100; const dash = `${(len / 100) * C} ${C}`; const off = (acc / 100) * C; acc -= len;
          return <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={DONUT_SHADES[i]} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={off} transform="rotate(-90 21 21)" />;
        })}
        <text x="21" y="19.5" textAnchor="middle" fill="#f5f5f6" fontSize="4.6" fontWeight="600" fontFamily="sans-serif">{moneySmart(total)}</text>
        <text x="21" y="24.5" textAnchor="middle" fill="#77777f" fontSize="2.5" fontFamily="sans-serif">this month</text>
      </svg>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        {segs.map((s, i) => {
          const pct = (s.amount / total) * 100;
          return (
            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: DONUT_SHADES[i] }} />
                <Typography sx={{ flex: 1, fontSize: 12.5, color: 'text.secondary' }} noWrap>{s.name}</Typography>
                <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'text.primary', fontWeight: 550 }}>{money(s.amount)}</Typography>
                <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'text.disabled', width: 34, textAlign: 'right' }}>{Math.round(pct)}%</Typography>
              </Box>
              <Box aria-hidden sx={{ height: 3, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${Math.max(2, pct)}%`, borderRadius: 999, bgcolor: DONUT_SHADES[i] }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
