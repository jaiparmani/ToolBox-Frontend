import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Typography, Button, TextField, Snackbar, Alert,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Chip, Grid, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  PhoneIphone as ShortcutIcon,
} from '@mui/icons-material';

import {
  getOpenRouterKeys, addOpenRouterKey, deleteOpenRouterKey, moveOpenRouterKeyToBack,
} from '../rest/expenseTrackerApis';
import {
  getShortcutKeys, createShortcutKey, deleteShortcutKey,
} from '../rest/userApis';
import { PageHeader, Panel, EmptyState, ConfirmDialog } from '../ui';
import { accents } from '../../theme/tokens';

export default function ApiKeysPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ key: '', label: '', saving: false });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Shortcut API keys state
  const [shortcutKeys, setShortcutKeys] = useState([]);
  const [shortcutLoading, setShortcutLoading] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState('');
  const [shortcutSaving, setShortcutSaving] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(null);
  const [pendingShortcutDelete, setPendingShortcutDelete] = useState(null);
  const [shortcutDeleting, setShortcutDeleting] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await getOpenRouterKeys());
    } catch (err) {
      setError(err.message || 'Could not load keys');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShortcutKeys = useCallback(async () => {
    setShortcutLoading(true);
    try {
      setShortcutKeys(await getShortcutKeys());
    } catch (err) {
      setError(err.message || 'Could not load shortcut keys');
    } finally {
      setShortcutLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadKeys();
      loadShortcutKeys();
    }
  }, [isAuthenticated, loadKeys, loadShortcutKeys]);

  // OpenRouter handlers
  const handleAdd = async () => {
    if (!form.key.trim()) { setError('Paste a key first'); return; }
    setForm(prev => ({ ...prev, saving: true }));
    try {
      await addOpenRouterKey(form.key.trim(), form.label.trim());
      setSuccess('Key added to the queue');
      setForm({ key: '', label: '', saving: false });
      loadKeys();
    } catch (err) {
      setForm(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not add that key');
    }
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteOpenRouterKey(pendingDelete.id);
      setSuccess('Key removed');
      setPendingDelete(null);
      loadKeys();
    } catch (err) {
      setError(err.message || 'Could not remove that key');
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveToBack = async (record) => {
    try {
      await moveOpenRouterKeyToBack(record.id);
      loadKeys();
    } catch (err) {
      setError(err.message || 'Could not reorder that key');
    }
  };

  // Shortcut key handlers
  const handleCreateShortcutKey = async () => {
    setShortcutSaving(true);
    try {
      const result = await createShortcutKey(shortcutLabel.trim());
      setNewKeyDialog(result);
      setShortcutLabel('');
      loadShortcutKeys();
    } catch (err) {
      setError(err.message || 'Could not create shortcut key');
    } finally {
      setShortcutSaving(false);
    }
  };

  const doShortcutDelete = async () => {
    if (!pendingShortcutDelete) return;
    setShortcutDeleting(true);
    try {
      await deleteShortcutKey(pendingShortcutDelete.id);
      setSuccess('Shortcut key revoked');
      setPendingShortcutDelete(null);
      loadShortcutKeys();
    } catch (err) {
      setError(err.message || 'Could not revoke that key');
    } finally {
      setShortcutDeleting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => setSuccess('Copied to clipboard'),
      () => setError('Could not copy — select and copy it manually'),
    );
  };

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Panel sx={{ p: 4, maxWidth: 440, mx: 'auto', mt: 6 }}>
        <EmptyState icon={VpnKeyIcon} title="Sign in required" description="Log in to manage your API keys." dense />
      </Panel>
    );
  }

  return (
    <Box>
      <PageHeader
        icon={VpnKeyIcon} title="API Keys"
        subtitle="Shortcut keys for Apple Shortcuts, OpenRouter keys for AI features"
        actions={
          <Tooltip title="Refresh all">
            <span>
              <IconButton onClick={() => { loadKeys(); loadShortcutKeys(); }} disabled={loading || shortcutLoading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        }
      />

      {(loading || shortcutLoading) && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

      {/* ── Shortcut API Keys ────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, mb: 1.5 }}>
        Shortcut Keys
      </Typography>

      <Panel sx={{ p: 2.5, mb: 2.5, backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
          Generate a key for an Apple Shortcut or automation
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Label" placeholder="e.g. Log Expense, Weekly Review"
              value={shortcutLabel} onChange={(e) => setShortcutLabel(e.target.value)}
              disabled={shortcutSaving}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateShortcutKey(); }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="contained" startIcon={<AddIcon />}
              onClick={handleCreateShortcutKey} disabled={shortcutSaving}>
              {shortcutSaving ? 'Generating…' : 'Generate key'}
            </Button>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Each key authenticates one shortcut. Use the header{' '}
          <Typography component="code" variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
            Authorization: Api-Key tbk_…
          </Typography>{' '}
          in your HTTP requests. The full key is shown once — copy it immediately.
        </Typography>
      </Panel>

      <Panel sx={{ overflow: 'hidden', mb: 4 }}>
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Active keys{shortcutKeys.length > 0 ? ` (${shortcutKeys.length})` : ''}
          </Typography>
        </Box>

        {shortcutKeys.length === 0 && !shortcutLoading ? (
          <Box sx={{ px: 2.5, pb: 4 }}>
            <EmptyState icon={ShortcutIcon} title="No shortcut keys"
              description="Generate a key above to connect an Apple Shortcut or automation." dense />
          </Box>
        ) : (
          <>
            {/* Table on desktop */}
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Last used</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shortcutKeys.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{record.masked}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{record.label || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(record.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {record.last_used_at ? new Date(record.last_used_at).toLocaleDateString() : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Revoke key">
                          <IconButton size="small" onClick={() => setPendingShortcutDelete(record)}
                            sx={{ color: accents.red, '&:hover': { backgroundColor: `${accents.red}1f` } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Cards on mobile */}
            <Stack sx={{ display: { xs: 'flex', sm: 'none' } }} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
              {shortcutKeys.map((record) => (
                <Box key={record.id} sx={{ px: 2.5, py: 1.75 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 0 }} noWrap>
                      {record.masked}
                    </Typography>
                    <IconButton size="small" onClick={() => setPendingShortcutDelete(record)}
                      aria-label="Revoke key"
                      sx={{ flexShrink: 0, color: accents.red, '&:hover': { backgroundColor: `${accents.red}1f` } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {record.label || 'No label'} · {record.last_used_at ? `used ${new Date(record.last_used_at).toLocaleDateString()}` : 'never used'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Panel>

      {/* ── OpenRouter Keys ──────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        OpenRouter Keys
      </Typography>

      <Panel sx={{ p: 2.5, mb: 2.5, backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>Add a key</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField fullWidth size="small" label="OpenRouter key" placeholder="sk-or-v1-…"
              value={form.key} onChange={(e) => setForm(prev => ({ ...prev, key: e.target.value }))}
              disabled={form.saving} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" label="Label (optional)" placeholder="e.g. personal"
              value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
              disabled={form.saving} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<AddIcon />}
              onClick={handleAdd} disabled={form.saving || !form.key.trim()}>
              {form.saving ? 'Adding…' : 'Add'}
            </Button>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Each free key allows a limited number of requests per day. Keys are used in queue order and
          moved to the back after each call, so adding more raises the daily ceiling. Once saved, a key
          is only ever shown masked.
        </Typography>
      </Panel>

      <Panel sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Queue{keys.length > 0 ? ` (${keys.length})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The key marked "next" serves the following request
          </Typography>
        </Box>

        {keys.length === 0 && !loading ? (
          <Box sx={{ px: 2.5, pb: 4 }}>
            <EmptyState icon={VpnKeyIcon} title="No keys stored"
              description="AI features fall back to the server's environment variable until you add one." dense />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Key</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Added</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keys.map((record, index) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        {index === 0
                          ? <Chip label="next" size="small" color="primary" />
                          : <Typography variant="body2" color="text.secondary">{index + 1}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{record.masked}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{record.label || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{new Date(record.created_at).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          <Tooltip title="Send to back of queue">
                            <span>
                              <IconButton size="small" onClick={() => handleMoveToBack(record)}
                                disabled={keys.length < 2 || index === keys.length - 1}
                                sx={{ '&:hover': { backgroundColor: `${accents.blue}1f`, color: accents.blue } }}>
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove key">
                            <IconButton size="small" onClick={() => setPendingDelete(record)}
                              sx={{ color: accents.red, '&:hover': { backgroundColor: `${accents.red}1f` } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack sx={{ display: { xs: 'flex', sm: 'none' } }} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
              {keys.map((record, index) => (
                <Box key={record.id} sx={{ px: 2.5, py: 1.75 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                    <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                      {index === 0
                        ? <Chip label="next" size="small" color="primary" />
                        : <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18 }}>#{index + 1}</Typography>}
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }} noWrap>{record.masked}</Typography>
                    </Box>
                    <Box display="flex" gap={0.5} sx={{ flexShrink: 0 }}>
                      <IconButton size="small" onClick={() => handleMoveToBack(record)}
                        aria-label="Send to back of queue"
                        disabled={keys.length < 2 || index === keys.length - 1}
                        sx={{ '&:hover': { backgroundColor: `${accents.blue}1f`, color: accents.blue } }}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setPendingDelete(record)}
                        aria-label="Remove key"
                        sx={{ color: accents.red, '&:hover': { backgroundColor: `${accents.red}1f` } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {(record.label || 'No label')} · added {new Date(record.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Panel>

      {/* New key dialog — shown once after creation */}
      <Dialog open={!!newKeyDialog} maxWidth="sm" fullWidth onClose={() => setNewKeyDialog(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Your new API key</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy this key now — it won't be shown again.
          </Alert>
          <Box sx={{
            p: 2, borderRadius: 2, bgcolor: 'action.hover',
            fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all',
            display: 'flex', alignItems: 'flex-start', gap: 1,
          }}>
            <Box sx={{ flex: 1 }}>{newKeyDialog?.key}</Box>
            <Tooltip title="Copy">
              <IconButton size="small" onClick={() => copyToClipboard(newKeyDialog?.key)}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {newKeyDialog?.label && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Label: {newKeyDialog.label}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Use this in your Apple Shortcut's "Get Contents of URL" action as a header:
          </Typography>
          <Box sx={{
            mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover',
            fontFamily: 'monospace', fontSize: '0.8rem',
          }}>
            Authorization: Api-Key {newKeyDialog?.key}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { copyToClipboard(newKeyDialog?.key); setNewKeyDialog(null); }}
            variant="contained">
            Copy & close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this key?"
        message={pendingDelete ? `${pendingDelete.masked} will be removed from the queue. This can't be undone.` : ''}
        confirmLabel="Remove key"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingShortcutDelete}
        title="Revoke this shortcut key?"
        message={pendingShortcutDelete ? `${pendingShortcutDelete.masked} will stop working immediately. Any shortcut using it will need a new key.` : ''}
        confirmLabel="Revoke key"
        destructive
        loading={shortcutDeleting}
        onConfirm={doShortcutDelete}
        onCancel={() => setPendingShortcutDelete(null)}
      />

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
