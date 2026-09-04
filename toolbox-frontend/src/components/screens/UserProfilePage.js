import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Container, IconButton, InputAdornment,
  LinearProgress, Link, Paper, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import PinIcon from '@mui/icons-material/Pin';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../../contexts/AuthContext';
import { clearAllData, setMpin as apiSetMpin, requestMpinReset, confirmMpinReset } from '../rest/userApis.js';
import Reveal from '../ui/Reveal';
import { ConfirmDialog } from '../ui';
import MpinInput from '../ui/MpinInput';
import { accents } from '../../theme/tokens';
import { getFeedbackPrefs, setFeedbackPrefs, feedback } from '../ui/feedback';
import { TelegramConnect, ShortcutConnect } from '../ui';

/**
 * Profile, rebuilt as a single scrollable column of glass cards rather than a
 * tabbed form. Everything you'd change about your account, in the order you'd
 * reach for it: who you are, your password, then the destructive stuff last
 * and clearly marked.
 */

// Cheap, honest password meter: length carries most of the weight, variety the
// rest. Four bands so "weak/fair/good/strong" map onto something.
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', color: accents.red };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(s, 4);
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const color = [accents.red, accents.red, accents.amber, accents.mint, accents.green][score];
  return { score, label, color };
}

export default function UserProfilePage() {
  const { user, isAuthenticated, isLoading, updateProfile, changePassword, logout, refreshUserProfile } = useAuth();

  const [details, setDetails] = useState({ username: '', email: '', first_name: '', last_name: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [pw, setPw] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Security / MPIN. `hasMpin` gates whether the current MPIN is required to
  // change it; seeded from the profile and refreshed after every set.
  const [hasMpin, setHasMpin] = useState(false);
  const [mpin, setMpin] = useState({ current: '', next: '', confirm: '' });
  const [savingMpin, setSavingMpin] = useState(false);
  const [mpinError, setMpinError] = useState('');
  // Inline "forgot MPIN" reset, using the emailed-code flow.
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'
  const [resetCode, setResetCode] = useState('');
  const [resetMpin, setResetMpin] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const [feel, setFeel] = useState(getFeedbackPrefs());
  const toggleFeel = (key) => {
    const next = { ...feel, [key]: !feel[key] };
    setFeedbackPrefs(next);
    setFeel(next);
    if (next[key]) feedback(key === 'sound' ? 'success' : 'tap'); // let them hear/feel it turn on
  };

  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setDetails({
        username: user.username || '', email: user.email || '',
        first_name: user.first_name ?? user.firstName ?? '', last_name: user.last_name ?? user.lastName ?? '',
        phone: user.phone || '',
      });
      setHasMpin(user.hasMpin === true || user.has_mpin === true);
    }
  }, [user]);

  const strength = useMemo(() => scorePassword(pw.new_password), [pw.new_password]);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await updateProfile(details);
      if (res?.success === false) throw new Error(res.error || 'Could not save');
      setToast('Profile updated'); setEditing(false);
    } catch (e) { setError(e.message || 'Could not save your details'); }
    finally { setSavingDetails(false); }
  };

  const savePassword = async () => {
    if (pw.new_password !== pw.new_password_confirm) { setError('The new passwords do not match'); return; }
    if (strength.score < 2) { setError('Choose a stronger password'); return; }
    setSavingPw(true);
    try {
      const res = await changePassword(pw.old_password, pw.new_password, pw.new_password_confirm);
      if (res?.success === false) throw new Error(res.error || 'Could not change password');
      setToast('Password changed');
      setPw({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (e) { setError(e.message || 'Could not change your password'); }
    finally { setSavingPw(false); }
  };

  const saveMpin = async () => {
    setMpinError('');
    if (hasMpin && !/^\d{6}$/.test(mpin.current)) { setMpinError('Enter your current 6-digit MPIN'); return; }
    if (!/^\d{6}$/.test(mpin.next)) { setMpinError('Your new MPIN must be exactly 6 digits'); return; }
    if (mpin.next !== mpin.confirm) { setMpinError('The new MPINs do not match'); return; }
    setSavingMpin(true);
    try {
      const res = await apiSetMpin(mpin.next, hasMpin ? mpin.current : undefined);
      // Server echoes has_mpin; fall back to true since we just set one.
      setHasMpin(res?.has_mpin ?? true);
      setMpin({ current: '', next: '', confirm: '' });
      feedback('success');
      setToast(hasMpin ? 'MPIN changed' : 'MPIN set');
      refreshUserProfile?.();
    } catch (e) {
      feedback('error');
      setMpinError(e.message || 'Could not update your MPIN');
    } finally { setSavingMpin(false); }
  };

  const startMpinReset = async () => {
    if (!details.email) { setMpinError('Add an email to your profile first, then reset your MPIN'); return; }
    setResetBusy(true); setMpinError('');
    try {
      await requestMpinReset(details.email);
      setResetStep('confirm');
      setToast('We emailed you a reset code');
    } catch (e) {
      setMpinError(e.message || 'Could not start an MPIN reset');
    } finally { setResetBusy(false); }
  };

  const finishMpinReset = async () => {
    setMpinError('');
    if (!resetCode.trim()) { setMpinError('Enter the code we emailed you'); return; }
    if (!/^\d{6}$/.test(resetMpin)) { setMpinError('Your new MPIN must be exactly 6 digits'); return; }
    setResetBusy(true);
    try {
      await confirmMpinReset(details.email, resetCode.trim(), resetMpin);
      setHasMpin(true);
      feedback('success');
      setToast('MPIN reset');
      setResetOpen(false); setResetStep('request'); setResetCode(''); setResetMpin('');
      refreshUserProfile?.();
    } catch (e) {
      feedback('error');
      setMpinError(e.message || 'Could not reset your MPIN. Check the code and try again.');
    } finally { setResetBusy(false); }
  };

  const doClear = async () => {
    setClearing(true);
    try {
      await clearAllData();
      setToast('All your data was cleared');
      setConfirmClear(false);
    } catch (e) { setError('Could not clear your data'); }
    finally { setClearing(false); }
  };

  if (isLoading) return null;
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, px: { xs: 2, sm: 3 } }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" align="center" sx={{ fontWeight: 650 }}>Authentication required</Typography>
        </Paper>
      </Container>
    );
  }

  const initial = (details.username || details.email || '?').charAt(0).toUpperCase();
  const fullName = [details.first_name, details.last_name].filter(Boolean).join(' ');

  return (
    <>
      <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
        {/* Identity hero — flat hairline surface, one mint accent on the monogram */}
        <Reveal>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 }, mb: 2.5, borderRadius: 4,
              display: 'flex', alignItems: 'center', gap: 2,
              border: '1px solid', borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 700, color: accents.mint,
                bgcolor: `${accents.mint}1f`, border: '1px solid', borderColor: `${accents.mint}55`,
              }}
            >
              {initial}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} noWrap>
                {fullName || details.username || 'Your account'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{details.email || 'No email set'}</Typography>
            </Box>
          </Paper>
        </Reveal>

        {/* Your details */}
        <Reveal index={1}>
          <SectionCard icon={<PersonIcon />} title="Your details"
            action={
              <Button size="small" startIcon={editing ? <CheckIcon /> : <EditIcon />}
                onClick={() => (editing ? saveDetails() : setEditing(true))} disabled={savingDetails}>
                {editing ? (savingDetails ? 'Saving…' : 'Save') : 'Edit'}
              </Button>
            }>
            <Stack spacing={1.75} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.5}>
                <Field label="First name" value={details.first_name} editing={editing}
                  onChange={(v) => setDetails(d => ({ ...d, first_name: v }))} />
                <Field label="Last name" value={details.last_name} editing={editing}
                  onChange={(v) => setDetails(d => ({ ...d, last_name: v }))} />
              </Stack>
              <Field label="Username" value={details.username} editing={editing}
                onChange={(v) => setDetails(d => ({ ...d, username: v }))} />
              <Field label="Email" value={details.email} editing={editing} type="email"
                onChange={(v) => setDetails(d => ({ ...d, email: v }))} />
              <Field label="Phone" value={details.phone} editing={editing} type="tel"
                placeholder="Not set"
                onChange={(v) => setDetails(d => ({ ...d, phone: v }))} />
            </Stack>
          </SectionCard>
        </Reveal>

        {/* Feel — tactile finish, mutable and remembered */}
        <Reveal index={2}>
          <SectionCard icon={<TouchAppIcon />} title="Feel">
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              <FeelRow label="Haptics" hint="A gentle buzz on key actions (supported phones)"
                checked={!!feel.haptics} onChange={() => toggleFeel('haptics')} />
              <FeelRow label="Sound" hint="Soft, synthesized cues — off by default"
                checked={!!feel.sound} onChange={() => toggleFeel('sound')} />
            </Stack>
          </SectionCard>
        </Reveal>

        {/* Telegram — the on-the-go channel */}
        <Reveal index={3}>
          <TelegramConnect />
        </Reveal>

        {/* Apple Shortcuts — API key generation */}
        <Reveal index={4}>
          <ShortcutConnect />
        </Reveal>

        {/* Password */}
        <Reveal index={5}>
          <SectionCard icon={<LockIcon />} title="Password">
            <Stack spacing={1.75} sx={{ mt: 1 }}>
              <TextField size="small" fullWidth label="Current password" type={showPw ? 'text' : 'password'}
                value={pw.old_password} onChange={(e) => setPw(p => ({ ...p, old_password: e.target.value }))}
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw(s => !s)} edge="end">
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>) }} />
              <Box>
                <TextField size="small" fullWidth label="New password" type={showPw ? 'text' : 'password'}
                  value={pw.new_password} onChange={(e) => setPw(p => ({ ...p, new_password: e.target.value }))} />
                {pw.new_password && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={(strength.score / 4) * 100}
                      sx={{ height: 5, borderRadius: 999, '& .MuiLinearProgress-bar': { backgroundColor: strength.color } }} />
                    <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600 }}>{strength.label}</Typography>
                  </Box>
                )}
              </Box>
              <TextField size="small" fullWidth label="Confirm new password" type={showPw ? 'text' : 'password'}
                value={pw.new_password_confirm} onChange={(e) => setPw(p => ({ ...p, new_password_confirm: e.target.value }))}
                error={!!pw.new_password_confirm && pw.new_password !== pw.new_password_confirm}
                helperText={pw.new_password_confirm && pw.new_password !== pw.new_password_confirm ? "Doesn't match" : ' '} />
              <Button variant="contained" onClick={savePassword}
                disabled={savingPw || !pw.old_password || !pw.new_password}>
                {savingPw ? 'Changing…' : 'Change password'}
              </Button>
            </Stack>
          </SectionCard>
        </Reveal>

        {/* Security / MPIN */}
        <Reveal index={6}>
          <SectionCard icon={<PinIcon />} title="Security · MPIN">
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {hasMpin
                ? 'Change the 6-digit PIN you use to unlock the app.'
                : 'Set a 6-digit PIN so you can unlock the app quickly next time.'}
            </Typography>
            <Stack spacing={2.25}>
              {hasMpin && (
                <Box>
                  <Typography component="label" htmlFor="mpin-current" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Current MPIN
                  </Typography>
                  <MpinInput id="mpin-current" label="Current 6-digit MPIN" value={mpin.current}
                    onChange={(v) => { setMpin(m => ({ ...m, current: v })); if (mpinError) setMpinError(''); }} />
                </Box>
              )}
              <Box>
                <Typography component="label" htmlFor="mpin-next" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {hasMpin ? 'New MPIN' : 'Choose MPIN'}
                </Typography>
                <MpinInput id="mpin-next" label={hasMpin ? 'New 6-digit MPIN' : 'Choose a 6-digit MPIN'} value={mpin.next}
                  onChange={(v) => { setMpin(m => ({ ...m, next: v })); if (mpinError) setMpinError(''); }} />
              </Box>
              <Box>
                <Typography component="label" htmlFor="mpin-confirm" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Confirm MPIN
                </Typography>
                <MpinInput id="mpin-confirm" label="Confirm 6-digit MPIN" value={mpin.confirm}
                  onChange={(v) => { setMpin(m => ({ ...m, confirm: v })); if (mpinError) setMpinError(''); }}
                  status={mpin.confirm.length === 6 ? (mpin.next === mpin.confirm ? 'success' : 'error') : 'idle'} />
              </Box>
              {mpinError && !resetOpen && (
                <Typography variant="caption" color="error.main">{mpinError}</Typography>
              )}
              <Button variant="contained" onClick={saveMpin}
                disabled={savingMpin || mpin.next.length !== 6 || mpin.confirm.length !== 6 || (hasMpin && mpin.current.length !== 6)}
                sx={{ backgroundColor: accents.mint, '&:hover': { backgroundColor: accents.mint }, color: '#04120d' }}>
                {savingMpin ? 'Saving…' : hasMpin ? 'Change MPIN' : 'Set MPIN'}
              </Button>

              {/* Forgot MPIN — reset via the emailed-code flow */}
              {!resetOpen ? (
                <Link component="button" type="button" variant="body2" underline="hover" sx={{ color: 'text.secondary', alignSelf: 'flex-start' }}
                  onClick={() => { setResetOpen(true); setResetStep('request'); setMpinError(''); }}>
                  Forgot your MPIN? Reset it by email
                </Link>
              ) : (
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  {resetStep === 'request' ? (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        We'll email a reset code to {details.email || 'your account'}. Enter it, then choose a new MPIN.
                      </Typography>
                      <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" size="small" onClick={startMpinReset} disabled={resetBusy}>
                          {resetBusy ? 'Sending…' : 'Email me a code'}
                        </Button>
                        <Button size="small" color="inherit" onClick={() => { setResetOpen(false); setMpinError(''); }}>Cancel</Button>
                      </Stack>
                    </>
                  ) : (
                    <>
                      <TextField size="small" fullWidth label="Reset code" value={resetCode}
                        onChange={(e) => { setResetCode(e.target.value); if (mpinError) setMpinError(''); }}
                        inputProps={{ inputMode: 'numeric' }} sx={{ mb: 1.5 }} />
                      <Typography component="label" htmlFor="mpin-reset-new" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        New MPIN
                      </Typography>
                      <MpinInput id="mpin-reset-new" label="New 6-digit MPIN" value={resetMpin}
                        onChange={(v) => { setResetMpin(v); if (mpinError) setMpinError(''); }} />
                      {mpinError && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{mpinError}</Typography>}
                      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                        <Button variant="contained" size="small" onClick={finishMpinReset}
                          disabled={resetBusy || !resetCode.trim() || resetMpin.length !== 6}>
                          {resetBusy ? 'Resetting…' : 'Reset MPIN'}
                        </Button>
                        <Button size="small" color="inherit" onClick={() => { setResetOpen(false); setResetStep('request'); setResetCode(''); setResetMpin(''); setMpinError(''); }}>Cancel</Button>
                      </Stack>
                    </>
                  )}
                </Box>
              )}
            </Stack>
          </SectionCard>
        </Reveal>

        {/* Danger zone */}
        <Reveal index={7}>
          <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'rgba(255,69,58,0.4)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
                <Box sx={{ width: 30, height: 30, borderRadius: '9px', backgroundColor: 'rgba(255,69,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DeleteSweepIcon sx={{ color: accents.red, fontSize: 18 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Danger zone</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Permanently delete all your expenses, splits, groups and health logs. This can't be undone.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button color="error" variant="outlined" startIcon={<DeleteSweepIcon />} onClick={() => setConfirmClear(true)}>
                  Clear all data
                </Button>
                <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => logout?.()}>
                  Log out
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Reveal>

        <ConfirmDialog
          open={confirmClear}
          title="Delete everything?"
          message="This permanently deletes all your expenses, splits, groups and health logs. It can't be undone."
          confirmLabel="Yes, delete everything"
          destructive
          loading={clearing}
          onConfirm={doClear}
          onCancel={() => setConfirmClear(false)}
        />

        <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 24, md: 24 } }}>
          <Alert severity="success" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>{toast}</Alert>
        </Snackbar>
        <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 3 }}>{error}</Alert>
        </Snackbar>
      </Container>
    </>
  );
}

function SectionCard({ icon, title, action, children }) {
  // Monochrome hairline icon chip — matches the app's PageHeader treatment so
  // every section header reads from one system rather than a rainbow of tints.
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', flexShrink: 0, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              {React.cloneElement(icon, { sx: { fontSize: 18 } })}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{title}</Typography>
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function FeelRow({ label, hint, checked, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
      </Box>
      <Switch checked={checked} onChange={onChange} inputProps={{ 'aria-label': label }} />
    </Box>
  );
}

function Field({ label, value, editing, onChange, type = 'text', placeholder }) {
  if (editing) {
    return <TextField size="small" fullWidth label={label} type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>{value || '—'}</Typography>
    </Box>
  );
}
