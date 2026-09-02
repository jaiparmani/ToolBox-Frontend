import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BottomSheet from './BottomSheet';
import { money } from './money';
import { accents, type, motion } from '../../theme/tokens';

// Text sitting on the mint accent needs a fixed dark ink in BOTH themes — a
// role token would flip to light in light mode and vanish against the accent.
const ON_MINT = '#062018';

/**
 * The reassuring confirm-and-seal step for settling one person's balance.
 *
 * It states who and exactly how much before anything moves, then — on the real
 * settle — flips to a flat "done" seal keyed to the amount the server actually
 * cleared, so the celebration can never claim a figure the API didn't return.
 *
 * Restrained by design: dark ground, hairline surfaces, a single mint accent
 * for the positive act, monochrome everywhere else. Transform/opacity only, and
 * it composes one still frame under reduced motion.
 */
export default function SettleConfirmSheet({ open, person, status, onConfirm, onClose }) {
  const owedByMe = person ? person.net < 0 : false;
  const amount = person ? Math.abs(person.net) : 0;
  const unsettled = person?.unsettled || 0;
  const { settling = false, done = false, doneTotal = 0, error = null } = status || {};

  return (
    <BottomSheet open={open} onClose={settling ? undefined : onClose} maxWidth={420}>
      {person && (done ? (
        <SettleDone name={person.name} total={doneTotal} />
      ) : (
        <Box sx={{ pt: 0.5 }} role="group" aria-label={`Settle up with ${person.name}`}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
            {owedByMe ? 'You’re paying' : 'Marking as received'}
          </Typography>

          <Typography sx={{ mt: 0.25, fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.01em' }} noWrap>
            {person.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {owedByMe ? 'settles what you owe them' : 'settles what they owe you'}
            {unsettled ? ` · ${unsettled} ${unsettled === 1 ? 'bill' : 'bills'}` : ''}
          </Typography>

          {/* The figure — monochrome and exact, so nothing is in doubt */}
          <Box
            sx={{
              mt: 2, mb: 2.5, py: 2.5, px: 2, textAlign: 'center',
              border: '1px solid', borderColor: 'divider', borderRadius: '14px',
              bgcolor: 'action.hover',
            }}
          >
            <Typography
              sx={{
                fontFamily: type.displayFamily, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
                fontSize: 'clamp(2.2rem, 9vw, 2.9rem)', lineHeight: 1,
              }}
            >
              {money(amount)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              {owedByMe
                ? `Mark your debt to ${person.name} as paid`
                : `Clears ${person.name}’s balance to zero`}
            </Typography>
          </Box>

          {error && (
            <Typography role="alert" variant="body2" sx={{ color: accents.red, textAlign: 'center', mb: 1.5 }}>
              {error}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5}>
            <Button
              fullWidth variant="text" color="inherit"
              onClick={onClose} disabled={settling}
              startIcon={<CloseRoundedIcon />}
            >
              Cancel
            </Button>
            <Button
              fullWidth variant="contained"
              onClick={onConfirm} disabled={settling}
              startIcon={settling ? null : <DoneAllIcon />}
              sx={{
                bgcolor: accents.mint, color: ON_MINT, fontWeight: 700, boxShadow: 'none',
                '&:hover': { bgcolor: accents.mint, opacity: 0.92, boxShadow: 'none' },
                '&.Mui-disabled': { bgcolor: accents.mint, color: ON_MINT, opacity: 0.55 },
              }}
            >
              {settling ? 'Settling…' : error ? 'Try again' : owedByMe ? 'Mark as paid' : 'Confirm settle'}
            </Button>
          </Stack>
        </Box>
      ))}
    </BottomSheet>
  );
}

/** The flat, tactile seal shown once the real settle lands. */
function SettleDone({ name, total }) {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }} role="status" aria-live="polite">
      <Box
        aria-hidden
        sx={{
          width: 76, height: 76, mx: 'auto', mb: 2, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          border: '2px solid', borderColor: accents.mint, color: accents.mint,
          animation: `settleSeal ${motion.slow}ms ${motion.emphasis} both`,
          '@keyframes settleSeal': {
            from: { opacity: 0, transform: 'scale(0.6)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <CheckRoundedIcon sx={{ fontSize: 40 }} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.15rem' }}>Settled up</Typography>
      <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
        {money(total)} with {name}
      </Typography>
    </Box>
  );
}
