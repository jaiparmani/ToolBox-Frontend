import React, { useState } from 'react';
import {
  Container, Paper, Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider,
} from '@mui/material';
import { Email as EmailIcon, LockReset as LockResetIcon, MarkEmailReadRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../rest/userApis';

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
    <AuroraShell>
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
    </AuroraShell>
  );
}

/** The shared calm-futurism auth shell (matches the login/register screens). */
export function AuroraShell({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden',
        backgroundColor: 'background.default',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: `
            radial-gradient(circle at 15% 20%, rgba(10,132,255,0.35), transparent 42%),
            radial-gradient(circle at 85% 15%, rgba(191,90,242,0.28), transparent 45%),
            radial-gradient(circle at 50% 100%, rgba(255,55,95,0.22), transparent 55%)
          `,
          opacity: (theme) => (theme.palette.mode === 'dark' ? 1 : 0.5),
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4, border: '1px solid', borderColor: 'divider',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30,30,32,0.75)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}
        >
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
