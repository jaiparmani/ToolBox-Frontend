import React from 'react';
import { Box, Typography } from '@mui/material';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { money } from './money';
import { accents } from '../../theme/tokens';

/**
 * Which way one split runs, said four ways at once.
 *
 * The same ExpenseSplit row is "owed to you" for whoever paid and "you owe" for
 * the account the person is linked to, and getting that backwards is the worst
 * mistake the splits surface can make. So direction is carried by colour (mint
 * in, red out), an arrow, a sign and a word — colour is never the only signal,
 * which is also what keeps it readable for anyone who can't separate the hues.
 *
 * Lifted out of SplitsPage so the edit and settle dialogs read a figure the
 * same way the list does, rather than each growing its own arrow.
 */
export const DIRECTION = {
  owed_to_you: {
    color: accents.mint, sign: '+', label: 'owed to you',
    Arrow: SouthWestIcon, arrowLabel: 'Money coming to you',
  },
  you_owe: {
    color: accents.red, sign: '−', label: 'you owe',
    Arrow: NorthEastIcon, arrowLabel: 'Money you owe',
  },
  // A third member's debt, seen by someone who is neither end of it. Red and
  // mint both claim "this is your money"; this is not, so it stays neutral and
  // says who it is actually owed to.
  owed_to_owner: {
    color: 'text.secondary', sign: '', label: 'owed to the group',
    Arrow: SouthWestIcon, arrowLabel: 'Owed to the group owner',
  },
};

export default function SplitAmount({ direction, amount, size = 'body2', label }) {
  const dir = DIRECTION[direction] || DIRECTION.owed_to_you;
  const { Arrow } = dir;
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.4}>
        <Arrow titleAccess={dir.arrowLabel} sx={{ fontSize: 14, color: dir.color }} />
        <Typography
          variant={size}
          sx={{ fontWeight: 700, color: dir.color, fontVariantNumeric: 'tabular-nums' }}
        >
          {dir.sign}{money(Math.abs(amount))}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: dir.color, opacity: 0.85 }}>
        {label || dir.label}
      </Typography>
    </Box>
  );
}
