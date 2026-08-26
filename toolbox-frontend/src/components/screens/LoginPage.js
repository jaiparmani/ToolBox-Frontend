import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider } from '@mui/material';
import { Person as PersonIcon, Login, PinRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../rest/userApis';
import { AuroraShell } from './ForgotPasswordPage';

/**
 * Passwordless login. Enter an email or username, we email a one-time code, you
 * type it in — no password. Two steps: identify, then verify.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('identify'); // 'identify' | 'code'
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!identifier.trim()) { setError('Enter your email or username.'); return; }
    setLoading(true);
    try {
      await requestOtp(identifier.trim());
      setStep('code');
      setInfo("If that account exists, a 6-digit code is on its way to its email. It expires in 10 minutes.");
    } catch (err) {
      setError(err.message || 'Could not send a code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your email.'); return; }
    setLoading(true);
    try {
      const res = await verifyOtp(identifier.trim(), code.trim());
      if (!res.token) throw new Error(res.error || 'That code is invalid or has expired.');
      // Full load so the auth context re-initialises with the signed-in profile.
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'That code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraShell>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Login sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">Sign in</Typography>
          <Typography variant="body2" color="text.secondary">
            {step === 'identify' ? "We'll email you a one-time code — no password" : `Enter the code we sent for ${identifier}`}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {step === 'code' && info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      {step === 'identify' ? (
        <Box component="form" onSubmit={sendCode}>
          <TextField
            fullWidth label="Email or username" value={identifier} required autoFocus autoComplete="username"
            onChange={(e) => setIdentifier(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Sending…' : 'Email me a code'}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={verify}>
          <TextField
            fullWidth label="6-digit code" value={code} required autoFocus autoComplete="one-time-code"
            inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.5em', fontSize: '1.35rem', textAlign: 'center' } }}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            InputProps={{ startAdornment: <InputAdornment position="start"><PinRounded /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2"
              onClick={() => { setStep('identify'); setCode(''); setInfo(null); setError(null); }}>
              ← Change email
            </Link>
            <Link component="button" type="button" variant="body2" onClick={sendCode}>Resend code</Link>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />
      <Box textAlign="center">
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link component="button" type="button" variant="body2" onClick={() => navigate('/register')}>Create one</Link>
        </Typography>
      </Box>
    </AuroraShell>
  );
}
