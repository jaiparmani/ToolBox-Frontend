import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Alert, InputAdornment, Link, Divider, FormControlLabel, Checkbox } from '@mui/material';
import { Person as PersonIcon, Lock as LockIcon, PinRounded, LockRounded, ShieldRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestOtp, verifyOtp, mpinLogin, requestMpinReset, confirmMpinReset } from '../rest/userApis';
import { AuroraShell } from './ForgotPasswordPage';
import MpinField from '../ui/MpinField';
import { accents, type } from '../../theme/tokens';

/**
 * Unlock the account. The MPIN pad is the hero and the default path; email-OTP
 * and password are quiet, deliberate alternatives you opt into, not equal
 * mandatory steps. All the existing auth logic (token storage, remember-device,
 * generic errors) is preserved — this reorganises the surface around MPIN.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [method, setMethod] = useState('mpin');       // 'mpin' | 'otp' | 'password' | 'mpin-reset'
  const [otpStep, setOtpStep] = useState('identify');  // 'identify' | 'code'
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [pinStatus, setPinStatus] = useState('idle');  // 'idle' | 'error' | 'success'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [remember, setRemember] = useState(true);

  const finish = () => { window.location.href = '/'; };

  // ---- MPIN (primary) ----
  const doMpin = async (pin) => {
    const p = (pin ?? mpin);
    setError(null);
    if (!identifier.trim()) { setError('Enter your email or username first.'); return; }
    if (p.length !== 6 || loading) return;
    setLoading(true);
    try {
      const res = await mpinLogin(identifier.trim(), p, remember);
      if (!res.token) throw new Error(res.error || 'Invalid credentials.');
      setPinStatus('success');
      setTimeout(finish, 560);
    } catch (err) {
      setPinStatus('error');
      setError(err.message || 'That MPIN is not right.');
      setTimeout(() => { setMpin(''); setPinStatus('idle'); }, 520);
    } finally { setLoading(false); }
  };

  // ---- MPIN reset (forgot) ----
  const sendResetCode = async (e) => {
    e?.preventDefault(); setError(null);
    if (!identifier.trim()) { setError('Enter your email or username.'); return; }
    setLoading(true);
    try {
      await requestMpinReset(identifier.trim());
      setResetStep('confirm'); setMpin(''); setPinStatus('idle');
      setInfo("If that account exists, a 6-digit reset code is on its way to its email. It expires in 10 minutes.");
    } catch (err) { setError(err.message || 'Could not send a code. Please try again.'); }
    finally { setLoading(false); }
  };

  const doResetConfirm = async (pin) => {
    const p = (pin ?? mpin);
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your email.'); return; }
    if (p.length !== 6 || loading) return;
    setLoading(true);
    try {
      const res = await confirmMpinReset(identifier.trim(), code.trim(), p, remember);
      if (!res.token) throw new Error(res.error || 'That code is invalid or has expired.');
      setPinStatus('success');
      setTimeout(finish, 560);
    } catch (err) {
      setPinStatus('error');
      setError(err.message || 'Could not reset your MPIN. Check the code and try again.');
      setTimeout(() => { setMpin(''); setPinStatus('idle'); }, 520);
    } finally { setLoading(false); }
  };

  // ---- Email OTP (alternative) ----
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

  // ---- Password (alternative) ----
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

  const switchTo = (m) => {
    setMethod(m); setError(null); setInfo(null);
    setOtpStep('identify'); setResetStep('request');
    setCode(''); setPassword(''); setMpin(''); setPinStatus('idle');
  };

  const heroTitle = method === 'mpin' ? 'Unlock your account'
    : method === 'mpin-reset' ? 'Reset your MPIN'
    : method === 'otp' ? 'Sign in with a code'
    : 'Sign in with a password';
  const heroSub = method === 'mpin' ? 'Enter your 6-digit MPIN'
    : method === 'mpin-reset' ? (resetStep === 'request' ? "We'll email you a reset code" : `Enter the code we sent, then choose a new MPIN`)
    : method === 'otp' ? (otpStep === 'identify' ? "We'll email you a one-time code" : `Enter the code we sent for ${identifier}`)
    : 'Use your account password';

  const rememberRow = (
    <FormControlLabel
      sx={{ mt: 1, ml: 0 }}
      control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} sx={{ py: 0.25 }} />}
      label={<Typography variant="body2" color="text.secondary">Remember this device</Typography>}
    />
  );

  // The unlock crest — a lock in a breathing, spinning aura. The security hero.
  const crest = (
    <Box aria-hidden sx={{ position: 'relative', width: 64, height: 64, flexShrink: 0,
      '@keyframes crestSpin': { to: { transform: 'rotate(360deg)' } },
      '@keyframes crestPulse': { '0%,100%': { opacity: 0.5, transform: 'scale(1)' }, '50%': { opacity: 0.85, transform: 'scale(1.12)' } },
    }}>
      <Box sx={{ position: 'absolute', inset: -8, borderRadius: '50%',
        background: `radial-gradient(circle, ${accents.cyan}55, transparent 68%)`, filter: 'blur(9px)',
        animation: 'crestPulse 3.4s ease-in-out infinite', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
      <Box sx={{ position: 'absolute', inset: -2, borderRadius: '50%', padding: '2px',
        background: `conic-gradient(from 0deg, transparent, ${accents.cyan} 22%, ${accents.violet} 40%, transparent 62%)`,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude',
        animation: 'crestSpin 4.6s linear infinite', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
      <Box sx={{ position: 'absolute', inset: 8, borderRadius: '50%',
        background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 10px 26px -8px ${accents.violet}, inset 0 1px 0 rgba(255,255,255,0.4)` }}>
        <LockRounded sx={{ color: '#fff', fontSize: 24 }} />
      </Box>
    </Box>
  );

  const idField = (autoFocus) => (
    <TextField
      fullWidth label="Email or username" value={identifier} required autoFocus={autoFocus} autoComplete="username"
      onChange={(e) => setIdentifier(e.target.value)}
      InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
    />
  );

  return (
    <AuroraShell>
      <Box display="flex" alignItems="center" gap={2} mb={2.5}>
        {crest}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.7rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {heroTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">{heroSub}</Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 2.5 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && (method === 'otp' ? otpStep === 'code' : method === 'mpin-reset' ? resetStep === 'confirm' : false) &&
        <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      {/* ---------- MPIN: the hero, shown by default ---------- */}
      {method === 'mpin' && (
        <Box>
          <Box sx={{ mb: 2 }}>{idField(true)}</Box>
          <MpinField value={mpin} onChange={(v) => { setMpin(v); if (pinStatus === 'error') setPinStatus('idle'); }}
            onComplete={(p) => doMpin(p)} status={pinStatus} disabled={loading || pinStatus === 'success'} autoFocus={false} />
          <Button fullWidth variant="contained" size="large" disabled={loading || mpin.length !== 6 || pinStatus === 'success'}
            onClick={() => doMpin()} sx={{ mt: 3, py: 1.3 }}>
            {pinStatus === 'success' ? 'Unlocked ✓' : loading ? 'Unlocking…' : 'Unlock'}
          </Button>
          {rememberRow}
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.75} sx={{ mt: 1.5, color: 'text.disabled' }}>
            <ShieldRounded sx={{ fontSize: 15 }} />
            <Typography variant="caption">Encrypted &amp; rate-limited — 5 tries, then a short cooldown.</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('mpin-reset')}>Forgot MPIN?</Link>
            <Typography variant="body2" color="text.disabled">·</Typography>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('otp')}>Use Email OTP instead</Link>
            <Typography variant="body2" color="text.disabled">·</Typography>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('password')}>Password</Link>
          </Box>
        </Box>
      )}

      {/* ---------- MPIN reset (forgot) ---------- */}
      {method === 'mpin-reset' && (resetStep === 'request' ? (
        <Box component="form" onSubmit={sendResetCode}>
          {idField(true)}
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Sending…' : 'Email me a reset code'}
          </Button>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('mpin')}>← Back to MPIN</Link>
          </Box>
        </Box>
      ) : (
        <Box>
          <TextField
            fullWidth label="6-digit reset code" value={code} required autoFocus autoComplete="one-time-code" sx={{ mb: 2.5 }}
            inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.5em', fontSize: '1.25rem', textAlign: 'center' } }}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            InputProps={{ startAdornment: <InputAdornment position="start"><PinRounded /></InputAdornment> }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1.5 }}>Choose a new MPIN</Typography>
          <MpinField value={mpin} onChange={(v) => { setMpin(v); if (pinStatus === 'error') setPinStatus('idle'); }}
            onComplete={(p) => doResetConfirm(p)} status={pinStatus} disabled={loading || pinStatus === 'success'} autoFocus={false} />
          <Button fullWidth variant="contained" size="large" disabled={loading || mpin.length !== 6 || pinStatus === 'success'}
            onClick={() => doResetConfirm()} sx={{ mt: 3, py: 1.3 }}>
            {pinStatus === 'success' ? 'Done ✓' : loading ? 'Setting…' : 'Set new MPIN & sign in'}
          </Button>
          {rememberRow}
          <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => { setResetStep('request'); setCode(''); setInfo(null); setError(null); }}>← Change details</Link>
            <Link component="button" type="button" variant="body2" onClick={sendResetCode}>Resend code</Link>
          </Box>
        </Box>
      ))}

      {/* ---------- Email OTP (alternative) ---------- */}
      {method === 'otp' && (otpStep === 'identify' ? (
        <Box component="form" onSubmit={sendCode}>
          {idField(true)}
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.3 }}>
            {loading ? 'Sending…' : 'Email me a code'}
          </Button>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('mpin')}>← Use MPIN instead</Link>
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
      ))}

      {/* ---------- Password (alternative) ---------- */}
      {method === 'password' && (
        <Box component="form" onSubmit={doPassword}>
          {idField(true)}
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
            <Link component="button" type="button" variant="body2" onClick={() => switchTo('mpin')}>← Use MPIN instead</Link>
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
