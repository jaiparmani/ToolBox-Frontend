import React from 'react';
import { Box, Typography } from '@mui/material';
import { money } from './money';
import { accents, type } from '../../theme/tokens';

const GREEN = accents.mint;
const num = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' };
const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 } };

export default function DashCategoryMovers({ current = [], previous = [] }) {
  const movers = React.useMemo(() => {
    const cur = new Map();
    for (const c of current) {
      const name = c.category__name || c.name;
      if (name) cur.set(name, (cur.get(name) || 0) + (Number(c.total || c.amount) || 0));
    }
    const prev = new Map();
    for (const c of previous) {
      const name = c.category__name || c.name;
      if (name) prev.set(name, (prev.get(name) || 0) + (Number(c.total || c.amount) || 0));
    }

    const allNames = new Set([...cur.keys(), ...prev.keys()]);
    const changes = [];
    for (const name of allNames) {
      const c = cur.get(name) || 0;
      const p = prev.get(name) || 0;
      const diff = c - p;
      if (Math.abs(diff) < 1) continue;
      const pct = p > 0 ? (diff / p) * 100 : (c > 0 ? 100 : 0);
      changes.push({ name, current: c, previous: p, diff, pct });
    }
    changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    return changes.slice(0, 4);
  }, [current, previous]);

  if (movers.length === 0) return null;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>Category movers</Typography>
      {movers.map((m, i, arr) => {
        const up = m.diff > 0;
        return (
          <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.85,
            borderBottom: i === arr.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.75, fontWeight: 550 }} noWrap>{m.name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
                {money(m.previous)} → {money(m.current)}
              </Typography>
            </Box>
            <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600, color: up ? accents.amber : GREEN }} noWrap>
              {up ? '↑' : '↓'} {money(Math.abs(m.diff))}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
