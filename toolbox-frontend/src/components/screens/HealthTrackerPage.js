import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tabs, Tab, IconButton, Tooltip, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Favorite as FavoriteIcon,
  MonitorWeight as WeightIcon,
  Opacity as WaterIcon,
  Bedtime as SleepIcon,
  DirectionsWalk as StepsIcon
} from '@mui/icons-material';

import { getMetrics, getMetricsSummary, addMetric, deleteMetric } from '../rest/healthApis';
import NavbarComponent from '../NavbarComponent';

// Adding a new metric later is just a new entry here - the backend already
// accepts any metric_type in HealthMetric.METRIC_TYPE_CHOICES.
const METRIC_CONFIG = {
  weight: { label: 'Weight', unit: 'kg', icon: WeightIcon, color: '#0A84FF' },
  water: { label: 'Water', unit: 'ml', icon: WaterIcon, color: '#64D2FF' },
  sleep: { label: 'Sleep', unit: 'hours', icon: SleepIcon, color: '#BF5AF2' },
  steps: { label: 'Steps', unit: 'steps', icon: StepsIcon, color: '#30D158' }
};
const METRIC_TYPES = Object.keys(METRIC_CONFIG);

// Lightens a hex color by mixing in white - used for the Add Entry dialog's icon badge gradient.
const lightenHex = (hex, amount) => {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export default function HealthTrackerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeType, setActiveType] = useState('weight');
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ value: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, metricsData] = await Promise.all([
        getMetricsSummary(),
        getMetrics({ metricType: activeType })
      ]);
      setSummary(summaryData);
      setEntries(metricsData.results);
    } catch (err) {
      setError(err.message || 'Failed to load health data.');
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const openDialog = () => {
    setFormData({ value: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleAddEntry = async () => {
    if (!formData.value || parseFloat(formData.value) <= 0) {
      setFormError('Enter a value greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await addMetric({
        metric_type: activeType,
        value: parseFloat(formData.value),
        unit: METRIC_CONFIG[activeType].unit,
        date: formData.date,
        notes: formData.notes
      });
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to add entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMetric(id);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete entry.');
    }
  };

  const config = METRIC_CONFIG[activeType];
  const typeSummary = summary?.[activeType];

  return (
    <>
      <NavbarComponent />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 3,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 0% 0%, rgba(255,55,95,0.18), transparent 55%)',
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={2} sx={{ position: 'relative' }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: '14px',
                background: 'linear-gradient(135deg, #FF375F, #FF9F0A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(255,55,95,0.4)',
              }}
            >
              <FavoriteIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h4" component="h1">Health Tracker</Typography>
              <Typography variant="body2" color="text.secondary">
                Log daily metrics and see how they trend
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Tabs value={activeType} onChange={(e, val) => setActiveType(val)} sx={{ mb: 3 }}>
          {METRIC_TYPES.map((type) => {
            const Icon = METRIC_CONFIG[type].icon;
            const color = METRIC_CONFIG[type].color;
            return (
              <Tab
                key={type}
                value={type}
                label={METRIC_CONFIG[type].label}
                iconPosition="start"
                icon={
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: '10px',
                      backgroundColor: `${color}1f`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ color, fontSize: 18 }} />
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {(loading || authLoading) && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', borderColor: config.color },
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">Latest</Typography>
                <Typography variant="h5">
                  {typeSummary?.latest_value != null ? `${typeSummary.latest_value} ${typeSummary.unit}` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {typeSummary?.latest_date || 'No entries yet'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', borderColor: config.color },
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">7-Day Average</Typography>
                <Typography variant="h5">
                  {typeSummary?.week_avg != null ? `${Number(typeSummary.week_avg).toFixed(1)} ${config.unit}` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {typeSummary?.week_count || 0} entries this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', borderColor: config.color },
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">7-Day Range</Typography>
                <Typography variant="h5">
                  {typeSummary?.week_min != null
                    ? `${typeSummary.week_min} – ${typeSummary.week_max}`
                    : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">{config.unit}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>History</Typography>
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No {config.label.toLowerCase()} entries yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell align="right">{entry.value} {entry.unit}</TableCell>
                      <TableCell>{entry.notes}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(entry.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={openDialog}
          aria-label={`Add ${config.label} entry`}
        >
          <AddIcon />
        </Fab>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  background: `linear-gradient(135deg, ${config.color}, ${lightenHex(config.color, 60)})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 16px ${config.color}66`,
                  flexShrink: 0,
                }}
              >
                <config.icon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Typography variant="h6" component="span">
                Add {config.label} Entry
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{formError}</Alert>}
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField
                  label="Value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  autoFocus
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{config.unit}</InputAdornment>,
                  }}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleAddEntry}
              variant="contained"
              disabled={submitting}
              sx={{
                backgroundColor: config.color,
                boxShadow: `0 6px 16px ${config.color}4d`,
                '&:hover': {
                  backgroundColor: config.color,
                  filter: 'brightness(0.9)',
                },
              }}
            >
              {submitting ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
