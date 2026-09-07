import React from 'react';
import { Box, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { accents, motion as motionTokens } from '../../theme/tokens';

/**
 * The wait, as a presence rather than a spinner.
 *
 * These calls take five to fifteen seconds on a free tier, and a bar that fills
 * forever reads as a hang. So the pause says something instead: three motes of
 * light breathe in sequence (a held thought, not a loading loop) beside one of
 * the user's OWN numbers, rotating slowly. Every line here is real — the facts
 * come from the live projection; nothing is invented to fill the silence — and
 * past ten seconds it stops implying progress and admits the queue is slow.
 *
 * Deliberately `aria-hidden`: the assistant's status is announced once, politely,
 * by the panel's live region. Rotating this text into a live region would spam a
 * screen reader with a new sentence every couple of seconds.
 */
export default function AssistantThinking({ facts = [], reduce: reduceProp }) {
  const sysReduce = useReducedMotion();
  const reduce = reduceProp ?? !!sysReduce;

  const [idx, setIdx] = React.useState(0);
  const [slow, setSlow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (facts.length < 2) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % facts.length), 3200);
    return () => clearInterval(id);
  }, [facts.length]);

  const line = slow
    ? 'Still going — the model queue is slow right now.'
    : facts.length
      ? facts[idx % facts.length]
      : 'Reading your numbers…';

  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        alignSelf: 'flex-start', maxWidth: '92%',
        px: 1.5, py: 1.1, borderRadius: 3,
        border: '1px solid', borderColor: `${accents.violet}33`,
        background: `linear-gradient(120deg, ${accents.violet}12, transparent 78%)`,
        '@keyframes asstMote': {
          '0%, 100%': { opacity: 0.25, transform: 'scale(0.7)' },
          '45%': { opacity: 1, transform: 'scale(1)' },
        },
        '@keyframes asstFactIn': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      {/* Three motes of light — transform/opacity only, staggered like a held breath. */}
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7, height: 7, borderRadius: '50%',
              background: [accents.violet, accents.cyan, accents.blue][i],
              boxShadow: `0 0 8px ${[accents.violet, accents.cyan, accents.blue][i]}aa`,
              willChange: reduce ? undefined : 'transform, opacity',
              // Reduced motion keeps the motes lit and still — the meaning is
              // carried by the words beside them either way.
              opacity: reduce ? 0.75 : undefined,
              animation: reduce ? 'none' : `asstMote 1.4s ${motionTokens.ease} ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: accents.violet, letterSpacing: '0.02em' }}>
          Thinking
        </Typography>
        <Typography
          key={line}
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            animation: reduce ? 'none' : `asstFactIn ${motionTokens.normal}ms ${motionTokens.ease} both`,
          }}
        >
          {line}
        </Typography>
      </Box>
    </Box>
  );
}
