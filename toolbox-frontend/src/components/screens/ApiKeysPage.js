import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper, Button, TextField, Alert, Snackbar,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Chip, Grid
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import {
  getOpenRouterKeys, addOpenRouterKey, deleteOpenRouterKey, moveOpenRouterKeyToBack
} from '../rest/expenseTrackerApis';

export default function ApiKeysPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ key: '', label: '', saving: false });

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
    if (!form.key.trim()) {
      setError('Paste a key first');
      return;
    }
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

  const handleDelete = async (record) => {
    if (!window.confirm(`Remove ${record.masked}? This cannot be undone.`)) return;
    try {
      await deleteOpenRouterKey(record.id);
      setSuccess('Key removed');
      loadKeys();
    } catch (err) {
      setError(err.message || 'Could not remove that key');
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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>Authentication Required</Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Please log in to manage API keys.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 3, position: 'relative', overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
            '&::before': {
              content: '""', position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 0% 0%, rgba(191,90,242,0.18), transparent 55%)',
            },
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ position: 'relative' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #BF5AF2, #0A84FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(191,90,242,0.4)',
                }}
              >
                <VpnKeyIcon sx={{ fontSize: 24, color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h4" component="h1">API Keys</Typography>
                <Typography variant="body2" color="text.secondary">
                  OpenRouter keys powering Quick Add, Bulk Import and Spending Reviews
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={loadKeys} disabled={loading}><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
        </Paper>

        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
        </Snackbar>
        <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>{success}</Alert>
        </Snackbar>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Add a key */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Add a key
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth size="small" label="OpenRouter key"
                placeholder="sk-or-v1-..."
                value={form.key}
                onChange={(e) => setForm(prev => ({ ...prev, key: e.target.value }))}
                disabled={form.saving}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" label="Label (optional)"
                placeholder="e.g. personal"
                value={form.label}
                onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
                disabled={form.saving}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth variant="contained" startIcon={<AddIcon />}
                onClick={handleAdd} disabled={form.saving || !form.key.trim()}
              >
                {form.saving ? 'Adding...' : 'Add'}
              </Button>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Each free key allows a limited number of requests per day. Keys are used in
            queue order and moved to the back after each call, so adding more raises the
            daily ceiling. Once saved, a key is only ever shown masked.
          </Typography>
        </Paper>

        {/* The queue */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Queue {keys.length > 0 && `(${keys.length})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The key marked "next" serves the following request
            </Typography>
          </Box>

          {keys.length === 0 && !loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <VpnKeyIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>No keys stored</Typography>
              <Typography variant="body2" color="text.secondary">
                AI features fall back to the server's environment variable until you add one.
              </Typography>
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
                        {index === 0 ? (
                          <Chip label="next" size="small" color="primary" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">{index + 1}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {record.masked}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {record.label || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(record.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          <Tooltip title="Send to back of queue">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveToBack(record)}
                                disabled={keys.length < 2 || index === keys.length - 1}
                                sx={{ '&:hover': { backgroundColor: 'rgba(10,132,255,0.12)', color: '#0A84FF' } }}
                              >
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove key">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(record)}
                              sx={{ color: '#FF453A', '&:hover': { backgroundColor: 'rgba(255,69,58,0.12)' } }}
                            >
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
        </Paper>
      </Container>
    </>
  );
}
