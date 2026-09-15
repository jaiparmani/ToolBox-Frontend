import React, { useState, useEffect } from 'react';
import { Box, Chip } from '@mui/material';
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

const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * SmartShortcutsBar
 *
 * A horizontal scrollable row of the user's top 5 spending categories from
 * the last 30 days. Tapping a chip calls onCategorySelect(categoryName).
 * Renders nothing when fewer than 2 categories are available.
 *
 * Props:
 *   onCategorySelect — (categoryName: string) => void   called on chip tap
 */
export default function SmartShortcutsBar({ onCategorySelect }) {
  const [topCategories, setTopCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const base = getApiBase();
        const headers = { 'Content-Type': 'application/json', ...authUtils.authHeader() };
        const today = toLocalDateStr(new Date());
        const ago30 = toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

        const res = await fetch(
          `${base}/expenses/?date_from=${ago30}&date_to=${today}&page_size=200`,
          { headers },
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const expenses = (data.results || []).filter(
          (e) => e.transaction_type !== 'income',
        );

        // Count occurrences per category name
        const counts = {};
        expenses.forEach((e) => {
          const name = e.category?.name;
          if (name) counts[name] = (counts[name] || 0) + 1;
        });

        const top5 = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name);

        if (!cancelled) setTopCategories(top5);
      } catch {
        // silent — shortcuts are a convenience, not a requirement
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (topCategories.length < 2) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'auto',
        gap: 1,
        py: 1,
        mb: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {topCategories.map((name) => (
        <Chip
          key={name}
          label={name}
          size="small"
          variant="outlined"
          onClick={() => onCategorySelect && onCategorySelect(name)}
          sx={{ flexShrink: 0, cursor: 'pointer' }}
        />
      ))}
    </Box>
  );
}
