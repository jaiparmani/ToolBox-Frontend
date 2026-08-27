import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { useReducedMotion } from 'framer-motion';
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_HANDLE } from '../../config';

const TG = '#229ED9'; // Telegram blue

/**
 * "Talk to ToolBox on Telegram" — a living invitation to the chat channel.
 *
 * A glassy panel with a Telegram-blue aurora, an animated paper-plane that
 * drifts on its own light trail, and a few rising sparks — spectacle in service
 * of one clear action: open the bot. `compact` renders the slim in-panel
 * version (for the notification centre); the full card suits a settings page.
 * Reduced motion holds everything still. Opens the bot in a new tab; never
 * auto-navigates.
 */
export default function TelegramConnect({ compact = false, sx }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();
  const anim = (v) => (reduce ? 'none' : v);

  const open = () => window.open(TELEGRAM_BOT_URL, '_blank', 'noopener,noreferrer');

  return (
    <Box
      sx={{
        position: 'relative', overflow: 'hidden', borderRadius: compact ? 3 : 4,
        p: compact ? 1.75 : 2.5,
        border: '1px solid', borderColor: `${TG}55`,
        background: dark
          ? `linear-gradient(135deg, ${TG}26, ${TG}0a 60%, transparent)`
          : `linear-gradient(135deg, ${TG}1f, ${TG}08 60%, transparent)`,
        '@keyframes tgGlow': { '0%,100%': { transform: 'translate(-10%, -10%) scale(1)', opacity: 0.6 }, '50%': { transform: 'translate(6%, 8%) scale(1.25)', opacity: 0.9 } },
        '@keyframes tgFloat': { '0%,100%': { transform: 'translateY(0) rotate(-8deg)' }, '50%': { transform: 'translateY(-5px) rotate(-2deg)' } },
        '@keyframes tgSpark': { '0%': { transform: 'translateY(0) scale(0.6)', opacity: 0 }, '20%': { opacity: 0.9 }, '100%': { transform: 'translateY(-38px) scale(1)', opacity: 0 } },
        ...sx,
      }}
    >
      {/* Aurora blob */}
      <Box aria-hidden sx={{
        position: 'absolute', top: '-40%', right: '-20%', width: 220, height: 220, borderRadius: '50%',
        background: `radial-gradient(circle, ${TG}55, transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none',
        animation: anim('tgGlow 7s ease-in-out infinite'),
      }} />

      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: compact ? 1.5 : 2 }}>
        {/* Animated plane + rising sparks */}
        <Box sx={{ position: 'relative', flexShrink: 0, width: compact ? 44 : 56, height: compact ? 44 : 56,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${TG}, #1c8dc4)`, boxShadow: `0 6px 22px ${TG}66` }}>
          <TelegramIcon sx={{ color: '#fff', fontSize: compact ? 24 : 30, animation: anim('tgFloat 3.2s ease-in-out infinite') }} />
          {!reduce && [0, 1, 2].map(i => (
            <Box key={i} aria-hidden sx={{ position: 'absolute', bottom: 6, left: 10 + i * 12, width: 3, height: 3, borderRadius: '50%',
              background: TG, animation: `tgSpark ${2.4 + i * 0.5}s ease-out ${i * 0.7}s infinite` }} />
          ))}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 750, fontSize: compact ? '0.95rem' : '1.1rem', lineHeight: 1.2 }}>
            Talk to ToolBox on Telegram
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {compact ? 'Add expenses & get split alerts in chat.'
              : 'Add expenses, split bills, and get instant alerts — all from a Telegram chat, wherever you are.'}
          </Typography>
        </Box>

        {!compact && (
          <Button onClick={open} variant="contained" startIcon={<TelegramIcon />}
            sx={{ flexShrink: 0, bgcolor: TG, '&:hover': { bgcolor: '#1c8dc4' }, borderRadius: 2.5, fontWeight: 700, boxShadow: `0 6px 20px ${TG}55` }}>
            Open
          </Button>
        )}
      </Box>

      {compact && (
        <Button onClick={open} fullWidth variant="contained" startIcon={<TelegramIcon />}
          sx={{ mt: 1.5, bgcolor: TG, '&:hover': { bgcolor: '#1c8dc4' }, borderRadius: 2.5, fontWeight: 700 }}>
          Open {TELEGRAM_BOT_HANDLE ? `@${TELEGRAM_BOT_HANDLE}` : 'the bot'}
        </Button>
      )}

      {!compact && (
        <Box sx={{ position: 'relative', mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          <BoltRoundedIcon sx={{ fontSize: 16, color: TG }} />
          <Typography variant="caption">Fastest way to log on the go — no app needed.</Typography>
        </Box>
      )}
    </Box>
  );
}
