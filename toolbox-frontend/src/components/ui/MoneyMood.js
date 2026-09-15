import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

const MOODS = [
  { key: 'great', emoji: '😄', label: 'great' },
  { key: 'good',  emoji: '🙂', label: 'good' },
  { key: 'okay',  emoji: '😐', label: 'okay' },
  { key: 'meh',   emoji: '😕', label: 'meh' },
  { key: 'bad',   emoji: '😔', label: 'bad' },
];

const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const storageKey = () => `money_mood_${toLocalDateStr(new Date())}`;

function readMoodFromStorage() {
  try {
    return localStorage.getItem(storageKey()) || null;
  } catch {
    return null;
  }
}

function saveMoodToStorage(moodKey) {
  try {
    localStorage.setItem(storageKey(), moodKey);
  } catch { /* storage unavailable — degrade silently */ }
}

/**
 * MoneyMood
 *
 * Daily financial feeling — tap once a day to record how you feel about
 * today's spending. Stored in localStorage under money_mood_YYYY-MM-DD.
 * Purely client-side; no API call required.
 */
export default function MoneyMood() {
  const [selected, setSelected] = useState(() => readMoodFromStorage());
  const [noted, setNoted] = useState(false);
  const notedTimerRef = React.useRef(null);

  const handleSelect = (moodKey) => {
    saveMoodToStorage(moodKey);
    setSelected(moodKey);
    if (notedTimerRef.current) clearTimeout(notedTimerRef.current);
    setNoted(true);
    notedTimerRef.current = setTimeout(() => {
      setNoted(false);
      notedTimerRef.current = null;
    }, 1500);
  };

  const selectedMood = MOODS.find((m) => m.key === selected);

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Caption row */}
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75 }}>
        {selected
          ? noted
            ? 'Noted ✓'
            : `Feeling ${selectedMood?.label} about today’s spending`
          : 'How do you feel about today?'}
      </Typography>

      {/* Emoji row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {MOODS.map((mood) => {
          const isSelected = selected === mood.key;
          return (
            <Box
              key={mood.key}
              role="button"
              aria-label={`Mood: ${mood.label}`}
              onClick={() => handleSelect(mood.key)}
              sx={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                userSelect: 'none',
                borderRadius: '50%',
                opacity: selected && !isSelected ? 0.3 : 1,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
              }}
            >
              {mood.emoji}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
