import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { authUtils } from '../rest/authUtils';

const getApiBase = () => {
  const h = window.location.hostname;
  const isLocal =
    h === 'localhost' || h === '127.0.0.1' ||
    h.startsWith('192.168.') || h.startsWith('10.') || h.endsWith('.local');
  return isLocal
    ? 'http://localhost:8000/api/expenses'
    : 'https://toolbox.pythonanywhere.com/api/expenses';
};

// Use local-time date strings so the streak never shifts by timezone.
const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function computeStreak(expenses) {
  // Build a Set of calendar dates (YYYY-MM-DD from API) that have at least
  // one expense (exclude income so streak is specifically about logging spend).
  const datesWithExpense = new Set(
    expenses
      .filter((e) => e.transaction_type !== 'income')
      .map((e) => e.date),
  );

  let streak = 0;
  const today = new Date();

  // Walk backward day by day from today; stop at the first gap.
  for (let i = 0; i < 200; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    if (datesWithExpense.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * StreakCounter
 *
 * Compact inline row showing consecutive days the user has logged at least
 * one expense. No card border — just an icon + text, 14px.
 * Milestone labels appear at exactly 7, 30, and 100 days.
 */
export default function StreakCounter() {
  const [streak, setStreak] = useState(null); // null while loading

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const base = getApiBase();
        const headers = { 'Content-Type': 'application/json', ...authUtils.authHeader() };
        const res = await fetch(
          `${base}/expenses/?page_size=100&ordering=-date`,
          { headers },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const n = computeStreak(data.results || []);
        if (!cancelled) setStreak(n);
      } catch {
        // silent degradation — streak is a nice-to-have
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (streak === null) return null; // still loading

  // Primary text
  let streakText;
  if (streak === 0) streakText = null; // show sub-label only
  else if (streak === 100) streakText = '100 days!';
  else if (streak === 30) streakText = 'Month streak!';
  else if (streak === 7) streakText = '7-day streak!';
  else streakText = `${streak} day streak`;

  // Secondary caption
  let subLabel;
  if (streak === 0) subLabel = 'Start your streak!';
  else if (streak >= 3 && streak !== 7 && streak !== 30 && streak !== 100) subLabel = 'Keep going!';
  else subLabel = null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, mb: 0.25 }}>
      <Typography sx={{ fontSize: 14, lineHeight: 1 }}>🔥</Typography>
      {streakText && (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>
          {streakText}
        </Typography>
      )}
      {subLabel && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.2 }}>
          {subLabel}
        </Typography>
      )}
    </Box>
  );
}
