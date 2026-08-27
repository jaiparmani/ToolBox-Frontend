import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider, FormControlLabel, Checkbox } from '@mui/material';
import { Person as PersonIcon, Lock as LockIcon, Login, PinRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestOtp, verifyOtp } from '../rest/userApis';
import { AuroraShell } from './ForgotPasswordPage';

/**
 * Sign in two ways from one screen: password (email/username + password) or a
 * one-time code emailed to the account. Toggle between them; the identifier is
 * shared. A full reload after success re-initialises the auth context.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [method, setMethod] = useState('password');   // 'password' | 'otp'
  const [otpStep, setOtpStep] = useState('identify');  // 'identify' | 'code'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [remember, setRemember] = useState(true); // keep this device signed in

  const finish = () => { window.location.href = '/'; };

  const doPassword = async (e) => {
    e?.preventDefault(); setError(null);
    if (!identifier.trim() || !password) { setError('Enter your email/username and password.'); return; }
    setLoading(true);
    try {
      const res = await login(identifier.trim(), password, remember);
      if (!res.success) throw new Error(res.error || 'Invalid credentials.');
      finish();
    } catch (err) { setError(err.message || 'Invalid credentials.'); }
    finally { setLoading(false); }
  };

  const sendCode = async (e) => {
    e?.preventDefault(); setError(null);
    if (!identifier.trim()) { setError('Enter your email or username.'); return; }
    setLoading(true);
    try {
      await requestOtp(identifier.trim());
      setOtpStep('code');
      setInfo("If that account exists, a 6-digit code is on its way to its email. It expires in 10 minutes.");
    } catch (err) { setError(err.message || 'Could not send a code. Please try again.'); }
    finally { setLoading(false); }
  };

  const verify = async (e) => {
    e?.preventDefault(); setError(null);
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your email.'); return; }
    setLoading(true);
    try {
      const res = await verifyOtp(identifier.trim(), code.trim(), remember);
      if (!res.token) throw new Error(res.error || 'That code is invalid or has expired.');
      finish();
    } catch (err) { setError(err.message || 'That code is invalid or has expired.'); }
    finally { setLoading(false); }
  };

  const switchTo = (m) => { setMethod(m); setError(null); setInfo(null); setOtpStep('identify'); setCode(''); setPassword(''); };

  const subtitle = method === 'password'
    ? 'Sign in with your password'
    : otpStep === 'identify' ? "We'll email you a one-time code" : `Enter the code we sent for ${identifier}`;

  const rememberRow = (
    <FormControlLabel
      sx={{ mt: 1, ml: 0 }}
      control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} sx={{ py: 0.25 }} />}
      label={<Typography variant="body2" color="text.secondary">Remember this device</Typography>}
    />
  );

  return (
    <AuroraShell>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Login sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">Sign in</Typography>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {method === 'otp' && otpStep === 'code' && info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      {method === 'password' ? (
        <Box component="form" onSubmit={doPassword}>
          <TextField
            fullWidth label="Email or username" value={identifier} required autoFocus autoComplete="username"
            onChange={(e) => setIdentifier(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
          />
          <TextField
            fullWidth label="Password" type="password" value={password} required autoComplete="current-password" sx={{ mt: 2 }}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment> }}
          />
          {rememberRow}
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.3 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => navigate('/forgot-password')}>Forgot password?</Link>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('otp')}>Email me a code instead</Link>
          </Box>
        </Box>
      ) : otpStep === 'identify' ? (
        <Box component="form" onSubmit={sendCode}>
          <TextField
            fullWidth label="Email or username" value={identifier} required autoFocus autoComplete="username"
            onChange={(e) => setIdentifier(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Sending…' : 'Email me a code'}
          </Button>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('password')}>Use a password instead</Link>
          </Box>
        </Box>
      ) : (
        <Box component="form" onSubmit={verify}>
          <TextField
            fullWidth label="6-digit code" value={code} required autoFocus autoComplete="one-time-code"
            inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.5em', fontSize: '1.35rem', textAlign: 'center' } }}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            InputProps={{ startAdornment: <InputAdornment position="start"><PinRounded /></InputAdornment> }}
          />
          {rememberRow}
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.3 }}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2"
              onClick={() => { setOtpStep('identify'); setCode(''); setInfo(null); setError(null); }}>← Change details</Link>
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
