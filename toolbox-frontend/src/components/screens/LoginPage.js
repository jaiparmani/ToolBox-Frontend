import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Alert, InputAdornment, Link } from '@mui/material';
import {
  Person as PersonIcon, Lock as LockIcon, PinRounded, LockRounded, ShieldRounded,
  MailOutlineRounded, ArrowBackRounded, BoltRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { requestOtp, verifyOtp, mpinLogin, requestMpinReset, confirmMpinReset } from '../rest/userApis';
import MpinField from '../ui/MpinField';
import UnlockOverlay from '../motion/UnlockOverlay';
import BrandLogo from '../motion/BrandLogo';
import AuthShell from '../ui/AuthShell';
import { feedback } from '../ui/feedback';
import { accents, type } from '../../theme/tokens';

/**
 * Unlock your account.
 *
 * The MPIN pad is the hero and the default path. Email-OTP and password are
 * quiet, deliberate alternatives you *opt into* — never a mandatory follow-up.
 * On success the whole screen hands off to the UnlockOverlay: the vault clicks
 * open, then we fall through to the app, so signing in feels like unlocking
 * something rather than submitting a form.
 *
 * Every auth handler, API call, validation, error path and remember-device
 * behaviour is preserved exactly; this file only reorganises the surface around
 * MPIN and adds the cinematic layer on top.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const reduce = useReducedMotion();
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
  const [unlocked, setUnlocked] = useState(null);      // null | { label } → plays the success overlay

  const finish = () => { window.location.href = '/'; };
  const succeed = (label) => setUnlocked({ label });   // hand off to the unlock cinematic

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
      feedback('success');
      succeed('Welcome back');
    } catch (err) {
      setPinStatus('error');
      feedback('error');
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
      feedback('success');
      succeed('MPIN updated');
    } catch (err) {
      setPinStatus('error');
      feedback('error');
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
      succeed('Welcome back');
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
      succeed('Welcome back');
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
    <Box
      component="label"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mt: 1.25, cursor: 'pointer', userSelect: 'none' }}
    >
      <Box
        component="input" type="checkbox" checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
        sx={{ width: 17, height: 17, accentColor: accents.blue, cursor: 'pointer' }}
      />
      <Typography variant="body2" color="text.secondary">Remember this device</Typography>
    </Box>
  );

  const idField = (autoFocus) => (
    <TextField
      fullWidth label="Email or username" value={identifier} required autoFocus={autoFocus} autoComplete="username"
      onChange={(e) => setIdentifier(e.target.value)}
      InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
    />
  );

  // Motion for the mode-switch: content slides + fades, the card height morphs
  // (framer `layout`) so it feels like re-configuring one panel, not navigating.
  const panelKey = `${method}:${method === 'otp' ? otpStep : method === 'mpin-reset' ? resetStep : ''}`;
  const panelVariants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, x: 22, filter: 'blur(6px)' },
        animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
      };
  const panelTransition = { duration: reduce ? 0.18 : 0.34, ease: [0.32, 0.72, 0, 1] };

  return (
    <AuthShell maxWidth={{ xs: 430, md: 780 }}>
      {/* Header — brand + secure status (spans both columns) */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={{ xs: 2, md: 3 }}>
        <Box display="flex" alignItems="center" gap={1.25}>
          <BrandLogo size={30} />
          <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            ToolBox
          </Typography>
        </Box>
        <SecureBadge />
      </Box>

      {/* Two-column "console" on desktop; a single stacked column on mobile. */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0,0.92fr) minmax(0,1.08fr)' },
        columnGap: { md: 4 }, alignItems: 'center',
      }}>
        {/* ── Identity · greeting · reassurance (the calm left panel) ── */}
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'row', md: 'column' },
          alignItems: { xs: 'center', md: 'flex-start' }, gap: 2, mb: { xs: 2, md: 0 },
          pr: { md: 4 }, borderRight: { md: '1px solid' }, borderColor: { md: 'divider' },
          alignSelf: { md: 'stretch' }, justifyContent: { md: 'center' },
        }}>
          <UnlockCrest />
          <Box sx={{ minWidth: 0, position: 'relative', flex: { xs: 1, md: 'unset' } }}>
            <motion.div
              key={heroTitle}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            >
              <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: { xs: 'clamp(1.4rem,6vw,1.6rem)', md: '1.9rem' }, letterSpacing: '-0.02em', lineHeight: 1.1, mt: { md: 2 } }}>
                {heroTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{heroSub}</Typography>
            </motion.div>
            <ReassurancePoints />
          </Box>
        </Box>

        {/* ── Interactive auth column ── */}
        <Box sx={{ minWidth: 0 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && (method === 'otp' ? otpStep === 'code' : method === 'mpin-reset' ? resetStep === 'confirm' : false) &&
        <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      {/* Height-morphing container: swaps between auth modes without a hard cut.
          The panel is an enter-only keyed remount (no exit-wait) so the mode
          always advances instantly — even if an animation is throttled. */}
      <motion.div layout={!reduce} transition={{ layout: { duration: 0.34, ease: [0.32, 0.72, 0, 1] } }} style={{ position: 'relative' }}>
          <motion.div
            key={panelKey}
            initial={panelVariants.initial}
            animate={panelVariants.animate}
            transition={panelTransition}
          >
            {/* ---------- MPIN: the hero, shown by default ---------- */}
            {method === 'mpin' && (
              <Box>
                <Box sx={{ mb: 2 }}>{idField(true)}</Box>
                <MpinField value={mpin} onChange={(v) => { setMpin(v); if (pinStatus === 'error') setPinStatus('idle'); }}
                  onComplete={(p) => doMpin(p)} status={pinStatus} disabled={loading || pinStatus === 'success'} autoFocus={false} />
                <Button fullWidth variant="contained" size="large" disabled={loading || mpin.length !== 6 || pinStatus === 'success'}
                  onClick={() => doMpin()} sx={{ mt: 2.25, py: 1.15 }}>
                  {pinStatus === 'success' ? 'Unlocked ✓' : loading ? 'Unlocking…' : 'Unlock'}
                </Button>
                {rememberRow}
                <SecurityNote />

                {/* Clear hierarchy: OTP is a distinct, secondary path — not an equal link */}
                <AltDivider />
                <Button
                  fullWidth variant="outlined" size="large"
                  startIcon={<MailOutlineRounded />}
                  onClick={() => switchTo('otp')}
                  sx={{
                    py: 1, color: 'text.secondary', borderColor: 'divider',
                    '&:hover': { borderColor: `${accents.blue}88`, backgroundColor: `${accents.blue}0d`, color: 'text.primary' },
                  }}
                >
                  Use Email OTP instead
                </Button>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75, mt: 1.75 }}>
                  <Link component="button" type="button" variant="body2" underline="hover" sx={{ color: 'text.disabled' }} onClick={() => switchTo('mpin-reset')}>Forgot MPIN?</Link>
                  <Typography variant="body2" color="text.disabled">·</Typography>
                  <Link component="button" type="button" variant="body2" underline="hover" sx={{ color: 'text.disabled' }} onClick={() => switchTo('password')}>Use password</Link>
                </Box>
              </Box>
            )}

            {/* ---------- MPIN reset (forgot) ---------- */}
            {method === 'mpin-reset' && (resetStep === 'request' ? (
              <Box component="form" onSubmit={sendResetCode}>
                {idField(true)}
                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2.25, py: 1.15 }}>
                  {loading ? 'Sending…' : 'Email me a reset code'}
                </Button>
                <BackRow onClick={() => switchTo('mpin')} label="Back to MPIN" />
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
                  onClick={() => doResetConfirm()} sx={{ mt: 2.25, py: 1.15 }}>
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
                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2.25, py: 1.15 }}>
                  {loading ? 'Sending…' : 'Email me a code'}
                </Button>
                <BackRow onClick={() => switchTo('mpin')} label="Back to MPIN" />
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
                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.15 }}>
                  {loading ? 'Verifying…' : 'Verify & sign in'}
                </Button>
                <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
                  <Link component="button" type="button" variant="body2"
                    onClick={() => { setOtpStep('identify'); setCode(''); setInfo(null); setError(null); }}>← Change details</Link>
                  <Link component="button" type="button" variant="body2" onClick={sendCode}>Resend code</Link>
                </Box>
                <BackRow onClick={() => switchTo('mpin')} label="Back to MPIN" subtle />
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
                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.15 }}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
                <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
                  <Link component="button" type="button" variant="body2" onClick={() => navigate('/forgot-password')}>Forgot password?</Link>
                  <Link component="button" type="button" variant="body2" onClick={() => switchTo('mpin')}>← Use MPIN instead</Link>
                </Box>
              </Box>
            )}
          </motion.div>
      </motion.div>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 2.25, pt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component="button" type="button" variant="body2" sx={{ fontWeight: 600 }} onClick={() => navigate('/register')}>Create one</Link>
            </Typography>
          </Box>
        </Box>{/* /interactive auth column */}
      </Box>{/* /two-column grid */}

      {/* The signature success cinematic */}
      {unlocked && <UnlockOverlay label={unlocked.label} onDone={finish} />}
    </AuthShell>
  );
}

/** A tiny "encrypted / secure" status pill — reassurance through restraint. */
function SecureBadge() {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.4, borderRadius: 999,
      border: '1px solid', borderColor: 'divider',
      background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    }}>
      <Box sx={{
        width: 6, height: 6, borderRadius: '50%', background: accents.mint,
        boxShadow: `0 0 8px ${accents.mint}`,
        '@keyframes securePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        animation: 'securePulse 2.4s ease-in-out infinite',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }} />
      <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.02em', color: 'text.secondary' }}>Secure</Typography>
    </Box>
  );
}

/** The unlock crest — a lock in a breathing, spinning aura. The security hero. */
function UnlockCrest() {
  return (
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
}

/**
 * The left-panel trust markers — desktop only, where there's room. Quiet,
 * icon-led, never shouty: security felt through restraint.
 */
function ReassurancePoints() {
  const items = [
    { icon: <ShieldRounded sx={{ fontSize: 16 }} />, label: 'Bank-grade encryption' },
    { icon: <BoltRounded sx={{ fontSize: 16 }} />, label: 'One tap, six digits, in' },
    { icon: <LockRounded sx={{ fontSize: 16 }} />, label: 'Private — we never see your PIN' },
  ];
  return (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1.25, mt: 3.5 }}>
      {items.map((it, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'text.secondary' }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
            display: 'grid', placeItems: 'center', color: accents.cyan,
            background: `${accents.cyan}14`, border: '1px solid', borderColor: `${accents.cyan}2e`,
          }}>{it.icon}</Box>
          <Typography variant="body2">{it.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Rate-limit reassurance under the primary action. */
function SecurityNote() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" gap={0.75} sx={{ mt: 1, color: 'text.disabled' }}>
      <ShieldRounded sx={{ fontSize: 15 }} />
      <Typography variant="caption">Encrypted &amp; rate-limited — 5 tries, then a short cooldown.</Typography>
    </Box>
  );
}

/** "or" divider that separates the hero from the secondary path. */
function AltDivider() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.08em' }}>OR</Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Box>
  );
}

/** Consistent "← Back to MPIN" affordance. */
function BackRow({ onClick, label, subtle }) {
  return (
    <Box textAlign="center" sx={{ mt: subtle ? 2.5 : 2 }}>
      <Link component="button" type="button" variant="body2" underline="hover"
        onClick={onClick}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: subtle ? 'text.disabled' : 'primary.main' }}>
        <ArrowBackRounded sx={{ fontSize: 16 }} /> {label}
      </Link>
    </Box>
  );
}

