import React from 'react';
import { Box } from '@mui/material';
import { motion } from '../../theme/tokens';

/**
 * A pill segmented control. `options`: [{id, label, color?}]. The active
 * segment fills with its colour (or the primary). Scrolls horizontally when it
 * can't fit, so it never wraps on a phone.
 */
export default function SegmentedControl({ options, value, onChange, sx }) {
  return (
    <Box sx={{
      display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25,
      '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', ...sx,
    }}>
      {options.map((opt) => {
        const active = opt.id === value;
        const c = opt.color || '#0A84FF';
        return (
          <Box
            key={opt.id}
            role="button"
            onClick={() => onChange(opt.id)}
            sx={{
              flexShrink: 0, px: 2, py: 0.9, borderRadius: 999, cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
              border: '1.5px solid', borderColor: active ? c : 'divider',
              color: active ? '#fff' : 'text.secondary',
              backgroundColor: active ? c : 'transparent',
              transition: `all ${motion.fast}ms ${motion.ease}`,
              '&:active': { transform: 'scale(0.96)' },
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}
