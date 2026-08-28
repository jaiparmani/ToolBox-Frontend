import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Alert, Box, Button, Card, CardContent, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Fab, Paper, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import FavoriteIcon from '@mui/icons-material/Favorite';

import { getMetrics, getMetricsSummary, addMetric, deleteMetric } from '../rest/healthApis';
import Reveal from '../ui/Reveal';
import AnimatedNumber from '../ui/AnimatedNumber';
import TrendBars from '../ui/TrendBars';
import SwipeAction from '../ui/SwipeAction';
import { ExpenseListSkeleton } from '../ui/Skeletons';
import { relativeDay } from '../ui/money';
import AuroraBackground from '../motion/AuroraBackground';
import { accents, type as tokenType } from '../../theme/tokens';

const METRICS = {
  weight: { label: 'Weight', unit: 'kg', icon: MonitorWeightIcon, color: accents.blue },
  water: { label: 'Water', unit: 'ml', icon: WaterDropIcon, color: accents.cyan },
  sleep: { label: 'Sleep', unit: 'hours', icon: BedtimeIcon, color: accents.purple },
  steps: { label: 'Steps', unit: 'steps', icon: DirectionsWalkIcon, color: accents.green },
};
const TYPES = Object.keys(METRICS);

/**
 * Health, rebuilt around one metric at a time: pick it from a pill row, see the
 * latest reading big and its recent trend as a chart, and log a new one. Entries
 * swipe away to delete, the same gesture as everywhere else in the app.
 */
export default function HealthTrackerPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [type, setType] = useState('weight');
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ value: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, m] = await Promise.allSettled([getMetricsSummary(), getMetrics({ metricType: type })]);
    setSummary(s.status === 'fulfilled' ? s.value : null);
    setEntries(m.status === 'fulfilled' ? (m.value?.results || m.value || []) : []);
    setLoading(false);
  }, [type]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const cfg = METRICS[type];
  const stat = summary?.[type];

  const save = async () => {
    if (!form.value || Number(form.value) <= 0) { setError('Enter a value'); return; }
    setSaving(true);
    try {
      await addMetric({ metric_type: type, value: Number(form.value), unit: cfg.unit, date: form.date, notes: form.notes });
      setToast(`${cfg.label} logged`);
      setDialog(false);
      setForm({ value: '', date: new Date().toISOString().slice(0, 10), notes: '' });
      load();
    } catch (e) { setError(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await deleteMetric(id); setToast('Entry removed'); load(); }
    catch { setError('Could not delete'); }
  };

  // Entries → trend bars (chronological). Water/steps accumulate; weight/sleep are
  // readings, but a bar per day still reads the trend fine.
  const trend = useMemo(() =>
    [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-31)
      .map(e => ({ date: e.date, total: Number(e.value) || 0 })),
    [entries]);

  if (isLoading) return null;
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" align="center">Authentication Required</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 12, position: 'relative' }}>
        {/* Living backdrop — same premium climate as the money screens */}
        <AuroraBackground />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Reveal>
          <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '13px', background: `linear-gradient(135deg, ${accents.red}, ${accents.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${accents.red}55` }}>
              <FavoriteIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: tokenType.displayFamily, fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.15 }}>Health</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>Your body, tracked</Typography>
            </Box>
          </Box>
        </Reveal>

        {/* Metric pills */}
        <Reveal index={1}>
          <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
            {TYPES.map((t) => {
              const m = METRICS[t]; const active = t === type;
              return (
                <Card key={t} elevation={0} onClick={() => setType(t)}
                  sx={{ flex: '1 0 auto', minWidth: 82, p: 1.25, cursor: 'pointer', borderRadius: 3, textAlign: 'center',
                    border: '1.5px solid', borderColor: active ? m.color : 'divider',
                    backgroundColor: active ? `${m.color}1a` : 'transparent', transition: 'all 0.2s ease' }}>
                  <m.icon sx={{ color: m.color, fontSize: 22 }} />
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mt: 0.25 }}>{m.label}</Typography>
                </Card>
              );
            })}
          </Stack>
        </Reveal>

        {/* Hero reading */}
        <Reveal index={2}>
          <Paper elevation={0} sx={{ p: 3, mb: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider',
            position: 'relative', overflow: 'hidden',
            '&::before': { content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(circle at 50% -20%, ${cfg.color}33, transparent 60%)` } }}>
            <Box sx={{ position: 'relative' }}>
              <Typography variant="overline" color="text.secondary">Latest {cfg.label.toLowerCase()}</Typography>
              <Box display="flex" alignItems="baseline" gap={1}>
                <Typography sx={{ fontWeight: 700, fontSize: '2.6rem', letterSpacing: '-0.03em', color: cfg.color }}>
                  {stat?.latest_value != null ? <AnimatedNumber value={Number(stat.latest_value)} format="plain" /> : '—'}
                </Typography>
                <Typography variant="h6" color="text.secondary">{cfg.unit}</Typography>
              </Box>
              {stat?.week_avg != null && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {Number(stat.week_avg).toFixed(1)} {cfg.unit} avg this week
                </Typography>
              )}
            </Box>
          </Paper>
        </Reveal>

        {/* Trend */}
        {trend.length > 1 && (
          <Reveal index={3}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <TrendBars data={trend} title={`${cfg.label} over time`} formatValue={(v) => `${v} ${cfg.unit}`} formatFull={(v) => `${v} ${cfg.unit}`} />
            </Paper>
          </Reveal>
        )}

        {/* Entries */}
        <Reveal index={4}>
          <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            {loading ? <Box sx={{ p: 1.5 }}><ExpenseListSkeleton rows={4} /></Box>
              : entries.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <cfg.icon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>No {cfg.label.toLowerCase()} logged yet</Typography>
                  <Typography variant="body2" color="text.secondary">Tap + to add your first reading.</Typography>
                </Box>
              ) : entries.map((e) => (
                <SwipeAction key={e.id} onAction={() => remove(e.id)} color={accents.red}
                  icon={<DeleteIcon sx={{ color: '#fff' }} />} label="Delete" borderRadius={0}>
                  <Box display="flex" alignItems="center" justifyContent="space-between"
                    sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{e.value} {e.unit}</Typography>
                      {e.notes && <Typography variant="caption" color="text.secondary">{e.notes}</Typography>}
                    </Box>
                    <Typography variant="body2" color="text.secondary">{relativeDay(e.date)}</Typography>
                  </Box>
                </SwipeAction>
              ))}
          </Paper>
        </Reveal>

        <Fab color="primary" onClick={() => setDialog(true)}
          sx={{ position: 'fixed', right: 16, bottom: { xs: 'calc(24px + env(safe-area-inset-bottom))', md: 24 } }}
          aria-label={`Log ${cfg.label}`}>
          <AddIcon />
        </Fab>

        {/* Add dialog */}
        <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '11px', background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <cfg.icon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 650 }}>Log {cfg.label}</Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField autoFocus fullWidth type="number" label={`Value (${cfg.unit})`}
                value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} />
              <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }}
                value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
              <TextField fullWidth label="Notes (optional)" value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(false)} color="inherit">Cancel</Button>
            <Button onClick={save} variant="contained" disabled={saving || !form.value}>
              {saving ? 'Saving…' : 'Log it'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 90, md: 24 } }}>
          <Alert severity="success" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>{toast}</Alert>
        </Snackbar>
        <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 90, md: 24 } }}>
          <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 3 }}>{error}</Alert>
        </Snackbar>
        </Box>
      </Container>
    </>
  );
}
