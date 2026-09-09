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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MoneyConstellation from '../ui/MoneyConstellation';
import Reveal from '../ui/Reveal';
import LendingAssistant from '../ui/LendingAssistant';
import ErrorBanner from '../ui/ErrorBanner';
import { BalanceSkeleton } from '../ui/Skeletons';
import SwipeAction from '../ui/SwipeAction';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { money, moneySmart, relativeDay } from '../ui/money';
import { accents, type } from '../../theme/tokens';
import { feedback } from '../ui/feedback';
import GroupStrip from '../ui/GroupStrip';
import SettleConfirmSheet from '../ui/SettleConfirmSheet';
import ConfirmDialog from '../ui/ConfirmDialog';
import SplitAmount from '../ui/SplitAmount';
import SplitEditDialog from '../ui/SplitEditDialog';
import SplitSettleDialog from '../ui/SplitSettleDialog';
import {
  getSplitBalances, settleUpWith, getSplits, updateSplit, deleteSplit,
  setSplitInExpenses, getCategories,
  getGroups, createGroup, getGroupBalances, getGroupExpenses, splitInGroup,
  addGroupMembers, searchSplitUsers,
} from '../rest/expenseTrackerApis';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Autocomplete,
} from '@mui/material';

/**
 * Send a ribbon of particles between a settled person's node and you, tied to
 * the real amount. Reads live DOM positions, so it must fire before the list
 * re-renders the node away. A no-op if the nodes aren't on screen.
 */
function fireSettleFlow(person, amount) {
  if (typeof window === 'undefined') return;
  const node = document.querySelector(`[data-mc-node="${person.id}"]`);
  const centre = document.querySelector('[data-mc-center]');
  if (!node || !centre) return;
  const owedByMe = person.net < 0;
  window.dispatchEvent(new CustomEvent('toolbox:flow', { detail: {
    from: owedByMe ? centre : node,      // you owe → money leaves you; they owe → comes home
    to: owedByMe ? node : centre,
    amount: Math.abs(amount || person.net || 0),
    color: owedByMe ? accents.amber : accents.cyan,
  }}));
}

/**
 * Clear a settled person from the board immediately, before the server confirms.
 * Only the direction being settled is removed (a person can sit on both sides at
 * once), and the running totals move by the exact figure that leaves — so the
 * optimistic view stays truthful, and load() reconciles it against the server.
 */
function optimisticSettle(prev, person) {
  const owedByMe = person.net < 0;
  if (owedByMe) {
    const entry = prev.youOwe.find(d => d.userId === person.owedToUserId);
    const amt = entry ? entry.owed : 0;
    const youOwe = prev.youOwe.filter(d => d.userId !== person.owedToUserId);
    const totalYouOwe = Math.max(0, prev.totalYouOwe - amt);
    return { ...prev, youOwe, totalYouOwe, net: prev.totalOwed - totalYouOwe };
  }
  const entry = prev.balances.find(b => b.personId === person.personId);
  const amt = entry ? entry.owed : 0;
  const balances = prev.balances.filter(b => b.personId !== person.personId);
  const totalOwed = Math.max(0, prev.totalOwed - amt);
  return { ...prev, balances, totalOwed, net: totalOwed - prev.totalYouOwe };
}

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
  // The settle confirm-and-seal sheet. `person` drives what it shows; the rest
  // tracks the in-flight settle so the sheet can lock, celebrate, or recover.
  const [settle, setSettle] = useState({
    open: false, person: null, settling: false, done: false, doneTotal: 0, error: null,
  });
  // Editing one bill, from either side of it. The dialog reopens on the whole
  // thing - description, date, category, total, shares - not just an amount.
  const [editSplit, setEditSplit] = useState({ open: false, item: null, saving: false });
  const [removeTarget, setRemoveTarget] = useState({ open: false, item: null, saving: false });
  // Part-paying one share, rather than clearing a whole person's balance.
  const [partial, setPartial] = useState({ open: false, item: null, saving: false, error: null });
  const [categories, setCategories] = useState([]);

  // Bills other people split with you. They live here and nowhere else until
  // you say they are yours: a split someone else made never becomes an expense
  // on your books on its own, which is what it used to do silently.
  const [shared, setShared] = useState({ loading: true, items: [] });
  const [sharedExpanded, setSharedExpanded] = useState(null);
  const [including, setIncluding] = useState(null);
  const [showSettled, setShowSettled] = useState(true);
  const [settledHistory, setSettledHistory] = useState({ loading: false, items: [] });

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

  // Everything you owe, in one call - the shares other people billed you for,
  // whichever account each is owed to.
  const loadShared = useCallback(async () => {
    try {
      setShared({ loading: false, items: await getSplits({ direction: 'you_owe', settled: 'false' }) });
    } catch (err) {
      setShared({ loading: false, items: [] });
    }
  }, []);

  const loadSettledHistory = useCallback(async () => {
    setSettledHistory({ loading: true, items: [] });
    try {
      setSettledHistory({ loading: false, items: await getSplits({ settled: 'true' }) });
    } catch (err) {
      setSettledHistory({ loading: false, items: [] });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) { load(); loadGroups(); loadShared(); loadSettledHistory(); }
  }, [isAuthenticated, load, loadGroups, loadShared, loadSettledHistory]);

  // The edit dialog needs the category list; fetch it once, quietly, and let
  // the dialog say so if it hasn't arrived.
  useEffect(() => {
    if (!isAuthenticated) return;
    getCategories({ type: 'expense' })
      .then(data => setCategories(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setCategories([]));
  }, [isAuthenticated]);

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

  /**
   * The bills behind one person's balance.
   *
   * Which filter to send depends on which side of the split you are. A person
   * who owes you is a Person in your own contact list, so `personId` works. An
   * account you owe has no Person id you can see - that row lives in *their*
   * contact list - so it is narrowed by the account instead. Sending an
   * undefined personId used to fall through to an unfiltered list, which showed
   * every split you were party to under one person's name.
   */
  const openPerson = useCallback(async (person) => {
    setSelected(person);
    if (!person) return;
    setDetail({ loading: true, items: [] });
    try {
      const items = await getSplits(
        person.personId
          ? { personId: person.personId, settled: 'false' }
          : { owedToUserId: person.owedToUserId, settled: 'false' });
      setDetail({ loading: false, items });
    } catch (err) {
      setDetail({ loading: false, items: [] });
    }
  }, []);

  /**
   * Change a shared bill. Either party may: the person being billed is usually
   * the one who notices something is wrong, and the server notifies the other
   * side so it is never a silent edit. The payer's own share absorbs an amount
   * change, so raising a share to the whole bill leaves them owing nothing on
   * it; only the payer may change who is on the bill, because the people on it
   * live in their contact list.
   */
  const saveSplitEdit = async (fields) => {
    setEditSplit(prev => ({ ...prev, saving: true }));
    try {
      await updateSplit(editSplit.item.id, fields);
      setEditSplit({ open: false, item: null, saving: false });
      setSuccess('Bill updated');
      feedback('success');
      await Promise.all([load(), loadShared(), openPerson(selected)]);
    } catch (err) {
      setEditSplit(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not update that bill');
    }
  };

  /**
   * Pay off part of one share. Money rarely arrives in the shape of the debt,
   * and the alternative was leaving the whole thing standing or wiping it. The
   * server returns what it actually applied and what is left, so the message
   * below never claims a figure it wasn't given.
   */
  const settlePartial = async (amount) => {
    setPartial(prev => ({ ...prev, saving: true, error: null }));
    try {
      const result = await settleUpWith({ splitIds: [partial.item.id], amount });
      feedback('success');
      setPartial({ open: false, item: null, saving: false, error: null });
      setSuccess(result.remaining > 0
        ? `Recorded ${money(result.total)} — ${money(result.remaining)} still outstanding`
        : `Settled ${money(result.total)}`);
      await Promise.all([load(), loadShared(), openPerson(selected)]);
    } catch (err) {
      setPartial(prev => ({
        ...prev, saving: false, error: err.message || 'Could not record that payment',
      }));
    }
  };

  /**
   * Say whether a share somebody else billed you for counts as your own
   * spending. This is the consent that used to be assumed: the split stays
   * exactly where it is either way, and only your totals move.
   */
  const toggleInExpenses = async (item) => {
    setIncluding(item.id);
    try {
      const result = await setSplitInExpenses(item.id, !item.includeInExpenses);
      setShared(prev => ({
        ...prev,
        items: prev.items.map(s => (
          s.id === item.id ? { ...s, includeInExpenses: result.includeInExpenses } : s)),
      }));
      feedback('success');
      setSuccess(result.includeInExpenses
        ? `${item.description} now counts in your expenses`
        : `${item.description} is shared only — out of your expenses`);
    } catch (err) {
      setError(err.message || 'Could not change where this counts');
    } finally {
      setIncluding(null);
    }
  };

  const removeSplit = async () => {
    setRemoveTarget(prev => ({ ...prev, saving: true }));
    try {
      await deleteSplit(removeTarget.item.id);
      setRemoveTarget({ open: false, item: null, saving: false });
      setSuccess('Split removed');
      await Promise.all([load(), loadShared(), openPerson(selected)]);
    } catch (err) {
      setRemoveTarget(prev => ({ ...prev, saving: false }));
      setError(err.message || 'Could not remove that split');
    }
  };

  // Open the confirm-and-seal sheet for a person: the discoverable path, where
  // the exact who/how-much is stated before anything moves.
  const openSettle = (person) => {
    feedback('open');
    setSettle({ open: true, person, settling: false, done: false, doneTotal: 0, error: null });
  };
  const closeSettle = () => setSettle(prev => ({ ...prev, open: false }));

  /**
   * The one settle path. Optimistic: the person leaves the board the instant we
   * commit, the money-in-motion flow fires while their node is still on screen,
   * and the server's own settled_total seals it. On failure we put them back and
   * surface the error — in the sheet (so it can be retried) for the confirm path,
   * or on the banner for the express swipe.
   */
  const runSettle = async (person, { sheet = false } = {}) => {
    const owedByMe = person.net < 0;
    const snapshot = state;
    if (sheet) setSettle(prev => ({ ...prev, settling: true, error: null }));
    fireSettleFlow(person, person.net);
    setState(prev => optimisticSettle(prev, person));
    if (selected?.id === person.id) setSelected(null);
    try {
      const result = await settleUpWith(
        owedByMe ? { owedToUserId: person.owedToUserId } : { personId: person.personId });
      feedback('success');
      setSuccess(`Settled ${money(result.total)} with ${person.name}`);
      if (sheet) {
        setSettle(prev => ({ ...prev, settling: false, done: true, doneTotal: result.total }));
        // Let the seal land, then dismiss — unless the user already closed it.
        setTimeout(() => setSettle(prev => (prev.done ? { ...prev, open: false } : prev)), 1600);
      }
      load(); // reconcile the board with the server's truth
      loadShared();
    } catch (err) {
      setState(snapshot); // put them back exactly as they were
      feedback('error');
      if (sheet) {
        setSettle(prev => ({ ...prev, settling: false, error: err.message || 'Could not settle. Try again.' }));
      } else {
        setError(err.message || 'Could not settle');
      }
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
  // One mapping, used everywhere on this page: owed-to-you is the single green
  // accent, owing is semantic red, settled is monochrome.
  const posColor = accents.mint;
  const negColor = accents.red;

  return (
    <>
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 12, position: 'relative' }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
        <ErrorBanner error={error} onClose={() => setError(null)} />
        {/* Financial weather now lives once in the app top bar, not per-screen. */}

        {/* Net position — the one figure you glance at */}
        <Reveal>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 }, mb: 2, borderRadius: 4, textAlign: 'center',
              border: '1px solid', borderColor: 'divider',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Subtle accent glow behind the number */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
                width: 280, height: 140, borderRadius: '50%',
                background: `radial-gradient(ellipse, ${netPositive ? posColor : negColor}18 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 0.75, position: 'relative' }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em', fontSize: '0.65rem' }}>
                {netPositive ? 'You are owed' : 'You owe'}
              </Typography>
              <IconButton size="small" onClick={load} aria-label="Refresh balances" sx={{ ml: 0.25 }}>
                <RefreshIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <Typography
              sx={{
                position: 'relative',
                fontFamily: type.displayFamily, fontWeight: 700, letterSpacing: '-0.04em',
                fontSize: { xs: '2.8rem', sm: '3.4rem' }, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: netPositive ? posColor : negColor,
              }}
            >
              {money(Math.abs(state.net))}
            </Typography>
            <Stack
              direction="row"
              sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={{ flex: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mb: 0.5, fontWeight: 500, letterSpacing: '0.04em' }}>
                  Owed to you
                </Typography>
                <Typography sx={{ fontWeight: 700, color: posColor, fontVariantNumeric: 'tabular-nums', fontSize: '1.05rem' }}>
                  +{money(state.totalOwed)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mb: 0.5, fontWeight: 500, letterSpacing: '0.04em' }}>
                  You owe
                </Typography>
                <Typography sx={{ fontWeight: 700, color: state.totalYouOwe > 0 ? negColor : 'text.secondary', fontVariantNumeric: 'tabular-nums', fontSize: '1.05rem' }}>
                  {state.totalYouOwe > 0 ? '−' : ''}{money(state.totalYouOwe)}
                </Typography>
              </Box>
            </Stack>
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
                  {!groupView.data
                    ? 'loading…'
                    : groupView.data.viewerIsOwner === false
                      ? `shared by ${groupView.data.ownerUsername || 'someone else'} · ${groupView.data.expenseCount} ${groupView.data.expenseCount === 1 ? 'bill' : 'bills'} with you`
                      : `${groupView.data.members.length} ${groupView.data.members.length === 1 ? 'person' : 'people'} · ${groupView.data.expenseCount} ${groupView.data.expenseCount === 1 ? 'bill' : 'bills'}`}
                </Typography>
              </Box>
              {/* Only the person who made the group can restructure it - the
                  members in it are their contacts, not yours. */}
              {groupView.data?.viewerIsOwner !== false && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={openAddPeople}
                  sx={{ flexShrink: 0 }}
                >
                  Add people
                </Button>
              )}
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
                    <Typography variant="overline" color="text.secondary">
                      Spent in this group
                    </Typography>
                    <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                      {moneySmart(groupView.data.totalSpent)}
                    </Typography>
                    {/* Same rows, opposite ends: the owner is owed this, a
                        member owes it - so the colour and the words both flip. */}
                    <Typography
                      variant="caption"
                      sx={{ color: groupView.data.viewerIsOwner ? posColor : negColor, fontWeight: 600 }}
                    >
                      {groupView.data.viewerIsOwner
                        ? `+${money(groupView.data.totalOutstanding)} still to come back to you`
                        : `−${money(groupView.data.yourShareOutstanding)} you still owe ${groupView.data.ownerUsername || 'them'}`}
                    </Typography>
                  </Paper>
                </Reveal>

                {groupView.data.members.length === 0 && groupView.data.viewerIsOwner && (
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
                          id: `g${m.personId}`, personId: m.personId, name: m.name,
                          // Signed from the viewer's own position: the owner is
                          // owed by everyone, a member owes only their own row,
                          // and a third member's debt is owed to the owner, not
                          // to the person reading it - so it carries no sign.
                          net: groupView.data.viewerIsOwner ? m.owed
                            : m.isYou ? -m.owed
                              : 0,
                        }))}
                        selectedId={null}
                        onSelect={() => {}}
                      />
                    </Paper>
                  </Reveal>
                )}

                {/* Split without leaving the group - only once there are
                    members, and only for the owner: the members are their
                    contacts, so a bill added from the other side would have
                    nobody to attach to. */}
                {groupView.data.members.length > 0 && groupView.data.viewerIsOwner && (
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
                              <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                                {m.isYou ? 'You' : m.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {m.owed > 0 ? `${m.unsettledCount} unsettled` : 'settled up'}
                                {!groupView.data.viewerIsOwner && !m.isYou && m.owed > 0
                                  ? ` · owes ${groupView.data.ownerUsername || 'the owner'}`
                                  : ''}
                                {m.linkedUsername ? ' · has an account' : ''}
                              </Typography>
                            </Box>
                            {m.owed > 0 ? (
                              <SplitAmount
                                direction={
                                  groupView.data.viewerIsOwner ? 'owed_to_you'
                                    : m.isYou ? 'you_owe'
                                      : 'owed_to_owner'
                                }
                                amount={m.owed}
                                size="body1"
                              />
                            ) : (
                              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                                {money(0)}
                              </Typography>
                            )}
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
            sx={{
              p: { xs: 4, sm: 5 }, borderRadius: 4, textAlign: 'center',
              border: '1px dashed', borderColor: 'divider',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200, height: 200, borderRadius: '50%',
                background: `radial-gradient(ellipse, ${accents.mint}0a 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <CallSplitIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5, position: 'relative' }} />
            <Typography variant="body1" sx={{ fontWeight: 600, position: 'relative' }}>All square</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, position: 'relative' }}>
              Split a bill from the expense tracker and people will show up here.
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
              </Paper>
            </Reveal>

            <Box
              display="flex" alignItems="baseline" justifyContent="space-between"
              sx={{ px: 0.5, mb: 1 }}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 650 }}>
                {selected ? 'Balance' : 'Balances'}
              </Typography>
              {!selected && (
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {people.length} {people.length === 1 ? 'person' : 'people'}
                </Typography>
              )}
            </Box>

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
                    onAction={() => openSettle(person)}
                    color={accents.mint}
                    icon={<DoneAllIcon sx={{ color: '#fff' }} />}
                    label={person.net < 0 ? 'Mark paid' : 'Settle'}
                    borderRadius={12}
                  >
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: selected?.id === person.id ? (person.net > 0 ? posColor : negColor) : 'divider',
                      borderLeft: `3px solid ${person.net > 0 ? posColor : person.net < 0 ? negColor : 'transparent'}`,
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Box
                        display="flex" alignItems="center" justifyContent="space-between" gap={2}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openPerson(selected?.id === person.id ? null : person)}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {person.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {person.net === 0
                              ? 'all settled'
                              : person.net > 0 ? 'owes you' : 'you owe them'}
                            {person.unsettled ? ` · ${person.unsettled} ${person.unsettled === 1 ? 'bill' : 'bills'}` : ''}
                          </Typography>
                        </Box>
                        <Box textAlign="right" sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                              fontSize: '1.05rem',
                              color: person.net === 0 ? 'text.secondary'
                                : person.net > 0 ? posColor : negColor,
                            }}
                          >
                            {person.net > 0 ? '+' : person.net < 0 ? '−' : ''}
                            {money(Math.abs(person.net))}
                          </Typography>
                          {person.net !== 0 && (
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); openSettle(person); }}
                              sx={{ color: accents.mint }}
                              aria-label={person.net < 0 ? `Mark paid to ${person.name}` : `Settle with ${person.name}`}
                            >
                              <DoneAllIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      <AnimatePresence initial={false}>
                      {selected?.id === person.id && detail.items.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                          style={{ overflow: 'hidden' }}
                        >
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Stack spacing={0.75}>
                          {detail.items.slice(0, 8).map((item) => (
                            <Box
                              key={item.id}
                              display="flex" alignItems="center" justifyContent="space-between"
                              gap={1}
                              sx={{
                                py: 0.75, px: 1, borderRadius: 2,
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                  {item.description}
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                    {relativeDay(item.date)}
                                  </Typography>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.direction === 'you_owe'
                                    ? `${item.counterparty} paid`
                                    : 'you paid'}
                                  {item.settledAmount > 0
                                    ? ` · ${money(item.settledAmount)} of ${money(item.amount)} paid`
                                    : ''}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.25} sx={{ flexShrink: 0 }}>
                                <SplitAmount
                                  direction={item.direction}
                                  amount={item.outstanding}
                                  label={item.settledAmount > 0
                                    ? (item.direction === 'you_owe' ? 'remaining' : 'still owed')
                                    : undefined}
                                />
                                <IconButton
                                  size="small"
                                  aria-label={`Record a payment on ${item.description}`}
                                  onClick={() => setPartial({ open: true, item, saving: false, error: null })}
                                  sx={{ color: accents.mint }}
                                >
                                  <PaymentsIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                                {item.canEdit && (
                                  <>
                                    <IconButton
                                      size="small"
                                      aria-label={`Edit the ${item.description} bill`}
                                      onClick={() => setEditSplit({
                                        open: true, item, saving: false,
                                      })}
                                    >
                                      <EditIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      aria-label={`Remove the ${item.description} split`}
                                      onClick={() => setRemoveTarget({ open: true, item, saving: false })}
                                    >
                                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            </Box>
                          ))}
                          </Stack>
                          {detail.items.length > 8 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                              +{detail.items.length - 8} more
                            </Typography>
                          )}
                        </Box>
                        </motion.div>
                      )}
                      </AnimatePresence>
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

        {/* Bills other people split with you, grouped by who paid. */}
        {!openGroup && shared.items.length > 0 && (
          <Reveal index={2}>
            <Box sx={{ mt: 3 }}>
              <Box display="flex" alignItems="baseline" justifyContent="space-between" sx={{ px: 0.5, mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 650 }}>
                  Shared with you
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {money(shared.items.reduce((s, i) => s + (i.outstanding || 0), 0))} total
                </Typography>
              </Box>

              <Stack spacing={1.25}>
                <AnimatePresence initial={false}>
                {(() => {
                  const byPerson = new Map();
                  shared.items.forEach(item => {
                    const key = item.counterparty || 'Someone';
                    if (!byPerson.has(key)) byPerson.set(key, { items: [], total: 0 });
                    const group = byPerson.get(key);
                    group.items.push(item);
                    group.total += item.outstanding || 0;
                  });
                  return [...byPerson.entries()].map(([personName, group]) => (
                    <motion.div
                      key={personName}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                    >
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3, border: '1px solid', borderColor: 'divider',
                        overflow: 'visible',
                      }}
                    >
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Box
                          display="flex" alignItems="center" justifyContent="space-between" gap={2}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSharedExpanded(prev =>
                            prev === personName ? null : personName
                          )}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                              {personName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.items.length} {group.items.length === 1 ? 'bill' : 'bills'}
                            </Typography>
                          </Box>
                          <Box textAlign="right" sx={{ flexShrink: 0 }}>
                            <SplitAmount direction="you_owe" amount={group.total} />
                          </Box>
                        </Box>

                        <AnimatePresence initial={false}>
                        {sharedExpanded === personName && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                            style={{ overflow: 'hidden' }}
                          >
                          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Stack spacing={1}>
                            {group.items.map((item) => (
                              <Box
                                key={item.id}
                                sx={{
                                  p: 1.25, borderRadius: 2.5,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                      {item.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {money(item.expenseTotal)} total · {relativeDay(item.date)}
                                      {item.settledAmount > 0
                                        ? ` · ${money(item.settledAmount)} paid`
                                        : ''}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ flexShrink: 0 }}>
                                    <SplitAmount direction="you_owe" amount={item.outstanding} />
                                  </Box>
                                </Box>

                                <Stack
                                  direction="row" spacing={0.5} alignItems="center"
                                  sx={{ mt: 0.75, flexWrap: 'wrap' }}
                                >
                                  {item.canInclude && (
                                    item.includeInExpenses ? (
                                      <Chip
                                        icon={<CheckCircleIcon />}
                                        label="Counted"
                                        size="small"
                                        onClick={() => toggleInExpenses(item)}
                                        disabled={including === item.id}
                                        sx={{ color: accents.mint, borderColor: accents.mint, height: 24 }}
                                        variant="outlined"
                                      />
                                    ) : (
                                      <Chip
                                        icon={<AddIcon />}
                                        label="Count"
                                        size="small"
                                        onClick={() => toggleInExpenses(item)}
                                        disabled={including === item.id}
                                        variant="outlined"
                                        sx={{ height: 24 }}
                                      />
                                    )
                                  )}
                                  <Box sx={{ flex: 1 }} />
                                  <IconButton
                                    size="small"
                                    aria-label={`Pay on ${item.description}`}
                                    onClick={() => setPartial({ open: true, item, saving: false, error: null })}
                                    sx={{ color: accents.mint }}
                                  >
                                    <PaymentsIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                  {item.canEdit && (
                                    <IconButton
                                      size="small"
                                      aria-label={`Edit the ${item.description} bill`}
                                      onClick={() => setEditSplit({ open: true, item, saving: false })}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
                                </Stack>
                              </Box>
                            ))}
                            </Stack>
                          </Box>
                          </motion.div>
                        )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                    </motion.div>
                  ));
                })()}
                </AnimatePresence>
              </Stack>
            </Box>
          </Reveal>
        )}

        {/* Settled history — tucked away until needed */}
        {!openGroup && (
          <Reveal index={3}>
            <Box sx={{ mt: 3 }}>
              <Box
                display="flex" alignItems="center" justifyContent="center"
                sx={{
                  cursor: 'pointer', py: 1, opacity: 0.7,
                  '&:hover': { opacity: 1 },
                  transition: 'opacity 0.2s ease',
                }}
                onClick={() => { setShowSettled(prev => !prev); }}
              >
                <DoneAllIcon sx={{ fontSize: 14, mr: 0.75, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                  {showSettled ? 'Hide settled' : 'Settled history'}
                </Typography>
              </Box>
              <AnimatePresence initial={false}>
              {showSettled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  style={{ overflow: 'hidden' }}
                >
                <Paper
                  elevation={0}
                  sx={{ p: 2, mt: 0.5, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'left' }}
                >
                  {settledHistory.loading ? (
                    <LinearProgress sx={{ borderRadius: 999 }} />
                  ) : settledHistory.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      No settled bills yet.
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {settledHistory.items.slice(0, 20).map((item) => (
                        <Box
                          key={item.id}
                          display="flex" justifyContent="space-between" alignItems="center"
                          sx={{
                            py: 0.75, px: 1, borderRadius: 2,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                              {item.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.counterparty} · {relativeDay(item.date)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: accents.mint, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                            {money(item.settledAmount)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
                </motion.div>
              )}
              </AnimatePresence>
            </Box>
          </Reveal>
        )}

        {/* A distinct AI surface, scoped to lending only — kept apart from the
            app's spending analysis. Lives on the everyone view, not inside a
            group. */}
        {!openGroup && !state.loading && <LendingAssistant />}

        <SettleConfirmSheet
          open={settle.open}
          person={settle.person}
          status={settle}
          onConfirm={() => runSettle(settle.person, { sheet: true })}
          onClose={closeSettle}
        />

        {/* The same dialog that creates a shared bill, reopened on an existing
            one: description, date, category, total and shares. Either party can
            correct it - the payer, or the person being billed - and the server
            notifies the other side, so nothing changes quietly behind anyone's
            back. */}
        <SplitEditDialog
          open={editSplit.open}
          item={editSplit.item}
          categories={categories}
          saving={editSplit.saving}
          onClose={() => setEditSplit(prev => ({ ...prev, open: false }))}
          onSave={saveSplitEdit}
        />

        {/* Part of a debt, or all of it. */}
        <SplitSettleDialog
          open={partial.open}
          outstanding={partial.item?.outstanding || 0}
          alreadyPaid={partial.item?.settledAmount || 0}
          direction={partial.item?.direction || 'owed_to_you'}
          counterparty={partial.item?.counterparty}
          description={partial.item?.description}
          saving={partial.saving}
          error={partial.error}
          onClose={() => setPartial({ open: false, item: null, saving: false, error: null })}
          onConfirm={settlePartial}
        />

        <ConfirmDialog
          open={removeTarget.open}
          title="Remove this split?"
          message={removeTarget.item
            ? `${removeTarget.item.description} — ${money(removeTarget.item.amount)}. Everyone on this bill is told it was removed.`
            : ''}
          confirmLabel="Remove"
          destructive
          loading={removeTarget.saving}
          onConfirm={removeSplit}
          onCancel={() => setRemoveTarget({ open: false, item: null, saving: false })}
        />

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
        </Box>
      </Container>
    </>
  );
}
