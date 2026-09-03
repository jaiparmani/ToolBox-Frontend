import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Alert, Box, Button, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';

import { getMetrics, getMetricsSummary, addMetric, deleteMetric } from '../rest/healthApis';
import Reveal from '../ui/Reveal';
import TrendBars from '../ui/TrendBars';
import SwipeAction from '../ui/SwipeAction';
import { ExpenseListSkeleton } from '../ui/Skeletons';
import { relativeDay } from '../ui/money';
import { PageHeader, SectionHeader, Panel, EmptyState } from '../ui';
import { accents, type as tokenType } from '../../theme/tokens';

const METRICS = {
  weight: { label: 'Weight', unit: 'kg', icon: MonitorWeightIcon },
  water: { label: 'Water', unit: 'ml', icon: WaterDropIcon },
  sleep: { label: 'Sleep', unit: 'hours', icon: BedtimeIcon },
  steps: { label: 'Steps', unit: 'steps', icon: DirectionsWalkIcon },
};
const TYPES = Object.keys(METRICS);

/**
 * Health, rebuilt around one metric at a time: pick it from a pill row, see the
 * latest reading big and its recent trend as a chart, and log a new one. Entries
 * swipe away to delete, the same gesture as everywhere else in the app.
 *
 * Restrained by design: hairline surfaces, a single mint accent for the active
 * metric, monochrome everywhere else. No glows, gradients or count-ups.
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

  if (isLoading || !isAuthenticated) return null;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 10 }}>
      <Reveal>
        <PageHeader
          icon={FavoriteRoundedIcon}
          title="Health"
          subtitle="Your body, tracked"
          actions={
            <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => setDialog(true)}>
              Log
            </Button>
          }
        />
      </Reveal>

      {/* Metric selector */}
      <Reveal index={1}>
        <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          {TYPES.map((t) => {
            const m = METRICS[t]; const active = t === type;
            return (
              <Box key={t} role="button" tabIndex={0} aria-pressed={active} aria-label={m.label}
                onClick={() => setType(t)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setType(t); } }}
                sx={{
                  flex: '1 0 auto', minWidth: 78, px: 1.5, py: 1, cursor: 'pointer', borderRadius: 2.5, textAlign: 'center',
                  border: '1px solid', borderColor: active ? accents.mint : 'divider',
                  backgroundColor: active ? `${accents.mint}1a` : 'transparent',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                  '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
                }}>
                <m.icon sx={{ color: active ? accents.mint : 'text.secondary', fontSize: 22 }} />
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mt: 0.25, color: active ? 'text.primary' : 'text.secondary' }}>
                  {m.label}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Reveal>

      {/* Hero reading */}
      <Reveal index={2}>
        <Panel sx={{ p: 3, mb: 2.5 }}>
          <Typography variant="overline" color="text.secondary">Latest {cfg.label.toLowerCase()}</Typography>
          <Box display="flex" alignItems="baseline" gap={1}>
            <Typography sx={{ fontFamily: tokenType.displayFamily, fontWeight: 700, fontSize: '2.8rem', letterSpacing: '-0.03em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
              {stat?.latest_value != null ? Number(stat.latest_value).toLocaleString('en-IN') : '—'}
            </Typography>
            <Typography variant="h6" color="text.secondary">{cfg.unit}</Typography>
          </Box>
          {stat?.week_avg != null && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {Number(stat.week_avg).toFixed(1)} {cfg.unit} avg this week
            </Typography>
          )}
        </Panel>
      </Reveal>

      {/* Trend */}
      {trend.length > 1 && (
        <Reveal index={3}>
          <Panel sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
            <TrendBars data={trend} title={`${cfg.label} over time`} formatValue={(v) => `${v} ${cfg.unit}`} formatFull={(v) => `${v} ${cfg.unit}`} />
          </Panel>
        </Reveal>
      )}

      {/* Entries */}
      <Reveal index={4}>
        <SectionHeader title="History" count={entries.length || undefined} />
        <Panel sx={{ overflow: 'hidden' }}>
          {loading ? <Box sx={{ p: 1.5 }}><ExpenseListSkeleton rows={4} /></Box>
            : entries.length === 0 ? (
              <EmptyState dense icon={cfg.icon} title={`No ${cfg.label.toLowerCase()} logged yet`} description="Tap Log to add your first reading." />
            ) : entries.map((e) => (
              <SwipeAction key={e.id} onAction={() => remove(e.id)} color={accents.red}
                icon={<DeleteIcon sx={{ color: '#fff' }} />} label="Delete" borderRadius={0}>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}
                  sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{e.value} {e.unit}</Typography>
                    {e.notes && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{e.notes}</Typography>}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{relativeDay(e.date)}</Typography>
                </Box>
              </SwipeAction>
            ))}
        </Panel>
      </Reveal>

      {/* Add dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <cfg.icon sx={{ color: 'text.secondary', fontSize: 20 }} />
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
    </Container>
  );
}
