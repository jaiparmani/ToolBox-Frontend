import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { quickAddExpense } from '../rest/expenseTrackerApis';
import { accents } from '../../theme/tokens';

export default function ShareTargetPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Combine all shared fields into one string — PhonePe/GPay may put amount in
  // title ("Payment successful") and merchant in text, or vice versa.
  const sharedText = [params.get('title'), params.get('text'), params.get('url')]
    .filter(Boolean).join(' ').trim();

  const [state, setState] = React.useState('parsing');
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!sharedText) { navigate('/'); return; }
    quickAddExpense(sharedText)
      .then(r => { setResult(r); setState('done'); })
      .catch(e => { setError(e?.message || 'Could not parse'); setState('error'); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2, px: 3,
    }}>
      {state === 'parsing' && (
        <>
          <CircularProgress size={48} sx={{ color: accents.violet }} />
          <Typography variant="body1" color="text.secondary">Logging expense…</Typography>
          {sharedText && (
            <Typography variant="caption" color="text.disabled"
              sx={{ maxWidth: 340, textAlign: 'center', wordBreak: 'break-word' }}>
              "{sharedText}"
            </Typography>
          )}
        </>
      )}

      {state === 'done' && result && (
        <>
          <CheckCircleRoundedIcon sx={{ fontSize: 56, color: accents.green }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Logged!</Typography>
          <Box sx={{
            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
            borderRadius: 3, px: 3, py: 2, textAlign: 'center', minWidth: 220,
          }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: accents.red }}>
              ₹{Number(result.amount).toLocaleString('en-IN')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {result.description || result.category || 'Expense'}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => navigate('/')}
            sx={{ mt: 1, bgcolor: accents.violet, '&:hover': { bgcolor: accents.violet + 'cc' } }}>
            Go to dashboard
          </Button>
        </>
      )}

      {state === 'error' && (
        <>
          <ErrorRoundedIcon sx={{ fontSize: 56, color: accents.red }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Couldn't log this</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 300 }}>
            {error}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>Back to dashboard</Button>
        </>
      )}
    </Box>
  );
}
