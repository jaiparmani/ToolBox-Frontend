import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import {
  Box, Button, Card, CardContent, Container, Fab, IconButton,
  Paper, Snackbar, Alert, Stack, Typography,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import MoneyConstellation from '../ui/MoneyConstellation';
import SplitUniverse from '../ui/SplitUniverse';
import ParticleFlow from '../motion/ParticleFlow';
import AuroraBackground from '../motion/AuroraBackground';
import ActivityDeck from '../ui/ActivityDeck';
import Reveal from '../ui/Reveal';
import LendingAssistant from '../ui/LendingAssistant';
import ErrorBanner from '../ui/ErrorBanner';
import { BalanceSkeleton } from '../ui/Skeletons';
import SwipeAction from '../ui/SwipeAction';
import ManualSplitDialog from '../ui/ManualSplitDialog';
import ThinkingHint from '../ui/ThinkingHint';
import AnimatedNumber from '../ui/AnimatedNumber';
import TiltCard from '../motion/TiltCard';
import { AnimatePresence, motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { money, moneySmart, relativeDay } from '../ui/money';
import { accents, flowColor, radius, type, motion as motionTokens } from '../../theme/tokens';
import { feedback } from '../ui/feedback';
import GroupStrip from '../ui/GroupStrip';
import SettleConfirmSheet from '../ui/SettleConfirmSheet';
import ConfirmDialog from '../ui/ConfirmDialog';
import SplitAmount from '../ui/SplitAmount';
import SplitEditDialog from '../ui/SplitEditDialog';
import SplitSettleDialog from '../ui/SplitSettleDialog';
import {
  getSplitBalances, settleUpWith, getSplits, updateSplit, deleteSplit,
  setSplitInExpenses, getCategories, splitAddExpense, addSplitToExpenses,
  getGroups, createGroup, getGroupBalances, getGroupExpenses, splitInGroup,
  addGroupMembers, searchSplitUsers,
} from '../rest/expenseTrackerApis';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Autocomplete,
} from '@mui/material';

/**
 * Send a ribbon of particles between a settled person's body and the star,
 * tied to the real amount. Reads live screen positions off the universe's own
 * ref API, so it must fire before the list re-renders the body away. A no-op
 * if the universe isn't mounted (e.g. reduced motion, or it hasn't measured
 * yet) or the person has no on-screen body.
 */
function fireSettleFlow(universeApi, person, amount) {
  if (typeof window === 'undefined' || !universeApi) return;
  const point = universeApi.getPoint(person.id);
  const centre = universeApi.getCentre();
  if (!point || !centre) return;
  const owedByMe = person.net < 0;
  universeApi.spawnNova(person.id);
  window.dispatchEvent(new CustomEvent('toolbox:flow', { detail: {
    from: owedByMe ? centre : point,      // you owe → money leaves you; they owe → comes home
    to: owedByMe ? point : centre,
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

const heroNumSx = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' };

// framer-motion wants its `ease` as a bezier array, not the CSS string form
// `theme/tokens.js` exports for plain `transition:` properties — same curve
// (motionTokens.ease's "settle"), just serialized the way this library needs.
const EASE_SETTLE = [0.32, 0.72, 0, 1];

// What the quick-add box teaches while it's empty — real shapes of the same
// one thing it does, not a single static hint.
const QUICK_ADD_EXAMPLES = [
  'split 1200 dinner with raj and priya',
  'split 3600 goa trip three ways',
  'arjun paid 850 for the movie, split with me',
  'split 500 auto fare with priya',
];

/**
 * The one figure the page exists to answer, and the one real ratio behind it.
 *
 * Not a card with a number and two stat rows bolted underneath - the bar IS
 * the two totals, drawn to scale, so the eye reads "how much of my situation
 * is each direction" before it even parses the digits. Both raw figures are
 * still printed below it, in full - the bar is a ratio, never a replacement
 * for the exact number.
 */
function NetPositionHero({ netPositive, net, totalOwed, totalYouOwe, onRefresh, posColor, negColor }) {
  const mode = useTheme().palette.mode;
  const reduce = useReducedMotion();
  const flowIn = flowColor.in[mode];
  const flowOut = flowColor.out[mode];
  const total = totalOwed + totalYouOwe;
  const inPct = total > 0 ? (totalOwed / total) * 100 : 0;
  const settled = total === 0;

  return (
    <TiltCard max={4} sx={{ mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 }, borderRadius: `${radius.xl}px`, textAlign: 'center',
          border: '1px solid', borderColor: 'divider',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* A slow, ambient breathe behind the number — tied to the same
            direction as the figure itself, never a decoration on its own. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute', top: '-45%', left: '50%', transform: 'translateX(-50%)',
            width: 320, height: 180, borderRadius: '50%',
            background: `radial-gradient(ellipse, ${netPositive ? posColor : negColor}20 0%, transparent 72%)`,
            pointerEvents: 'none',
            animation: reduce ? 'none' : 'toolbox-hero-breathe 5s ease-in-out infinite',
            '@keyframes toolbox-hero-breathe': {
              '0%, 100%': { opacity: 0.7, transform: 'translateX(-50%) scale(1)' },
              '50%': { opacity: 1, transform: 'translateX(-50%) scale(1.08)' },
            },
          }}
        />
        <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mb: 0.75, position: 'relative' }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em', fontSize: '0.65rem' }}>
            {settled ? 'All square' : netPositive ? 'You are owed' : 'You owe'}
          </Typography>
          <IconButton size="small" onClick={onRefresh} aria-label="Refresh balances" sx={{ ml: 0.25 }}>
            <RefreshIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Typography
          component="div"
          sx={{
            position: 'relative',
            ...heroNumSx, fontWeight: 700,
            fontSize: { xs: '2.8rem', sm: '3.4rem' }, lineHeight: 1,
            color: settled ? 'text.secondary' : netPositive ? posColor : negColor,
          }}
        >
          <AnimatedNumber value={Math.abs(net)} />
        </Typography>

        {!settled && (
          <>
            {/* The ratio, to scale — the only spectacle here, and it is pure data. */}
            <Box
              aria-hidden
              sx={{
                position: 'relative', display: 'flex', mt: 2.5, height: 8, borderRadius: `${radius.pill}px`,
                overflow: 'hidden',
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                boxShadow: mode === 'dark' ? 'inset 0 1px 2px rgba(0,0,0,0.35)' : 'inset 0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <Box
                component={motion.div}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 26 }}
                style={{ transformOrigin: 'left center' }}
                sx={{
                  width: `${inPct}%`,
                  background: `linear-gradient(90deg, ${flowIn}cc, ${flowIn})`,
                  boxShadow: `0 0 10px ${flowIn}55`,
                }}
              />
              <Box
                component={motion.div}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 26, delay: 0.06 }}
                style={{ transformOrigin: 'right center' }}
                sx={{
                  width: `${100 - inPct}%`,
                  background: `linear-gradient(90deg, ${flowOut}, ${flowOut}cc)`,
                  boxShadow: `0 0 10px ${flowOut}55`,
                }}
              />
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ position: 'relative', mt: 1.1, px: 0.25 }}>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                <Box component="span" sx={{ ...heroNumSx, fontWeight: 650, color: flowIn }}>{money(totalOwed)}</Box>
                {' owed to you'}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'right' }}>
                <Box component="span" sx={{ ...heroNumSx, fontWeight: 650, color: flowOut }}>{money(totalYouOwe)}</Box>
                {' you owe'}
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </TiltCard>
  );
}

// A stable colour per name, drawn from the accent wheel — the same person
// always lands on the same hue across a session, without a Person id lookup.
const AVATAR_HUES = [accents.blue, accents.violet, accents.cyan, accents.amber, accents.purple, accents.mint];
function hueForName(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}
function initialsForName(name) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/** A colored initials badge — the one recurring "who" mark across Shared. */
function PersonAvatar({ name, size = 40 }) {
  const hue = hueForName(name);
  return (
    <Box
      aria-hidden
      sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(155deg, ${hue}38, ${hue}1c)`,
        border: '1px solid', borderColor: `${hue}4a`,
        color: hue, fontWeight: 700, fontSize: size * 0.38,
        letterSpacing: '-0.01em',
      }}
    >
      {initialsForName(name)}
    </Box>
  );
}

/**
 * "Count it" as your own spending — a pill that morphs, not a static chip.
 * The icon crossfades with a small spring pop so the state change reads as
 * something that just happened, not a label that was always there.
 */
function CountToggle({ counted, busy, onClick, label }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      sx={{
        border: '1px solid', borderColor: counted ? `${accents.mint}66` : 'divider',
        bgcolor: counted ? `${accents.mint}16` : 'transparent',
        color: counted ? accents.mint : 'text.secondary',
        borderRadius: `${radius.pill}px`,
        px: 1.4, py: 0.5, fontSize: 12.5, fontWeight: 650,
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        cursor: busy ? 'default' : 'pointer', font: 'inherit',
        opacity: busy ? 0.6 : 1,
        transition: `background-color ${motionTokens.normal}ms ${motionTokens.ease}, border-color ${motionTokens.normal}ms ${motionTokens.ease}, color ${motionTokens.normal}ms ${motionTokens.ease}`,
        '&:hover': busy ? undefined : { borderColor: counted ? accents.mint : 'text.disabled' },
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={counted ? 'on' : 'off'}
          initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          style={{ display: 'inline-flex' }}
        >
          {counted ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <AddIcon sx={{ fontSize: 14 }} />}
        </motion.span>
      </AnimatePresence>
      {counted ? 'Counted' : 'Count'}
    </Box>
  );
}

/**
 * One payer's bills, as a card with real depth. Two thin sibling edges peek
 * out from behind it when there's more than one bill underneath - a bill
 * *stack*, not a lone card that happens to hold several rows once opened.
 * Reduced motion still gets the same layered look; only the tilt is a motion
 * effect, and TiltCard already turns itself off for that.
 */
function SharedPayerCard({ personName, group, expanded, onToggle, including, onToggleInclude, onPay, onEdit }) {
  const stacked = group.items.length > 1;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
    >
      <Box sx={{ position: 'relative' }}>
        {stacked && (
          <Box aria-hidden sx={{
            position: 'absolute', left: 10, right: 10, bottom: -6, height: 14,
            borderRadius: '0 0 12px 12px', border: '1px solid', borderColor: 'divider',
            borderTop: 'none', bgcolor: 'background.paper', opacity: 0.6,
          }} />
        )}
        <TiltCard max={3} sx={{ position: 'relative' }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'visible' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box
                display="flex" alignItems="center" gap={1.5}
                sx={{ cursor: 'pointer' }}
                onClick={onToggle}
              >
                <PersonAvatar name={personName} size={38} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650 }} noWrap>
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
              {expanded && (
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
                      sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'action.hover' }}
                    >
                      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {item.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {money(item.expenseTotal)} total · {relativeDay(item.date)}
                            {item.settledAmount > 0 ? ` · ${money(item.settledAmount)} paid` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ flexShrink: 0 }}>
                          <SplitAmount direction="you_owe" amount={item.outstanding} />
                        </Box>
                      </Box>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                        {item.canInclude && (
                          <CountToggle
                            counted={item.includeInExpenses}
                            busy={including === item.id}
                            onClick={() => onToggleInclude(item)}
                            label={item.includeInExpenses
                              ? `Stop counting ${item.description} as your spending`
                              : `Count ${item.description} as your spending`}
                          />
                        )}
                        <Box sx={{ flex: 1 }} />
                        <IconButton
                          size="small"
                          aria-label={`Pay on ${item.description}`}
                          onClick={() => onPay(item)}
                          sx={{ color: accents.mint }}
                        >
                          <PaymentsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        {item.canEdit && (
                          <IconButton
                            size="small"
                            aria-label={`Edit the ${item.description} bill`}
                            onClick={() => onEdit(item)}
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
        </TiltCard>
      </Box>
    </motion.div>
  );
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

  // The split universe's own ref API (getPoint/getCentre/spawnNova) — set once
  // the canvas has measured itself, read by runSettle to fire the particle
  // flow and the supernova from the right live screen position.
  const universeRef = React.useRef(null);

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
  const [settledHistory, setSettledHistory] = useState({ loading: false, items: [] });

  // Groups. `openGroup` switches the page into that group's own view rather
  // than navigating away, so the constellation can simply re-scope itself.
  const [groups, setGroups] = useState([]);
  const [openGroup, setOpenGroup] = useState(null);
  const [groupView, setGroupView] = useState({ loading: false, data: null, expenses: [] });
  const [newGroup, setNewGroup] = useState({ open: false, name: '', emoji: '', saving: false });
  const [groupSplit, setGroupSplit] = useState({ amount: '', description: '', saving: false });
  const [addPeople, setAddPeople] = useState({ open: false, picked: [], options: [], saving: false });

  // Adding a new split. The one-line capture reads plain language ("split
  // 1200 dinner with raj and priya"); "Exact" opens the full dialog for named
  // numbers instead. Both are the entry point now that splitting lives here.
  const [quickAdd, setQuickAdd] = useState({ text: '', loading: false });
  const [quickAddFocused, setQuickAddFocused] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  // Counting one shared-only bill into your own spending — tracked per-item so
  // its "Count" pill can show busy without disturbing its siblings.
  const [countingId, setCountingId] = useState(null);

  // Bills you paid and split, but chose not to count as your own spending —
  // tracked here only, until you say otherwise.
  const [splitOnly, setSplitOnly] = useState([]);

  // Splitting's own deck, the same swipeable four-section language Activity
  // uses. Opening a group used to take over the *entire* page — quick-add,
  // shared-with-you, history, all hidden behind `!openGroup` guards. Giving
  // each concern its own tab means opening a group only replaces the Groups
  // tab's own content; everything else stays one swipe away.
  const [activeTab, setActiveTab] = useState(0);
  const selectTab = React.useCallback((next) => setActiveTab(next), []);

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

  // Split-only bills you paid: not yet counted in your own expenses. A split
  // someone else made isn't ours to promote — "Add to expenses" PATCHes an
  // expense owned by them and 404s — so only bills owed *to* us belong here.
  const loadSplitOnly = useCallback(async () => {
    try {
      const all = await getSplits({ settled: 'false' });
      setSplitOnly(all.filter(s => s.splitOnly && s.direction === 'owed_to_you'));
    } catch (err) {
      setSplitOnly([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) { load(); loadGroups(); loadShared(); loadSettledHistory(); loadSplitOnly(); }
  }, [isAuthenticated, load, loadGroups, loadShared, loadSettledHistory, loadSplitOnly]);

  // The quick-add placeholder cycles through real examples so the one-line
  // capture teaches itself — paused the moment there's real text or focus, and
  // held on the first phrase under reduced motion rather than looping.
  const [quickAddPhrase, setQuickAddPhrase] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion || quickAddFocused || quickAdd.text) return undefined;
    const id = setInterval(() => setQuickAddPhrase(p => (p + 1) % QUICK_ADD_EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, [reduceMotion, quickAddFocused, quickAdd.text]);

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

  // One real figure per tab for the peek card behind a deck drag - the same
  // "only show a hint once its data has actually loaded" rule Activity uses.
  const deckSections = React.useMemo(() => [
    {
      label: 'Balances', icon: CallSplitIcon, color: accents.cyan,
      hint: !state.loading
        ? (state.net === 0 ? 'All square' : `${state.net > 0 ? '+' : '−'}${money(Math.abs(state.net))}`)
        : undefined,
    },
    {
      label: 'Groups', icon: GroupsIcon, color: accents.violet,
      hint: groups.length ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}` : undefined,
    },
    {
      label: 'Shared', icon: MoveToInboxIcon, color: accents.mint,
      hint: shared.items.length
        ? `${money(shared.items.reduce((s, i) => s + (i.outstanding || 0), 0))} owed`
        : undefined,
    },
    {
      label: 'History', icon: DoneAllIcon, color: accents.amber,
      hint: !settledHistory.loading && settledHistory.items.length
        ? `${settledHistory.items.length} settled`
        : undefined,
    },
  ], [state.loading, state.net, groups.length, shared.items, settledHistory.loading, settledHistory.items.length]);

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

  // Plain language, one line: "split 1200 dinner with raj and priya". The
  // fastest path to a new bill — no model call for the manual dialog below it.
  const runQuickAdd = async () => {
    if (!quickAdd.text.trim()) { setError('Describe the shared expense first'); return; }
    setQuickAdd(prev => ({ ...prev, loading: true }));
    try {
      const result = await splitAddExpense(quickAdd.text.trim());
      const who = result.splits.map(s => `${s.person_name} ${money(s.amount)}`).join(', ');
      setSuccess(`Split ${money(result.expense.amount)} — ${who || 'no one'}`);
      feedback('success');
      setQuickAdd({ text: '', loading: false });
      load(); loadShared(); loadSplitOnly();
    } catch (err) {
      setQuickAdd(prev => ({ ...prev, loading: false }));
      setError(err.message || 'Could not split that');
    }
  };

  const onManualSplitCreated = (result) => {
    setSuccess(`Split ${money(result.amount)} with ${result.splits.length} ` +
      `${result.splits.length === 1 ? 'person' : 'people'}`);
    feedback('success');
    load(); loadShared(); loadSplitOnly();
  };

  // A bill you paid and split, moved from "tracked only" into your own
  // expenses — the flip side of toggleInExpenses, for the other direction.
  const addToExpenses = async (expenseId) => {
    setCountingId(expenseId);
    try {
      await addSplitToExpenses(expenseId);
      feedback('success');
      setSuccess('Added to your expenses');
      setSplitOnly(prev => prev.filter(s => s.expenseId !== expenseId));
    } catch (err) {
      setError(err.message || 'Could not update');
    } finally {
      setCountingId(null);
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
    fireSettleFlow(universeRef.current, person, person.net);
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
      {/* The one app-wide particle layer money-in-motion rides on. Not
          mounted anywhere else yet, so it lives here for now — this is the
          only screen that dispatches toolbox:flow. */}
      <ParticleFlow />
      {/* Shared didn't have its own weather, unlike Home/Today — a flat page
          under a living app. Same signature moment, same real signal. */}
      <AuroraBackground />
      <Container maxWidth="md" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 12, position: 'relative' }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
        <ErrorBanner error={error} onClose={() => setError(null)} />
        {/* Financial weather now lives once in the app top bar, not per-screen. */}

        <ActivityDeck value={activeTab} onChange={selectTab} sections={deckSections}>

        {/* ── Balances ─────────────────────────────────────────────────── */}
        {activeTab === 0 && (
        <Box key="tab-0">
        {/* Net position — the one figure you glance at, and the one real
            ratio behind it. Every pixel of the bar below is (owed / total) or
            (owe / total) — no width here is invented. */}
        <Reveal>
          <NetPositionHero
            netPositive={netPositive}
            net={state.net}
            totalOwed={state.totalOwed}
            totalYouOwe={state.totalYouOwe}
            onRefresh={load}
            posColor={posColor}
            negColor={negColor}
          />
        </Reveal>

        {/* Add a split — plain language first, exact numbers if you'd rather */}
          <Reveal index={1}>
            <Box
              sx={{
                position: 'relative', p: '1px', mb: 2, borderRadius: `${radius.lg + 1}px`,
                // The glow lives in a gradient border, not a box-shadow — cheap,
                // GPU-friendly, and it reads as "this box is listening" the
                // instant you focus it, then settles back to a plain hairline.
                background: quickAddFocused
                  ? `linear-gradient(120deg, ${accents.violet}, ${accents.cyan}, ${accents.violet})`
                  : 'transparent',
                backgroundSize: '200% 200%',
                animation: quickAddFocused && !reduceMotion ? 'toolbox-quickadd-flow 3.2s ease infinite' : 'none',
                transition: `background ${motionTokens.normal}ms ${motionTokens.ease}`,
                '@keyframes toolbox-quickadd-flow': {
                  '0%, 100%': { backgroundPosition: '0% 50%' },
                  '50%': { backgroundPosition: '100% 50%' },
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
                  p: 1, borderRadius: `${radius.lg}px`,
                  border: '1px solid', borderColor: quickAddFocused ? 'transparent' : 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <AutoAwesomeIcon
                  sx={{
                    fontSize: 17, ml: 0.5, color: quickAddFocused ? accents.violet : 'text.disabled',
                    transition: `color ${motionTokens.normal}ms ${motionTokens.ease}`,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 200, position: 'relative' }}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
                    inputProps={{ 'aria-label': 'Describe a shared bill' }}
                    value={quickAdd.text}
                    onChange={(e) => setQuickAdd(prev => ({ ...prev, text: e.target.value }))}
                    onFocus={() => setQuickAddFocused(true)}
                    onBlur={() => setQuickAddFocused(false)}
                    disabled={quickAdd.loading}
                    onKeyDown={(e) => { if (e.key === 'Enter') runQuickAdd(); }}
                  />
                  {/* A real placeholder can't crossfade between phrases, so an
                      absolutely-positioned twin carries the animated examples
                      and steps aside the instant there's real text or focus. */}
                  {!quickAdd.text && !quickAddFocused && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <AnimatePresence mode="wait">
                        <Box
                          component={motion.span}
                          key={quickAddPhrase}
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                          transition={{ duration: motionTokens.normal / 1000, ease: EASE_SETTLE }}
                          sx={{ fontSize: 14, color: 'text.disabled' }}
                        >
                          "{QUICK_ADD_EXAMPLES[quickAddPhrase]}"
                        </Box>
                      </AnimatePresence>
                    </Box>
                  )}
                </Box>
                <Button
                  component={motion.button}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  variant="contained"
                  size="small"
                  onClick={runQuickAdd}
                  disabled={quickAdd.loading || !quickAdd.text.trim()}
                  startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderRadius: `${radius.pill}px`, px: 2,
                    background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`,
                    boxShadow: `0 2px 12px ${accents.violet}40`,
                    '&:hover': { background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`, boxShadow: `0 3px 16px ${accents.violet}55` },
                    '&.Mui-disabled': { background: 'action.disabledBackground' },
                  }}
                >
                  {quickAdd.loading ? 'Splitting…' : 'Split'}
                </Button>
                <Button
                  component={motion.button}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  size="small"
                  color="inherit"
                  onClick={() => setManualOpen(true)}
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{ borderRadius: `${radius.pill}px`, color: 'text.secondary' }}
                >
                  Exact
                </Button>
              </Box>
            </Box>
            <ThinkingHint show={quickAdd.loading} label="Working out the shares…" />
          </Reveal>

        {/* Split-only bills you paid: not yet counted as your own spending */}
        {splitOnly.length > 0 && (
          <Reveal index={1}>
            <Box
              sx={{
                p: 2, mb: 2, borderRadius: `${radius.lg}px`,
                border: '1px dashed', borderColor: `${accents.amber}55`,
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: accents.amber, mb: 0.5 }}>
                Tracked as a split only
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                You paid these but they aren't counted in your spending yet.
              </Typography>
              {splitOnly.map((s, i) => (
                <Box
                  component={motion.div}
                  key={s.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionTokens.normal / 1000, ease: EASE_SETTLE, delay: reduceMotion ? 0 : i * 0.05 }}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 1.5, flexWrap: 'wrap', py: 1.1,
                    borderTop: '1px solid', borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <PersonAvatar name={s.personName} size={32} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{s.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.personName} owes {money(s.amount)}{s.paidBy ? ` · paid by ${s.paidBy}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <CountToggle
                    counted={false}
                    busy={countingId === s.expenseId}
                    onClick={() => addToExpenses(s.expenseId)}
                    label={`Count ${s.description} as your spending`}
                  />
                </Box>
              ))}
            </Box>
          </Reveal>
        )}

        </Box>
        )}

        {/* ── Groups ───────────────────────────────────────────────────── */}
        {activeTab === 1 && (
        <Box key="tab-1">
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

        {!openGroup && groups.length === 0 && (
          <Paper
            elevation={0}
            sx={{ p: { xs: 4, sm: 5 }, borderRadius: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}
          >
            <GroupsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>No groups yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              A flat, a trip, a regular table — start one above.
            </Typography>
          </Paper>
        )}

        {!openGroup && groups.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Pick a group above to see its ledger.
          </Typography>
        )}

        {openGroup && (
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
        )}
        </Box>
        )}

        {/* ── Balances, continued: the ledger itself ──────────────────────── */}
        {activeTab === 0 && (
        <Box key="tab-0b">
        {state.loading ? (
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
              <SplitUniverse
                people={people}
                selectedId={selected?.id}
                onSelect={openPerson}
                onReady={(api) => { universeRef.current = api; }}
              />
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                          <PersonAvatar name={person.name} size={36} />
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
        </Box>
        )}

        {/* ── Shared with you ──────────────────────────────────────────── */}
        {activeTab === 2 && (
        <Box key="tab-2">
        {/* Bills other people split with you, grouped by who paid. */}
        {shared.items.length > 0 && (
          <Reveal index={2}>
            <Box sx={{ mt: 1 }}>
              <Box display="flex" alignItems="baseline" justifyContent="space-between" sx={{ px: 0.5, mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 650 }}>
                  Shared with you
                </Typography>
                <Typography sx={{ ...heroNumSx, fontSize: 13, fontWeight: 700, color: accents.amber }}>
                  {money(shared.items.reduce((s, i) => s + (i.outstanding || 0), 0))}
                </Typography>
              </Box>

              <Stack spacing={1.5}>
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
                    <SharedPayerCard
                      key={personName}
                      personName={personName}
                      group={group}
                      expanded={sharedExpanded === personName}
                      onToggle={() => setSharedExpanded(prev => (prev === personName ? null : personName))}
                      including={including}
                      onToggleInclude={toggleInExpenses}
                      onPay={(item) => setPartial({ open: true, item, saving: false, error: null })}
                      onEdit={(item) => setEditSplit({ open: true, item, saving: false })}
                    />
                  ));
                })()}
                </AnimatePresence>
              </Stack>
            </Box>
          </Reveal>
        )}

        {shared.items.length === 0 && (
          <Paper
            elevation={0}
            sx={{ p: { xs: 4, sm: 5 }, borderRadius: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}
          >
            <MoveToInboxIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>Nothing shared with you</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              When someone splits a bill with you, it shows up here first.
            </Typography>
          </Paper>
        )}
        </Box>
        )}

        {/* ── History ──────────────────────────────────────────────────── */}
        {activeTab === 3 && (
        <Box key="tab-3">
          <Reveal>
                <Paper
                  elevation={0}
                  sx={{ p: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'left' }}
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
          </Reveal>
        </Box>
        )}

        {/* ── Balances, continued: the AI surface ──────────────────────── */}
        {/* A distinct AI surface, scoped to lending only — kept apart from the
            app's spending analysis. Lives on the everyone view, not inside a
            group. */}
        {activeTab === 0 && !state.loading && <LendingAssistant />}
        </ActivityDeck>

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

        <ManualSplitDialog
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          categories={categories}
          onCreated={onManualSplitCreated}
        />

        <Fab
          color="primary"
          onClick={() => setManualOpen(true)}
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
