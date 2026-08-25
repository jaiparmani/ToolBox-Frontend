import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Button, Card, CardContent, Chip, Container, Fab, IconButton,
  Paper, Snackbar, Alert, Stack, Typography,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';

import MoneyConstellation from '../ui/MoneyConstellation';
import AnimatedNumber from '../ui/AnimatedNumber';
import Reveal from '../ui/Reveal';
import ErrorBanner from '../ui/ErrorBanner';
import { BalanceSkeleton } from '../ui/Skeletons';
import SwipeAction from '../ui/SwipeAction';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { money, relativeDay } from '../ui/money';
import GroupStrip from '../ui/GroupStrip';
import { FinancialWeatherBar } from '../ui';
import {
  getSplitBalances, settleUpWith, getSplits,
  getGroups, createGroup, getGroupBalances, getGroupExpenses, splitInGroup,
  addGroupMembers, searchSplitUsers,
} from '../rest/expenseTrackerApis';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Autocomplete,
} from '@mui/material';

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

  // Groups. `openGroup` switches the page into that group's own view rather
  // than navigating away, so the constellation can simply re-scope itself.
  const [groups, setGroups] = useState([]);
  const [openGroup, setOpenGroup] = useState(null);
  const [groupView, setGroupView] = useState({ loading: false, data: null, expenses: [] });
  const [newGroup, setNewGroup] = useState({ open: false, name: '', emoji: '', saving: false });
  const [groupSplit, setGroupSplit] = useState({ amount: '', description: '', saving: false });
  const [addPeople, setAddPeople] = useState({ open: false, picked: [], options: [], saving: false });

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

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await getGroups());
    } catch (err) {
      // A groups failure shouldn't take the balances down with it.
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) { load(); loadGroups(); }
  }, [isAuthenticated, load, loadGroups]);

  const enterGroup = async (group) => {
    setOpenGroup(group);
    setSelected(null);
    setGroupView({ loading: true, data: null, expenses: [] });
    try {
      const [data, expenses] = await Promise.all([
        getGroupBalances(group.id), getGroupExpenses(group.id),
      ]);
      setGroupView({ loading: false, data, expenses });
    } catch (err) {
      setGroupView({ loading: false, data: null, expenses: [] });
      setError(err.message || 'Could not open that group');
    }
  };

  const leaveGroup = () => { setOpenGroup(null); setGroupView({ loading: false, data: null, expenses: [] }); };

  const saveGroup = async () => {
    if (!newGroup.name.trim()) { setError('Give the group a name'); return; }
    setNewGroup(prev => ({ ...prev, saving: true }));
    try {
      const created = await createGroup(newGroup.name.trim(), newGroup.emoji.trim());
      setNewGroup({ open: false, name: '', emoji: '', saving: false });
      setSuccess(`Created ${created.name}`);
      await loadGroups();
      enterGroup(created);
    } catch (err) {
      setNewGroup(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not create the group');
    }
  };

  const openAddPeople = () => {
    setAddPeople({ open: true, picked: [], options: [], saving: false });
    searchSplitUsers('').then(options => setAddPeople(prev => ({ ...prev, options }))).catch(() => {});
  };

  const saveAddPeople = async () => {
    if (!addPeople.picked.length) { setError('Pick or type someone to add'); return; }
    setAddPeople(prev => ({ ...prev, saving: true }));
    try {
      // A picked option carries a userId (links to their account); free text is
      // just a name, for someone without an account yet.
      const members = addPeople.picked.map(p =>
        typeof p === 'string' ? { name: p } : { userId: p.userId });
      await addGroupMembers(openGroup.id, members);
      setSuccess('Added to the group');
      setAddPeople({ open: false, picked: [], options: [], saving: false });
      enterGroup(openGroup);
      loadGroups();
    } catch (err) {
      setAddPeople(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not add them');
    }
  };

  const addGroupSplit = async () => {
    const amount = parseFloat(groupSplit.amount);
    if (!amount || amount <= 0) { setError('Enter an amount'); return; }
    if (!groupSplit.description.trim()) { setError('What was it for?'); return; }
    if (!groupView.data?.members?.length) {
      setError('Add someone to the group first'); return;
    }
    setGroupSplit(prev => ({ ...prev, saving: true }));
    try {
      const result = await splitInGroup({
        groupId: openGroup.id, amount, description: groupSplit.description.trim(),
      });
      setSuccess(`Split ${money(result.expense.amount)} across the group`);
      setGroupSplit({ amount: '', description: '', saving: false });
      enterGroup(openGroup);
      load();
    } catch (err) {
      setGroupSplit(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not split that');
    }
  };

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

  // The core settle, no confirm - used by the swipe gesture, where the swipe
  // itself is the intent.
  const settleDirect = async (person) => {
    const owedByMe = person.net < 0;
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
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 12 }}>
        <ErrorBanner error={error} onClose={() => setError(null)} />

        {!openGroup && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <FinancialWeatherBar compact />
          </Box>
        )}

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

        {/* Groups: a way in, above everything else */}
        {!openGroup && (
          <Reveal>
            <Box sx={{ mb: 2 }}>
              <GroupStrip
                groups={groups}
                activeId={openGroup?.id}
                onOpen={enterGroup}
                onCreate={() => setNewGroup({ open: true, name: '', emoji: '', saving: false })}
              />
            </Box>
          </Reveal>
        )}

        {openGroup ? (
          /* ---- The group universe ---- */
          <Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <IconButton onClick={leaveGroup} aria-label="Back to everyone">
                <ArrowBackIcon />
              </IconButton>
              <Typography sx={{ fontSize: 24 }}>{openGroup.emoji || '👥'}</Typography>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 650 }} noWrap>{openGroup.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {groupView.data
                    ? `${groupView.data.members.length} ${groupView.data.members.length === 1 ? 'person' : 'people'} · ${groupView.data.expenseCount} ${groupView.data.expenseCount === 1 ? 'bill' : 'bills'}`
                    : 'loading…'}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={openAddPeople}
                sx={{ flexShrink: 0 }}
              >
                Add people
              </Button>
            </Box>

            {groupView.loading ? (
              <BalanceSkeleton />
            ) : groupView.data ? (
              <>
                <Reveal>
                  <Paper
                    elevation={0}
                    sx={{ p: 2.5, mb: 2, borderRadius: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="overline" color="text.secondary">Spent in this group</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.03em' }}>
                      <AnimatedNumber value={groupView.data.totalSpent} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {money(groupView.data.totalOutstanding)} still to come back to you
                    </Typography>
                  </Paper>
                </Reveal>

                {groupView.data.members.length === 0 && (
                  <Reveal index={1}>
                    <Paper
                      elevation={0}
                      sx={{ p: 4, mb: 2, borderRadius: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}
                    >
                      <PersonAddIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>No one here yet</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Add the people you split with in this group.
                      </Typography>
                      <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openAddPeople}>
                        Add people
                      </Button>
                    </Paper>
                  </Reveal>
                )}

                {groupView.data.members.length > 0 && (
                  <Reveal index={1}>
                    <Paper
                      elevation={0}
                      sx={{ p: { xs: 1, sm: 2 }, mb: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
                    >
                      {/* The same picture, scoped to this group's members */}
                      <MoneyConstellation
                        centreLabel={openGroup.emoji || 'You'}
                        people={groupView.data.members.map(m => ({
                          id: `g${m.personId}`, personId: m.personId, name: m.name, net: m.owed,
                        }))}
                        selectedId={null}
                        onSelect={() => {}}
                      />
                    </Paper>
                  </Reveal>
                )}

                {/* Split without leaving the group - only once there are members */}
                {groupView.data.members.length > 0 && (
                <Reveal index={2}>
                  <Paper
                    elevation={0}
                    sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
                      Add a bill — divided across everyone here
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <TextField
                        size="small" type="number" label="Amount" sx={{ width: { xs: '100%', sm: 140 } }}
                        value={groupSplit.amount}
                        onChange={(e) => setGroupSplit(prev => ({ ...prev, amount: e.target.value }))}
                      />
                      <TextField
                        size="small" label="What for?" fullWidth
                        value={groupSplit.description}
                        onChange={(e) => setGroupSplit(prev => ({ ...prev, description: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') addGroupSplit(); }}
                      />
                      <Button
                        variant="contained" onClick={addGroupSplit}
                        disabled={groupSplit.saving}
                        sx={{ flexShrink: 0 }}
                      >
                        {groupSplit.saving ? 'Adding…' : 'Split'}
                      </Button>
                    </Stack>
                    {groupSplit.saving && <LinearProgress sx={{ mt: 1.5, borderRadius: 999 }} />}
                  </Paper>
                </Reveal>
                )}

                <Stack spacing={1}>
                  {groupView.data.members.map((m, i) => (
                    <Reveal key={m.personId} index={i + 3}>
                      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>{m.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {m.owed > 0 ? `${m.unsettledCount} unsettled` : 'settled up'}
                                {m.linkedUsername ? ' · has an account' : ''}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 700, color: m.owed > 0 ? '#3987e5' : 'text.secondary' }}>
                              {m.owed > 0 ? '+' : ''}{money(m.owed)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Reveal>
                  ))}
                </Stack>

                {groupView.expenses.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                      Bills in this group
                    </Typography>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', px: 1.5 }}>
                      {groupView.expenses.slice(0, 8).map((e) => (
                        <Box
                          key={e.id}
                          display="flex" justifyContent="space-between" alignItems="center"
                          sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{e.description}</Typography>
                            <Typography variant="caption" color="text.secondary">{relativeDay(e.date)}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(e.amount)}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                )}
              </>
            ) : null}
          </Box>
        ) : state.loading ? (
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

            {/* Selecting filters this list; the survivor magic-moves into place
                and the person's detail expands under it (a shared-layout
                transition rather than an instant swap). */}
            <LayoutGroup>
            <Stack spacing={1.25} component={motion.div} layout>
              <AnimatePresence initial={false}>
              {(selected ? people.filter(p => p.id === selected.id) : people).map((person, i) => (
                <motion.div
                  key={person.id}
                  layout
                  layoutId={`person-card-${person.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <SwipeAction
                    onAction={() => settleDirect(person)}
                    color="#30D158"
                    icon={<DoneAllIcon sx={{ color: '#fff' }} />}
                    label={person.net < 0 ? 'Mark paid' : 'Settle'}
                    borderRadius={12}
                  >
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
                              onClick={() => {
                                const owedByMe = person.net < 0;
                                const label = owedByMe
                                  ? `Mark the ${money(Math.abs(person.net))} you owe ${person.name} as paid?`
                                  : `Mark ${person.name}'s ${money(person.net)} as settled?`;
                                if (window.confirm(label)) settleDirect(person);
                              }}
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
                  </SwipeAction>
                </motion.div>
              ))}
              </AnimatePresence>
            </Stack>
            </LayoutGroup>

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

        <Dialog open={newGroup.open} onClose={() => setNewGroup(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GroupsIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.2 }}>New group</Typography>
              <Typography variant="body2" color="text.secondary">A flat, a trip, a regular table</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <TextField
                label="Icon" placeholder="🏖" sx={{ width: 90 }}
                value={newGroup.emoji}
                onChange={(e) => setNewGroup(prev => ({ ...prev, emoji: e.target.value.slice(0, 4) }))}
              />
              <TextField
                label="Name *" fullWidth autoFocus
                value={newGroup.name}
                onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') saveGroup(); }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              People join a group the first time you split with them in it.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewGroup(prev => ({ ...prev, open: false }))} color="inherit">Cancel</Button>
            <Button onClick={saveGroup} variant="contained" disabled={newGroup.saving || !newGroup.name.trim()}>
              {newGroup.saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={addPeople.open} onClose={() => setAddPeople(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonAddIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 650 }}>Add people</Typography>
          </DialogTitle>
          <DialogContent>
            <Autocomplete
              multiple
              freeSolo
              options={addPeople.options}
              value={addPeople.picked}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.username)}
              filterSelectedOptions
              onInputChange={(e, value, reason) => {
                if (reason === 'input' && value.length >= 2) {
                  searchSplitUsers(value).then(options => setAddPeople(prev => ({ ...prev, options }))).catch(() => {});
                }
              }}
              onChange={(e, values) => setAddPeople(prev => ({ ...prev, picked: values }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  label="People"
                  placeholder="Search accounts, or type a name"
                  helperText="People with an account see the group in their own view"
                  sx={{ mt: 1 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddPeople(prev => ({ ...prev, open: false }))} color="inherit">Cancel</Button>
            <Button onClick={saveAddPeople} variant="contained" disabled={addPeople.saving || !addPeople.picked.length}>
              {addPeople.saving ? 'Adding…' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

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
