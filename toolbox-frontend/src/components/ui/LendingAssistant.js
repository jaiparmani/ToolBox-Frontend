import React, { useState } from 'react';
import {
  Box, Paper, Stack, Typography, TextField, IconButton, Chip, LinearProgress,
} from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Reveal from './Reveal';
import { accents, type, motion } from '../../theme/tokens';
import { feedback } from './feedback';
import { askLending } from '../rest/expenseTrackerApis';

/**
 * Ask about LENDING — a Q&A surface scoped to who-owes-whom, kept deliberately
 * separate from the spending assistant so the two never blur together. The
 * server does the reading and the arithmetic; we only show its plain-language
 * answer. Restrained by design: one mint accent for the AI voice, hairline
 * surfaces, transform/opacity motion only.
 */
const EXAMPLES = [
  'Who owes me the most?',
  'How much is unsettled overall?',
  'Who have I not settled with in a while?',
];

export default function LendingAssistant() {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState({ loading: false, answer: null, error: null });

  const run = async (q) => {
    const text = (q ?? question).trim();
    if (!text || status.loading) return;
    setQuestion(text);
    feedback('send');
    setStatus({ loading: true, answer: null, error: null });
    try {
      const { answer } = await askLending(text);
      feedback('success');
      setStatus({ loading: false, answer: answer || 'No answer came back.', error: null });
    } catch (err) {
      feedback('error');
      setStatus({ loading: false, answer: null, error: err.message || 'Could not answer that.' });
    }
  };

  return (
    <Reveal index={2}>
      <Paper
        elevation={0}
        sx={{ p: { xs: 2, sm: 2.5 }, mb: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
      >
        {/* Voice line — this is the lending assistant, not the spending one */}
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
          <Box
            aria-hidden
            sx={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accents.mint,
              bgcolor: 'rgba(48,214,165,0.12)',
              border: '1px solid rgba(48,214,165,0.28)',
            }}
          >
            <ForumOutlinedIcon sx={{ fontSize: 17 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 650, lineHeight: 1.2 }}>
              Ask about lending
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Who owes what, and what's still unsettled
            </Typography>
          </Box>
        </Stack>

        {/* Question input + send */}
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); }
          }}
          placeholder="Ask about who owes whom…"
          disabled={status.loading}
          InputProps={{
            sx: { borderRadius: 3, pr: 0.5, alignItems: 'flex-end' },
            endAdornment: (
              <IconButton
                onClick={() => run()}
                disabled={status.loading || !question.trim()}
                aria-label="Ask"
                sx={{
                  m: 0.5, flexShrink: 0,
                  color: '#fff',
                  bgcolor: accents.mint,
                  '&:hover': { bgcolor: accents.mint, filter: 'brightness(1.06)' },
                  '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' },
                  transition: `transform ${motion.fast}ms ${motion.emphasis}`,
                }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />

        {/* Example prompts — a way in for a blank box */}
        {!status.answer && !status.loading && !status.error && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
            {EXAMPLES.map((ex) => (
              <Chip
                key={ex}
                label={ex}
                size="small"
                variant="outlined"
                onClick={() => run(ex)}
                sx={{
                  borderRadius: 2, cursor: 'pointer', height: 'auto', py: 0.5,
                  '& .MuiChip-label': { whiteSpace: 'normal' },
                  transition: `border-color ${motion.fast}ms ${motion.ease}`,
                  '&:hover': { borderColor: accents.mint, color: accents.mint },
                }}
              />
            ))}
          </Stack>
        )}

        {/* Loading */}
        {status.loading && (
          <Box sx={{ mt: 1.75 }}>
            <LinearProgress
              sx={{
                borderRadius: 999, height: 3,
                bgcolor: 'rgba(48,214,165,0.15)',
                '& .MuiLinearProgress-bar': { bgcolor: accents.mint },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Reading your balances…
            </Typography>
          </Box>
        )}

        {/* Answer */}
        {status.answer && !status.loading && (
          <Reveal>
            <Box
              sx={{
                mt: 1.75, p: { xs: 1.5, sm: 2 }, borderRadius: 3,
                border: '1px solid', borderColor: 'divider',
                bgcolor: 'action.hover',
                borderLeft: '2px solid', borderLeftColor: accents.mint,
              }}
            >
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontVariantNumeric: 'tabular-nums' }}
              >
                {status.answer}
              </Typography>
            </Box>
          </Reveal>
        )}

        {/* Error — real failure, never a fabricated answer */}
        {status.error && !status.loading && (
          <Typography
            variant="caption"
            sx={{ mt: 1.5, display: 'block', color: accents.red, fontWeight: 500 }}
          >
            {status.error}
          </Typography>
        )}
      </Paper>
    </Reveal>
  );
}
