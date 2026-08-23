import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Button, Card, CardContent, Chip, Container, Fab, IconButton,
  Paper, Snackbar, Alert, Stack, Typography,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AddIcon from '@mui/icons-material/Add';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';

import NavbarComponent from '../NavbarComponent';
import MoneyConstellation from '../ui/MoneyConstellation';
import AnimatedNumber from '../ui/AnimatedNumber';
import Reveal from '../ui/Reveal';
import ErrorBanner from '../ui/ErrorBanner';
import { BalanceSkeleton } from '../ui/Skeletons';
import { money, relativeDay } from '../ui/money';
import { getSplitBalances, settleUpWith, getSplits } from '../rest/expenseTrackerApis';

/**
 * Splitting lives on its own page now.
 *
 * As a tab inside the expense tracker it was buried under that page's own
 * state, and "who owes me" is a different question from "what did I spend" -
 * it deserves its own place rather than a fifth tab.
 *
 * The constellation is the entry point: you at the centre, everyone you share
 * money with around you. Selecting a person filters the detail below rather
 * than navigating away, so the overall picture stays visible while you look
 * into one part of it.
 */
export default function SplitsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const [state, setState] = useState({
    loading: true, balances: [], youOwe: [], totalOwed: 0, totalYouOwe: 0, net: 0,
  });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState({ loading: false, items: [] });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [settling, setSettling] = useState(null);

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await getSplitBalances();
      setState({
        loading: false,
        balances: data.balances,
        youOwe: data.youOwe,
        totalOwed: data.totalOwedToYou,
        totalYouOwe: data.totalYouOwe,
        net: data.net,
      });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false }));
      setError(err.message || 'Could not load balances');
    }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  // One list of people, whichever direction the money runs. Someone can appear
  // on both sides, so the two are merged into a single net figure per person.
  const people = React.useMemo(() => {
    const byName = new Map();
    state.balances.forEach(b => {
      byName.set(b.name.toLowerCase(), {
        id: `p${b.personId}`, personId: b.personId, name: b.name,
        net: b.owed, unsettled: b.unsettledCount,
      });
    });
    state.youOwe.forEach(d => {
      const key = d.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.net -= d.owed;
        existing.owedToUserId = d.userId;
        existing.unsettled += d.unsettledCount;
      } else {
        byName.set(key, {
          id: `u${d.userId}`, owedToUserId: d.userId, name: d.name,
          net: -d.owed, unsettled: d.unsettledCount,
        });
      }
    });
    return [...byName.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [state.balances, state.youOwe]);

  const openPerson = async (person) => {
    setSelected(person);
    if (!person) return;
    setDetail({ loading: true, items: [] });
    try {
      const items = await getSplits({ personId: person.personId, settled: 'false' });
      setDetail({ loading: false, items });
    } catch (err) {
      setDetail({ loading: false, items: [] });
    }
  };

  const settle = async (person) => {
    const owedByMe = person.net < 0;
    const label = owedByMe
      ? `Mark the ${money(Math.abs(person.net))} you owe ${person.name} as paid?`
      : `Mark ${person.name}'s ${money(person.net)} as settled?`;
    if (!window.confirm(label)) return;

    setSettling(person.id);
    try {
      const result = await settleUpWith(
        owedByMe ? { owedToUserId: person.owedToUserId } : { personId: person.personId });
      setSuccess(`Settled ${money(result.total)} with ${person.name}`);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message || 'Could not settle');
    } finally {
      setSettling(null);
    }
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

  const netPositive = state.net >= 0;

  return (
    <>
      <NavbarComponent />
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 12 }}>
        <ErrorBanner error={error} onClose={() => setError(null)} />

        {/* The headline: one number saying which way you stand overall */}
        <Reveal>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 }, mb: 2, borderRadius: 4, textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              border: '1px solid', borderColor: 'divider',
              '&::before': {
                content: '""', position: 'absolute', inset: 0,
                background: netPositive
                  ? 'radial-gradient(circle at 50% 0%, rgba(57,135,229,0.18), transparent 60%)'
                  : 'radial-gradient(circle at 50% 0%, rgba(217,79,61,0.18), transparent 60%)',
              },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 0.5 }}>
                <CallSplitIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="overline" color="text.secondary">
                  {netPositive ? 'You are owed, overall' : 'You owe, overall'}
                </Typography>
                <IconButton size="small" onClick={load} sx={{ ml: 0.5 }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography
                sx={{
                  fontWeight: 700, letterSpacing: '-0.03em',
                  fontSize: { xs: '2.4rem', sm: '3rem' },
                  color: netPositive ? '#3987e5' : '#d94f3d',
                }}
              >
                <AnimatedNumber value={Math.abs(state.net)} />
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  owed to you <b>{money(state.totalOwed)}</b>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  you owe <b>{money(state.totalYouOwe)}</b>
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </Reveal>

        {state.loading ? (
          <BalanceSkeleton />
        ) : people.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ p: 5, borderRadius: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}
          >
            <CallSplitIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>Nobody owes anybody</Typography>
            <Typography variant="body2" color="text.secondary">
              Split a bill from the expense tracker and the people will appear here.
            </Typography>
          </Paper>
        ) : (
          <>
            <Reveal index={1}>
              <Paper
                elevation={0}
                sx={{ p: { xs: 1, sm: 2 }, mb: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
              >
                <MoneyConstellation
                  people={people}
                  selectedId={selected?.id}
                  onSelect={openPerson}
                />
                <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', pb: 1 }}>
                  Tap a person to see the bills behind their balance
                </Typography>
              </Paper>
            </Reveal>

            {/* Selecting filters this list instead of navigating away */}
            <Stack spacing={1.25}>
              {(selected ? people.filter(p => p.id === selected.id) : people).map((person, i) => (
                <Reveal key={person.id} index={i + 2}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3, border: '1px solid',
                      borderColor: selected?.id === person.id ? 'primary.main' : 'divider',
                    }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                            {person.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {person.net === 0
                              ? 'all settled'
                              : person.net > 0 ? 'owes you' : 'you owe them'}
                            {person.unsettled ? ` · ${person.unsettled} unsettled` : ''}
                          </Typography>
                        </Box>
                        <Box textAlign="right" sx={{ flexShrink: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                              color: person.net === 0 ? 'text.secondary'
                                : person.net > 0 ? '#3987e5' : '#d94f3d',
                            }}
                          >
                            {person.net > 0 ? '+' : person.net < 0 ? '−' : ''}
                            {money(Math.abs(person.net))}
                          </Typography>
                          {person.net !== 0 && (
                            <Button
                              size="small"
                              startIcon={<DoneAllIcon />}
                              onClick={() => settle(person)}
                              disabled={settling === person.id}
                              sx={{ mt: 0.5 }}
                            >
                              {settling === person.id ? 'Settling…' : 'Settle'}
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {selected?.id === person.id && detail.items.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          {detail.items.slice(0, 6).map((item) => (
                            <Box key={item.id} display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ pr: 1 }}>
                                {item.description}
                                <Chip
                                  label={relativeDay(item.date)}
                                  size="small"
                                  sx={{ ml: 1, height: 17, fontSize: '0.62rem' }}
                                />
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                                {money(item.amount)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </Stack>

            {selected && (
              <Box textAlign="center" sx={{ mt: 2 }}>
                <Button onClick={() => setSelected(null)} color="inherit">Show everyone</Button>
              </Box>
            )}
          </>
        )}

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 88, md: 24 } }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 3 }}>
            {success}
          </Alert>
        </Snackbar>

        <Fab
          color="primary"
          href="/expense-tracker"
          sx={{
            position: 'fixed', right: 16,
            bottom: { xs: 'calc(24px + env(safe-area-inset-bottom))', md: 24 },
          }}
          aria-label="Add a shared expense"
        >
          <AddIcon />
        </Fab>
      </Container>
    </>
  );
}
