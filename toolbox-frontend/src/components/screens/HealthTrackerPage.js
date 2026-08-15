import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tabs, Tab, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
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
  weight: { label: 'Weight', unit: 'kg', icon: WeightIcon, color: '#1976d2' },
  water: { label: 'Water', unit: 'ml', icon: WaterIcon, color: '#03a9f4' },
  sleep: { label: 'Sleep', unit: 'hours', icon: SleepIcon, color: '#673ab7' },
  steps: { label: 'Steps', unit: 'steps', icon: StepsIcon, color: '#4caf50' }
};
const METRIC_TYPES = Object.keys(METRIC_CONFIG);

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
        <Typography variant="h4" component="h1" gutterBottom>Health Tracker</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Log daily metrics and see how they trend
        </Typography>

        <Tabs value={activeType} onChange={(e, val) => setActiveType(val)} sx={{ mb: 3 }}>
          {METRIC_TYPES.map((type) => {
            const Icon = METRIC_CONFIG[type].icon;
            return <Tab key={type} value={type} label={METRIC_CONFIG[type].label} icon={<Icon />} iconPosition="start" />;
          })}
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {(loading || authLoading) && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
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
            <Card>
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
            <Card>
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

        <Paper sx={{ p: 2 }}>
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
          <DialogTitle>Add {config.label} Entry</DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{formError}</Alert>}
            <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
              <TextField
                label={`Value (${config.unit})`}
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                autoFocus
                fullWidth
              />
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
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
            <Button onClick={handleAddEntry} variant="contained" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
