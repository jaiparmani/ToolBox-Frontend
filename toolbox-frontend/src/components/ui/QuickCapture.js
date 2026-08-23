import React from 'react';
import { Box, CircularProgress, IconButton, InputBase, Paper, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

/**
 * The one thing you open the app to do.
 *
 * This was a full-width multiline textarea with a separate Add button - fine on
 * a desktop, but on a phone the keyboard covered the button and the two-row
 * layout pushed everything else down. It is now a single pill with the submit
 * inside it, the shape people already know from chat apps.
 *
 * Enter submits. The field stays a textarea underneath so a pasted multi-line
 * note still works, but it doesn't reserve the height until there is something
 * to show.
 */
export default function QuickCapture({
  value, onChange, onSubmit, loading, placeholder, hint,
}) {
  const canSubmit = !loading && value.trim().length > 0;

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          display: 'flex', alignItems: 'flex-end', gap: 1,
          p: 0.75, pl: 2, borderRadius: 999,
          border: '1px solid', borderColor: 'divider',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}22`,
          },
        }}
      >
        <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 18, mb: 1.25, flexShrink: 0 }} />
        <InputBase
          fullWidth
          multiline
          maxRows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          placeholder={placeholder}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a newline, as in any chat box.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          sx={{
            py: 1,
            // 16px keeps iOS Safari from zooming the whole page on focus.
            '& textarea': { fontSize: '16px', lineHeight: 1.4 },
          }}
        />
        <IconButton
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-label="Add"
          sx={{
            width: 40, height: 40, flexShrink: 0,
            bgcolor: canSubmit ? 'primary.main' : 'action.disabledBackground',
            color: canSubmit ? '#fff' : 'text.disabled',
            '&:hover': { bgcolor: canSubmit ? 'primary.dark' : 'action.disabledBackground' },
            transition: 'background-color 0.2s ease',
          }}
        >
          {loading
            ? <CircularProgress size={18} sx={{ color: 'inherit' }} />
            : <ArrowUpwardIcon fontSize="small" />}
        </IconButton>
      </Paper>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 2 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
