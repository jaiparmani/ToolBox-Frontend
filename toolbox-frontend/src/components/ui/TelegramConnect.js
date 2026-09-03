import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_HANDLE } from '../../config';
import { getTelegramLink, linkTelegram, unlinkTelegram } from '../rest/userApis';
import { feedback } from './feedback';

const TG = '#229ED9'; // Telegram blue — the one accent this card gets to use

const openBot = () => window.open(TELEGRAM_BOT_URL, '_blank', 'noopener,noreferrer');

const cardSx = (sx) => ({
  position: 'relative', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 }, ...sx,
});

function Header() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
      <Box aria-hidden sx={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: `${TG}1f` }}>
        <TelegramIcon sx={{ color: TG, fontSize: 18 }} />
      </Box>
      <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>Connect Telegram</Typography>
    </Box>
  );
}

/**
 * Settings → Connect Telegram: link this account to a Telegram chat so the bot
 * logs expenses to it. You get your Telegram ID by messaging the bot (it replies
 * with the id), then paste it here — no API token to copy. Shows connected state
 * with an unlink, and surfaces link errors (e.g. an id already used elsewhere).
 */
function FullConnect({ sx }) {
  const [state, setState] = React.useState(null); // { linked, telegram_id, username }
  const [loading, setLoading] = React.useState(true);
  const [idInput, setIdInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    getTelegramLink()
      .then((s) => { if (alive) { setState(s); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const connect = async () => {
    const id = idInput.trim();
    if (!/^-?\d+$/.test(id)) { setError('Enter the numeric Telegram ID the bot gave you.'); return; }
    setBusy(true); setError('');
    try {
      const s = await linkTelegram(id);
      setState(s); setIdInput(''); feedback('success');
    } catch (e) { setError(e.message || 'Could not link Telegram.'); feedback('error'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setError('');
    try { const s = await unlinkTelegram(); setState(s); feedback('success'); }
    catch (e) { setError(e.message || 'Could not unlink.'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return <Box sx={cardSx(sx)}><Header /><CircularProgress size={18} /></Box>;
  }

  if (state?.linked) {
    return (
      <Box sx={cardSx(sx)}>
        <Header />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 18 }} />
          <Typography variant="body2">
            Connected · Telegram ID <b style={{ fontVariantNumeric: 'tabular-nums' }}>{state.telegram_id}</b>
            {state.username ? ` (@${state.username})` : ''}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Message the bot an expense like “20 chai” and it logs to this account.
        </Typography>
        {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
        <Button onClick={disconnect} disabled={busy} size="small" color="inherit" sx={{ mt: 1.5 }}>
          {busy ? 'Unlinking…' : 'Unlink'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={cardSx(sx)}>
      <Header />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Log expenses from a Telegram chat — first, get your Telegram ID:
      </Typography>
      <Box component="ol" sx={{ pl: 2.25, m: 0, mb: 1.5 }}>
        <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Open {TELEGRAM_BOT_HANDLE ? `@${TELEGRAM_BOT_HANDLE}` : 'the bot'} and send it any message — it replies with your Telegram ID.
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">Paste that ID below and connect.</Typography>
      </Box>
      <Button onClick={openBot} variant="outlined" size="small" startIcon={<TelegramIcon />}
        sx={{ mb: 2, color: TG, borderColor: `${TG}66`, '&:hover': { borderColor: TG, bgcolor: `${TG}12` } }}>
        Open {TELEGRAM_BOT_HANDLE ? `@${TELEGRAM_BOT_HANDLE}` : 'the bot'}
      </Button>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={idInput}
          onChange={(e) => { setIdInput(e.target.value); if (error) setError(''); }}
          placeholder="Telegram ID (e.g. 123456789)"
          size="small" fullWidth
          inputProps={{ inputMode: 'numeric', 'aria-label': 'Telegram ID' }}
          onKeyDown={(e) => { if (e.key === 'Enter') connect(); }}
        />
        <Button onClick={connect} disabled={busy || !idInput.trim()} variant="contained"
          sx={{ bgcolor: TG, '&:hover': { bgcolor: '#1c8dc4' }, flexShrink: 0 }}>
          {busy ? '…' : 'Connect'}
        </Button>
      </Box>
      {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
    </Box>
  );
}

/** Slim CTA for the notification centre — just opens the bot. */
function CompactCta({ sx }) {
  return (
    <Box sx={cardSx({ p: 1.75, ...sx })}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box aria-hidden sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: `${TG}1f` }}>
          <TelegramIcon sx={{ color: TG, fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>Talk to ToolBox on Telegram</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Add expenses & get alerts in chat.</Typography>
        </Box>
      </Box>
      <Button onClick={openBot} fullWidth variant="contained" startIcon={<TelegramIcon />}
        sx={{ mt: 1.5, bgcolor: TG, '&:hover': { bgcolor: '#1c8dc4' }, fontWeight: 600 }}>
        Open {TELEGRAM_BOT_HANDLE ? `@${TELEGRAM_BOT_HANDLE}` : 'the bot'}
      </Button>
    </Box>
  );
}

export default function TelegramConnect({ compact = false, sx }) {
  return compact ? <CompactCta sx={sx} /> : <FullConnect sx={sx} />;
}
