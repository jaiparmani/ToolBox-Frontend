import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Container, IconButton, InputAdornment,
  LinearProgress, Paper, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../../contexts/AuthContext';
import { clearAllData } from '../rest/userApis.js';
import NavbarComponent from '../NavbarComponent';
import Reveal from '../ui/Reveal';
import { accents } from '../../theme/tokens';

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
  const color = [accents.red, accents.red, accents.amber, accents.blue, accents.green][score];
  return { score, label, color };
}

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, updateProfile, changePassword, logout } = useAuth();

  const [details, setDetails] = useState({ username: '', email: '', first_name: '', last_name: '' });
  const [editing, setEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [pw, setPw] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) setDetails({
      username: user.username || '', email: user.email || '',
      first_name: user.first_name || '', last_name: user.last_name || '',
    });
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
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" align="center">Authentication Required</Typography>
        </Paper>
      </Container>
    );
  }

  const initial = (details.username || details.email || '?').charAt(0).toUpperCase();
  const fullName = [details.first_name, details.last_name].filter(Boolean).join(' ');

  return (
    <>
      <NavbarComponent />
      <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
        {/* Identity hero */}
        <Reveal>
          <Paper
            elevation={0}
            sx={{
              p: 3, mb: 2.5, borderRadius: 5, textAlign: 'center', position: 'relative', overflow: 'hidden',
              border: '1px solid', borderColor: 'divider',
              '&::before': {
                content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at 50% -20%, rgba(10,132,255,0.22), transparent 60%)',
              },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  width: 84, height: 84, borderRadius: '50%', mx: 'auto', mb: 1.5,
                  background: `linear-gradient(135deg, ${accents.blue}, ${accents.purple})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem', fontWeight: 700, color: '#fff',
                  boxShadow: `0 12px 30px ${accents.blue}55`,
                }}
              >
                {initial}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{fullName || details.username}</Typography>
              <Typography variant="body2" color="text.secondary">{details.email || 'No email set'}</Typography>
            </Box>
          </Paper>
        </Reveal>

        {/* Your details */}
        <Reveal index={1}>
          <SectionCard icon={<PersonIcon />} color={accents.blue} title="Your details"
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
            </Stack>
          </SectionCard>
        </Reveal>

        {/* Password */}
        <Reveal index={2}>
          <SectionCard icon={<LockIcon />} color={accents.amber} title="Password">
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

        {/* Danger zone */}
        <Reveal index={3}>
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
              {!confirmClear ? (
                <Stack direction="row" spacing={1.5}>
                  <Button color="error" variant="outlined" startIcon={<DeleteSweepIcon />} onClick={() => setConfirmClear(true)}>
                    Clear all data
                  </Button>
                  <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => logout?.()}>
                    Log out
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5}>
                  <Button color="error" variant="contained" onClick={doClear} disabled={clearing}>
                    {clearing ? 'Clearing…' : 'Yes, delete everything'}
                  </Button>
                  <Button color="inherit" onClick={() => setConfirmClear(false)}>Cancel</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Reveal>

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

function SectionCard({ icon, color, title, action, children }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 30, height: 30, borderRadius: '9px', backgroundColor: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              {React.cloneElement(icon, { sx: { fontSize: 18 } })}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, editing, onChange, type = 'text' }) {
  if (editing) {
    return <TextField size="small" fullWidth label={label} type={type} value={value}
      onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>{value || '—'}</Typography>
    </Box>
  );
}
