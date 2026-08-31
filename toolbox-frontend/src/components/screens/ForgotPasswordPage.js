import React, { useState } from 'react';
import {
  Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider,
} from '@mui/material';
import { Email as EmailIcon, LockReset as LockResetIcon, MarkEmailReadRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../rest/userApis';
import AuthShell from '../ui/AuthShell';

/**
 * Forgot password — request a reset link. Deliberately shows the same "if that
 * email has an account…" message whether or not the email exists, matching the
 * backend, so it can't be used to probe for accounts.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <LockResetIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">Reset password</Typography>
          <Typography variant="body2" color="text.secondary">We'll email you a link to set a new one</Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {sent ? (
        <Box textAlign="center" sx={{ py: 1 }}>
          <MarkEmailReadRounded sx={{ fontSize: 52, color: 'success.main', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 650 }}>Check your email</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            If <b>{email.trim()}</b> has an account, a reset link is on its way. The link expires and can be used once.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>Back to sign in</Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={submit}>
          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
          <TextField
            fullWidth label="Email" type="email" value={email} required autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => navigate('/login')}>
              Back to sign in
            </Link>
          </Box>
        </Box>
      )}
    </AuthShell>
  );
}
