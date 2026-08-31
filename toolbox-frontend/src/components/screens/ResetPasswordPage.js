import React, { useMemo, useState } from 'react';
import {
  Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider, LinearProgress,
} from '@mui/material';
import { Lock as LockIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../rest/userApis';
import AuthShell from '../ui/AuthShell';
import { accents } from '../../theme/tokens';

// Same cheap, honest meter as the profile screen, kept consistent.
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', color: accents.red };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(s, 4);
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score], color: [accents.red, accents.red, accents.amber, accents.blue, accents.green][score] };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const strength = useMemo(() => scorePassword(pw), [pw]);
  const badLink = !uid || !token;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (pw !== confirm) { setError('The passwords do not match.'); return; }
    if (strength.score < 2) { setError('Choose a stronger password.'); return; }
    setLoading(true);
    try {
      const res = await confirmPasswordReset({ uid, token, newPassword: pw, newPasswordConfirm: confirm });
      if (!res.token) throw new Error(res.error || 'This reset link is invalid or has expired.');
      // Full load so the auth context re-initialises with the signed-in profile.
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <LockResetIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">Set a new password</Typography>
          <Typography variant="body2" color="text.secondary">Choose a password you don't use elsewhere</Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {badLink ? (
        <Box textAlign="center" sx={{ py: 1 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>This reset link is incomplete or invalid.</Alert>
          <Button variant="contained" onClick={() => navigate('/forgot-password')}>Request a new link</Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={submit}>
          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
          <TextField
            fullWidth label="New password" type="password" value={pw} required autoComplete="new-password"
            onChange={(e) => setPw(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment> }}
          />
          {pw && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={(strength.score / 4) * 100}
                sx={{ height: 5, borderRadius: 999, '& .MuiLinearProgress-bar': { backgroundColor: strength.color } }} />
              <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600 }}>{strength.label}</Typography>
            </Box>
          )}
          <TextField
            fullWidth label="Confirm new password" type="password" value={confirm} required autoComplete="new-password"
            sx={{ mt: 2 }}
            error={!!confirm && pw !== confirm}
            helperText={confirm && pw !== confirm ? "Doesn't match" : ' '}
            onChange={(e) => setConfirm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.3 }}>
            {loading ? 'Saving…' : 'Reset password & sign in'}
          </Button>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => navigate('/login')}>Back to sign in</Link>
          </Box>
        </Box>
      )}
    </AuthShell>
  );
}
