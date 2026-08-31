import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Typography, Button, TextField, Snackbar, Alert,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Chip, Grid,
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
  getOpenRouterKeys, addOpenRouterKey, deleteOpenRouterKey, moveOpenRouterKeyToBack,
} from '../rest/expenseTrackerApis';
import { PageHeader, Panel, EmptyState, ConfirmDialog } from '../ui';
import { accents } from '../../theme/tokens';

/**
 * OpenRouter key queue (admin tooling). Rebuilt on the shared frame — one
 * PageHeader, Panel surfaces, the app's ConfirmDialog for destructive removal
 * (never the native window.confirm), and a real empty state. All the queue
 * logic and APIs are unchanged.
 */
export default function ApiKeysPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ key: '', label: '', saving: false });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) loadKeys();
  }, [isAuthenticated, loadKeys]);

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

  // Auth still resolving — render nothing rather than a "Loading…" string.
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
        subtitle="OpenRouter keys powering Quick Add, Bulk Import and Spending Reviews"
        gradient={`linear-gradient(135deg, ${accents.purple}, ${accents.blue})`}
        glow={`${accents.purple}66`}
        actions={
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={loadKeys} disabled={loading}><RefreshIcon /></IconButton>
            </span>
          </Tooltip>
        }
      />

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

      {/* Add a key */}
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

      {/* The queue */}
      <Panel sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Queue{keys.length > 0 ? ` (${keys.length})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The key marked “next” serves the following request
          </Typography>
        </Box>

        {keys.length === 0 && !loading ? (
          <Box sx={{ px: 2.5, pb: 4 }}>
            <EmptyState icon={VpnKeyIcon} title="No keys stored"
              description="AI features fall back to the server's environment variable until you add one." dense />
          </Box>
        ) : (
          <TableContainer>
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
        )}
      </Panel>

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

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
