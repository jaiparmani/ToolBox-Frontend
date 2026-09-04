import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Stack,
} from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getShortcutKeys, createShortcutKey, deleteShortcutKey } from '../rest/userApis';
import { ConfirmDialog } from './';
import { feedback } from './feedback';
import { accents, motion } from '../../theme/tokens';

const SC = accents.violet;

const cardSx = (sx) => ({
  position: 'relative', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 }, ...sx,
});

function Header() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
      <Box aria-hidden sx={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: `${SC}1f` }}>
        <PhoneIphoneIcon sx={{ color: SC, fontSize: 18 }} />
      </Box>
      <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>Apple Shortcuts</Typography>
    </Box>
  );
}

export default function ShortcutConnect({ sx }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [newKeyData, setNewKeyData] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setKeys(await getShortcutKeys());
    } catch {
      // silent — card stays usable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setCreating(true); setError('');
    try {
      const result = await createShortcutKey(label.trim());
      setNewKeyData(result);
      setLabel('');
      feedback('success');
      load();
    } catch (e) {
      setError(e.message || 'Could not generate key');
      feedback('error');
    } finally {
      setCreating(false);
    }
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteShortcutKey(pendingDelete.id);
      setPendingDelete(null);
      feedback('success');
      load();
    } catch (e) {
      setError(e.message || 'Could not revoke key');
    } finally {
      setDeleting(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(
      () => feedback('success'),
      () => setError('Could not copy — select and copy manually'),
    );
  };

  if (loading) {
    return <Box sx={cardSx(sx)}><Header /><CircularProgress size={18} /></Box>;
  }

  return (
    <>
      <Box sx={cardSx(sx)}>
        <Header />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Generate API keys so Apple Shortcuts can talk to Money OS — log expenses, get reviews, all hands-free.
        </Typography>

        {/* Existing keys */}
        {keys.length > 0 && (
          <Stack spacing={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
            {keys.map((k, i) => (
              <Box
                key={k.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                  borderTop: i > 0 ? '1px solid' : 'none', borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} noWrap>
                    {k.masked}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {k.label || 'No label'}
                    {k.last_used_at ? ` · used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
                  </Typography>
                </Box>
                <Tooltip title="Revoke">
                  <IconButton size="small" onClick={() => setPendingDelete(k)}
                    sx={{ color: accents.red, '&:hover': { bgcolor: `${accents.red}1f` } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )}

        {/* Generate new key */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            value={label} onChange={(e) => { setLabel(e.target.value); if (error) setError(''); }}
            placeholder="Label (e.g. Log Expense)"
            size="small" fullWidth
            onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
          />
          <Button onClick={generate} disabled={creating} variant="contained"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: SC, '&:hover': { bgcolor: '#6a4de0' },
              flexShrink: 0, whiteSpace: 'nowrap',
              transition: `background-color ${motion.fast}ms ${motion.ease}`,
            }}>
            {creating ? '…' : 'Generate'}
          </Button>
        </Box>

        {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Use the header <code style={{ fontSize: '0.75rem' }}>Authorization: Api-Key tbk_…</code> in your shortcut's "Get Contents of URL" action.
        </Typography>
      </Box>

      {/* New key dialog — shown once */}
      <Dialog open={!!newKeyData} maxWidth="sm" fullWidth onClose={() => setNewKeyData(null)}
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Your new API key</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Copy this key now — it won't be shown again.
          </Alert>
          <Box sx={{
            p: 2, borderRadius: 2.5, bgcolor: 'action.hover',
            fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all',
            display: 'flex', alignItems: 'flex-start', gap: 1,
            border: '1px solid', borderColor: 'divider',
          }}>
            <Box sx={{ flex: 1 }}>{newKeyData?.key}</Box>
            <Tooltip title="Copy key">
              <IconButton size="small" onClick={() => copy(newKeyData?.key)}>
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          {newKeyData?.label && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Label: {newKeyData.label}
            </Typography>
          )}
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              In your Apple Shortcut's headers:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
              Authorization: Api-Key {newKeyData?.key}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { copy(newKeyData?.key); setNewKeyData(null); }}
            variant="contained" sx={{ bgcolor: SC, '&:hover': { bgcolor: '#6a4de0' } }}>
            Copy & close
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Revoke this key?"
        message={pendingDelete ? `${pendingDelete.masked} will stop working immediately. Any shortcut using it will need a new key.` : ''}
        confirmLabel="Revoke"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
