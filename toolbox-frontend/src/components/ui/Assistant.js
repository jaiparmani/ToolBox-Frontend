import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Dialog, Fade, Grow, InputBase, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { accents, motion as motionTokens, radius, type } from '../../theme/tokens';
import { askAssistant, commitAssistant, deleteExpense } from '../rest/expenseTrackerApis';
import { useMoney } from '../../contexts/MoneyContext';
import AssistantOrb from './AssistantOrb';
import AssistantLauncher from './AssistantLauncher';
import AssistantThinking from './AssistantThinking';
import AssistantButton from './AssistantButton';
import TypedLight from './TypedLight';
import { feedback } from './feedback';
import { money, moneySmart } from './money';

/**
 * The one ToolBox assistant.
 *
 * What changed in this pass — all of it presentation and access, none of it what
 * the assistant does:
 *
 * • **It can be found.** A labelled launcher now stands on every screen with the
 *   shortcut printed on it, instead of the assistant being a keyboard secret
 *   plus a header pill (Apple Design §16, "what can I do here").
 * • **It comes from where you called it.** The panel materialises out of the
 *   control that opened it and leaves the same way (§7).
 * • **The keyboard can drive all of it.** Focus moves in on open and back to the
 *   trigger on close, every control is a real button with a visible ring, Escape
 *   gets out, and nothing traps.
 * • **A screen reader hears the answer once**, from a single polite live region,
 *   rather than word-by-word as the reveal paces (or twice, from a duplicated
 *   hidden copy).
 * • **The wait has something to say** — real figures from the live projection —
 *   and the reveal can be cut short at any moment (§3).
 */

const CAPABILITIES = [
  { icon: ReceiptLongRoundedIcon, tone: accents.mint, title: 'Add an expense', example: '20 aamras' },
  { icon: CallSplitRoundedIcon, tone: accents.blue, title: 'Split a bill', example: 'split 1200 dinner with Raj and Mira' },
  { icon: SearchRoundedIcon, tone: accents.cyan, title: 'Search spending', example: 'How much on food this month?' },
  { icon: InsightsRoundedIcon, tone: accents.purple, title: 'Ask how you’re doing', example: 'Did I overspend on food?' },
];

const NAV = {
  home: '/dashboard', dashboard: '/dashboard', activity: '/expense-tracker',
  expenses: '/expense-tracker', inbox: '/inbox', insights: '/reports', reports: '/reports',
  shared: '/splits', splits: '/splits', recurring: '/recurring',
  settings: '/profile',
};

/** A screen-reader summary of a result card, so nothing lives only in the layout. */
function describeCard(card = {}) {
  if (card.error) return `Could not answer: ${card.error}`;
  switch (card.type) {
    case 'expense_added': {
      const e = card.expense || {};
      return `Saved ${e.description} for ${money(parseFloat(e.amount))}.`;
    }
    case 'batch_added':
      return `Saved ${(card.expenses || []).length} transactions.`;
    case 'split_added': {
      const e = card.expense || {};
      return `Split ${e.description} of ${money(parseFloat(e.amount || 0))} across ${(card.splits || []).length} people.`;
    }
    case 'search':
      return `${money(card.total)} across ${card.count} ${card.count === 1 ? 'transaction' : 'transactions'}.`;
    case 'insight':
      return [card.headline, card.summary].filter(Boolean).join('. ');
    case 'tag_suggestion':
      return `Suggested tags for ${card.description}: ${(card.tags || []).join(', ')}.`;
    default:
      return '';
  }
}

/**
 * The panel arrives as a material, not a fade — scale and opacity together, from
 * the point the trigger occupies (set imperatively in `onEnter` below), and it
 * leaves back along the same path. Reduced motion gets a plain, short cross-fade.
 */
const AssistantMaterialize = React.forwardRef(function AssistantMaterialize(props, ref) {
  const reduce = useReducedMotion();
  return reduce
    ? <Fade ref={ref} {...props} timeout={{ enter: motionTokens.fast, exit: motionTokens.instant }} />
    : <Grow ref={ref} {...props} timeout={{ enter: motionTokens.slow, exit: motionTokens.normal }} />;
});

export default function Assistant() {
  const navigate = useNavigate();
  const { projection, refresh: refreshMoney } = useMoney();
  // Live signal, not a one-time read: a user who flips the OS setting mid-session
  // gets the calm version without a reload.
  const reduce = !!useReducedMotion();

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [turns, setTurns] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(0);
  const [revealAll, setRevealAll] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const bodyRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const launcherRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const originRef = React.useRef(null);
  const convId = React.useRef(null);

  const orbState = loading ? 'thinking' : speaking > 0 ? 'speaking' : 'idle';
  const onSpeakStart = React.useCallback(() => setSpeaking((s) => s + 1), []);
  const onSpeakEnd = React.useCallback(() => setSpeaking((s) => Math.max(0, s - 1)), []);

  const [unseen, setUnseen] = React.useState(false);
  const openRef = React.useRef(false);
  React.useEffect(() => {
    openRef.current = open;
    if (open) setUnseen(false);
    // Turns unmount with the panel; don't leave the orb stuck mid-sentence.
    else setSpeaking(0);
  }, [open]);

  // ── Where the panel comes from, and where focus goes back to ───────────────
  const openPanel = React.useCallback((el) => {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const src = el
      || (active instanceof HTMLElement && active !== document.body ? active : null)
      || launcherRef.current;
    triggerRef.current = src || null;
    const r = src?.getBoundingClientRect?.();
    originRef.current = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    feedback('open');
    setOpen(true);
  }, []);

  const closePanel = React.useCallback(() => setOpen(false), []);

  // The transition wraps the dialog's full-viewport container, so the trigger's
  // viewport coordinates are already the right origin: the panel swells out of
  // the control that summoned it, and shrinks back into it on the way out.
  const applyOrigin = React.useCallback((node) => {
    if (!node) return;
    const o = originRef.current;
    if (!o) { node.style.transformOrigin = ''; return; }
    node.style.transformOrigin = `${Math.round(o.x)}px ${Math.round(o.y)}px`;
  }, []);

  // We take focus restoration off MUI's hands because the trigger is often a
  // plain element that can't hold focus — then the launcher is the honest place
  // to land, never the document body.
  const restoreFocus = React.useCallback(() => {
    // Runs on the next frame: the launcher remounts as the panel leaves, and
    // MUI settles its own focus bookkeeping on the way out, so focusing during
    // the exit gets overwritten. One frame later the DOM has stopped moving.
    const put = () => {
      const t = triggerRef.current;
      if (t && t.isConnected && typeof t.focus === 'function') {
        try { t.focus({ preventScroll: true }); } catch { t.focus(); }
      }
      // The floating launcher unmounts while the panel is open, so the node we
      // opened from is often detached by now - fall back to the one that has
      // just come back rather than leaving the user at the top of the document.
      const ae = document.activeElement;
      if (!ae || ae === document.body) {
        try { launcherRef.current?.focus?.({ preventScroll: true }); }
        catch { launcherRef.current?.focus?.(); }
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(put);
    else put();
  }, []);

  // ── The facts the assistant has to hand while it thinks (all real) ─────────
  const facts = React.useMemo(() => {
    const p = projection || {};
    const out = [];
    if (p.safe_to_spend_today != null) out.push(`${moneySmart(p.safe_to_spend_today)} safe to spend today`);
    if (p.runway_days != null) out.push(`about ${p.runway_days} day${p.runway_days === 1 ? '' : 's'} of runway left`);
    if (Number(p.upcoming_bills) > 0) out.push(`${moneySmart(p.upcoming_bills)} in bills coming up`);
    if (Number(p.upcoming_income) > 0) out.push(`${moneySmart(p.upcoming_income)} of income on the way`);
    if (p.projected_low != null) out.push(`projected low of ${moneySmart(p.projected_low)}`);
    return out;
  }, [projection]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (openRef.current) setOpen(false); else openPanel();
      }
    };
    const onOpenEvent = () => { if (!openRef.current) openPanel(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('toolbox:command-palette', onOpenEvent);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('toolbox:command-palette', onOpenEvent); };
  }, [openPanel]);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [turns, loading]);

  // Empty the live region once it has spoken, so a reader browsing the panel
  // doesn't later stumble on a stale copy of an answer that's already on screen.
  React.useEffect(() => {
    if (!announcement) return undefined;
    const id = setTimeout(() => setAnnouncement(''), 4000);
    return () => clearTimeout(id);
  }, [announcement]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const m = q.toLowerCase().match(/^(?:go to|open|show me|show)\s+([a-z]+)/);
    if (m && NAV[m[1]]) { navigate(NAV[m[1]]); closePanel(); return; }

    setInput('');
    setRevealAll(false);
    feedback('send');
    const uid = Date.now();
    setTurns((t) => [...t, { id: uid, role: 'user', text: q }]);
    setLoading(true);
    setAnnouncement('Thinking…');
    try {
      const r = await askAssistant(q, { conversationId: convId.current });
      if (r.conversation_id) convId.current = r.conversation_id;
      setTurns((t) => [...t, { id: uid + 1, role: 'assistant', card: r, q }]);
      // Say it once, politely and in full — the visual reveal is paced, the
      // announcement is not, so a screen reader never waits on an animation.
      setAnnouncement([r.reply, describeCard(r)].filter(Boolean).join(' ') || 'Answered.');
      if (!openRef.current) { setUnseen(true); feedback('success'); }
      // Refresh balances when the assistant saved something.
      if (r.type === 'expense_added' || r.type === 'batch_added' || r.type === 'split_added') {
        refreshMoney();
        if (r.type === 'split_added') window.dispatchEvent(new Event('toolbox:notify-refresh'));
      }
    } catch (e) {
      feedback('error');
      setTurns((t) => [...t, { id: uid + 1, role: 'assistant', card: { type: 'error', error: e.message }, q }]);
      setAnnouncement(`Could not answer: ${e.message}`);
      if (!openRef.current) setUnseen(true);
    } finally {
      setLoading(false);
    }
  };

  // Legacy confirm path (for tags which still use the two-step flow).
  const confirm = async (turnId, payload) => {
    setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, committing: true } : x)));
    try {
      const res = await commitAssistant(payload);
      feedback('success');
      if (payload?.commit === 'split') window.dispatchEvent(new Event('toolbox:notify-refresh'));
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, committing: false, committed: res } : x)));
      setAnnouncement('Saved.');
      refreshMoney();
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, committing: false, card: { ...x.card, error: e.message } } : x)));
      setAnnouncement(`Could not save: ${e.message}`);
    }
  };

  const handleDelete = async (turnId, expenseIds) => {
    setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, deleting: true } : x)));
    try {
      for (const id of expenseIds) {
        await deleteExpense(id);
      }
      feedback('success');
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, deleting: false, deleted: true } : x)));
      setAnnouncement('Deleted.');
      refreshMoney();
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, deleting: false, card: { ...x.card, error: e.message } } : x)));
      setAnnouncement(`Could not delete: ${e.message}`);
    }
  };

  const prefill = (example) => {
    setInput(example);
    // Fills the box rather than firing — a mis-click used to create a real
    // transaction. Agency and forgiveness (§16.2) beat one saved keystroke.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const statusLine = loading ? 'Thinking…' : speaking > 0 ? 'Answering…' : 'Ready when you are';
  const canSend = !!input.trim() && !loading;

  return (
    <>
      {/* One polite live region for the whole surface. Always mounted, so a reply
          that lands while the panel is shut is still announced — once. */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' }}
      >
        {announcement}
      </Box>

      {!open && (
        <AssistantLauncher
          state={loading ? 'thinking' : 'idle'}
          unseen={unseen}
          onOpen={openPanel}
          buttonRef={launcherRef}
        />
      )}

      <Dialog
        open={open}
        onClose={closePanel}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
        aria-labelledby="assistant-title"
        aria-describedby="assistant-hint"
        TransitionComponent={AssistantMaterialize}
        TransitionProps={{ onEnter: applyOrigin, onExited: restoreFocus }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(6px)',
              '@media (prefers-reduced-transparency: reduce)': { backdropFilter: 'none', backgroundColor: 'rgba(0,0,0,0.72)' },
            },
          },
        }}
        PaperProps={{
          'aria-busy': loading,
          sx: {
            position: 'absolute', top: { xs: 16, sm: 72 }, m: 0, width: '100%',
            height: turns.length ? { xs: '82vh', sm: 580 } : 'auto',
            borderRadius: `${radius.xxl}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            backgroundImage: `radial-gradient(120% 120% at 0% 0%, ${accents.violet}22, transparent 52%), radial-gradient(90% 90% at 100% 100%, ${accents.cyan}14, transparent 55%)`,
            backdropFilter: 'blur(34px) saturate(1.6)',
            boxShadow: orbState === 'idle'
              ? `0 30px 90px rgba(0,0,0,0.6), 0 0 60px -20px ${accents.violet}66`
              : `0 30px 90px rgba(0,0,0,0.6), 0 0 100px -14px ${orbState === 'thinking' ? accents.violet : accents.cyan}b0`,
            transition: `box-shadow ${motionTokens.slower}ms ${motionTokens.ease}`,
            // A lit edge that answers the assistant's state by brightening —
            // opacity only. (It used to hue-rotate on a 7s loop, which repaints
            // a large surface forever and is exactly the slow oscillation the
            // reduced-motion guidance warns about.)
            '&::before': {
              content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1px', pointerEvents: 'none',
              background: `conic-gradient(from 210deg, ${accents.violet}, ${accents.cyan}, ${accents.blue}, ${accents.violet})`,
              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor', maskComposite: 'exclude',
              opacity: orbState === 'idle' ? 0.5 : 0.95,
              transition: `opacity ${motionTokens.slow}ms ${motionTokens.ease}`,
            },
            '@media (prefers-reduced-transparency: reduce)': {
              backdropFilter: 'none',
              backgroundImage: 'none',
              backgroundColor: 'background.paper',
            },
            '@media (prefers-contrast: more)': {
              border: '1px solid', borderColor: 'text.primary',
              backgroundImage: 'none',
              '&::before': { opacity: 0 },
            },
          },
        }}
      >
        {/* ── Where am I, and how do I get out (§16 wayfinding) ─────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, pt: 2, pb: 1.25, flexShrink: 0 }}>
          {turns.length > 0 && <AssistantOrb state={orbState} size={40} reduce={reduce} />}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              id="assistant-title"
              sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              Money OS Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{statusLine}</Typography>
          </Box>
          {speaking > 0 && (
            <AssistantButton onClick={() => setRevealAll(true)} tone={accents.cyan} variant="outline">
              Show it all
            </AssistantButton>
          )}
          <AssistantButton
            onClick={closePanel}
            aria-label="Close the assistant (Escape)"
            tone={accents.violet}
            variant="quiet"
            round
            sx={{ width: 34, color: 'text.secondary' }}
          >
            <CloseRoundedIcon sx={{ fontSize: 19 }} />
          </AssistantButton>
        </Box>

        {turns.length > 0 && (
          <Box
            ref={bodyRef}
            tabIndex={0}
            aria-label="Conversation with the assistant"
            sx={{
              flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2, pt: 0.5,
              display: 'flex', flexDirection: 'column', gap: 1.5,
              '&:focus-visible': { outline: `2px solid ${accents.violet}`, outlineOffset: -2, borderRadius: `${radius.md}px` },
            }}
          >
            {turns.map((turn) => (
              <Turn
                key={turn.id} turn={turn} reduce={reduce} navigate={navigate}
                revealAll={revealAll}
                onConfirm={confirm} onDelete={handleDelete} onClose={closePanel} onRetry={send}
                onSpeakStart={onSpeakStart} onSpeakEnd={onSpeakEnd}
              />
            ))}
            {loading && <AssistantThinking facts={facts} reduce={reduce} />}
          </Box>
        )}

        {turns.length === 0 && (
          <Box
            sx={{
              textAlign: 'center', px: { xs: 2, sm: 3 }, pt: 1, pb: 1.5, position: 'relative',
              '@keyframes assistRise': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
              '@keyframes assistAura': {
                '0%,100%': { opacity: 0.5, transform: 'translate(-50%,-50%) scale(1)' },
                '50%': { opacity: 0.75, transform: 'translate(-50%,-50%) scale(1.08)' },
              },
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute', top: 60, left: '50%', width: 240, height: 240,
                transform: 'translate(-50%,-50%)', pointerEvents: 'none', borderRadius: '50%',
                background: `radial-gradient(circle, ${accents.violet}33, ${accents.blue}18 45%, transparent 70%)`,
                filter: 'blur(20px)', willChange: reduce ? undefined : 'transform, opacity',
                animation: reduce ? 'none' : 'assistAura 6s ease-in-out infinite',
              }}
            />
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 1.75 }}>
              <AssistantOrb
                state={orbState}
                size={74}
                reduce={reduce}
                // Standing alone here, so it carries its own text alternative.
                label={`Money OS assistant, ${orbState === 'thinking' ? 'thinking' : orbState === 'speaking' ? 'answering' : 'idle'}`}
              />
            </Box>
            <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.025em', position: 'relative', lineHeight: 1.15 }}>
              How can I help?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, mb: 2, maxWidth: 380, mx: 'auto', position: 'relative' }}>
              One box, one brain. Pick a starting point — it fills the box so you can edit it first.
            </Typography>

            {/* The four things it can actually do, named plainly. */}
            <Box
              sx={{
                display: 'grid', gap: 1,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                textAlign: 'left', position: 'relative',
              }}
            >
              {CAPABILITIES.map((c, i) => (
                <AssistantButton
                  key={c.title}
                  onClick={() => prefill(c.example)}
                  aria-label={`${c.title}. Try: ${c.example}. Fills the box so you can edit it before sending.`}
                  variant="outline"
                  tone={c.tone}
                  sx={{
                    justifyContent: 'flex-start', gap: 1.25, p: 1.25, minHeight: 56,
                    borderRadius: `${radius.lg}px`, color: 'text.primary',
                    borderColor: `${c.tone}33`,
                    background: `linear-gradient(120deg, ${c.tone}10, transparent 80%)`,
                    opacity: reduce ? 1 : 0,
                    animation: reduce ? 'none' : `assistRise ${motionTokens.slow}ms ${motionTokens.ease} forwards`,
                    animationDelay: reduce ? undefined : `${90 + i * 55}ms`,
                    '&:hover': { borderColor: c.tone, background: `linear-gradient(120deg, ${c.tone}1f, transparent 80%)` },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 32, height: 32, flexShrink: 0, borderRadius: `${radius.md - 2}px`,
                      backgroundColor: `${c.tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <c.icon sx={{ fontSize: 18, color: c.tone }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ display: 'block', fontWeight: 650, fontSize: '0.84rem', lineHeight: 1.25 }}>
                      {c.title}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontWeight: 450 }}>
                      “{c.example}”
                    </Typography>
                  </Box>
                </AssistantButton>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Ask ───────────────────────────────────────────────────────────── */}
        <Box sx={{ px: 2, pt: 1.25, pb: 1.75, flexShrink: 0 }}>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 0.6,
              borderRadius: `${radius.pill}px`,
              border: '1.5px solid', borderColor: `${accents.violet}40`,
              backgroundColor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
              transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
              '&:focus-within': { borderColor: accents.violet, boxShadow: `0 0 0 3px ${accents.violet}33, 0 8px 26px -8px ${accents.violet}77` },
            }}
          >
            <AutoAwesomeRoundedIcon aria-hidden sx={{ color: accents.violet, fontSize: 20, flexShrink: 0 }} />
            <InputBase
              autoFocus
              fullWidth
              value={input}
              inputRef={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); send(); }
                if (e.key === 'Escape') { e.stopPropagation(); closePanel(); }
              }}
              placeholder="Add, split, search, or ask…"
              inputProps={{
                'aria-label': 'Ask the Money OS assistant',
                'aria-describedby': 'assistant-hint',
                enterKeyHint: 'send',
              }}
              sx={{ fontSize: '1.02rem', fontWeight: 500 }}
            />
            <AssistantButton
              onClick={() => send()}
              disabled={!canSend}
              aria-label="Send"
              round
              tone={accents.violet}
              variant="solid"
              sx={{
                width: 34, flexShrink: 0,
                background: canSend ? `linear-gradient(135deg, ${accents.violet}, ${accents.blue})` : undefined,
                backgroundColor: canSend ? undefined : 'action.disabledBackground',
                boxShadow: canSend ? `0 6px 16px -4px ${accents.violet}aa` : 'none',
              }}
            >
              <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
            </AssistantButton>
          </Box>
          <Typography
            id="assistant-hint"
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 0.9, fontSize: '0.68rem' }}
          >
            Enter to send · Esc to close · ⌘K from anywhere
          </Typography>
        </Box>
      </Dialog>
    </>
  );
}

function Turn({ turn, reduce, navigate, revealAll, onConfirm, onDelete, onClose, onRetry, onSpeakStart, onSpeakEnd }) {
  const c = turn.card || {};
  const hasReply = turn.role === 'assistant' && !!c.reply && !turn.committed && !turn.deleted;
  const [streamed, setStreamed] = React.useState(reduce || !hasReply);

  const revealSx = reduce ? {} : {
    animation: `asstIn ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
    '@keyframes asstIn': { from: { opacity: 0, transform: 'translateY(10px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
  };

  if (turn.role === 'user') {
    return (
      <Box sx={{ alignSelf: 'flex-end', maxWidth: '85%', px: 1.75, py: 1, borderRadius: 3, borderTopRightRadius: 6, backgroundColor: `${accents.violet}22`, ...revealSx }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>You asked: </Box>
          {turn.text}
        </Typography>
      </Box>
    );
  }

  const emitSx = reduce ? {} : {
    animation: `asstEmit ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
    '@keyframes asstEmit': {
      from: { opacity: 0, transform: 'translateY(8px) scale(0.94)' },
      to: { opacity: 1, transform: 'none' },
    },
  };

  return (
    <Box sx={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
      {hasReply && (
        <Typography variant="body2" color="text.secondary" sx={{ position: 'relative', mb: c.type === 'answer' ? 0 : 1 }}>
          <TypedLight
            text={c.reply} reduce={reduce} revealNow={revealAll} onStart={onSpeakStart}
            onDone={() => { setStreamed(true); onSpeakEnd?.(); }}
          />
        </Typography>
      )}

      {turn.deleted ? (
        <Typography variant="caption" color="text.disabled">Deleted.</Typography>
      ) : turn.committed ? (
        <Box sx={emitSx}><SuccessCard result={turn.committed} onClose={onClose} navigate={navigate} /></Box>
      ) : streamed ? (
        <Box sx={emitSx}>
          <CardBody
            card={c} turn={turn} onConfirm={onConfirm} onDelete={onDelete}
            onClose={onClose} onRetry={onRetry} navigate={navigate}
          />
        </Box>
      ) : null}
    </Box>
  );
}

function CardBody({ card, turn, onConfirm, onDelete, onClose, onRetry, navigate }) {
  const busy = turn.committing || turn.deleting;

  if (card.error) {
    const noKey = /openrouter|ai features are unavailable/i.test(card.error);
    const offline = /failed to fetch|network|load failed/i.test(card.error);
    // A dead end is a design failure (§16 wayfinding): say plainly what happened,
    // what still works without it, and offer the way forward.
    return (
      <Panel tone={accents.amber}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {noKey ? 'The assistant isn’t switched on yet' : offline ? 'I couldn’t reach the server' : 'That didn’t go through'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.5 }}>
          {noKey
            ? 'Add an OpenRouter key in settings and I can read and write your money in plain language. Everything else in Money OS works without it.'
            : offline
              ? 'Your connection or the server dropped out. Nothing was saved, so nothing is half-done.'
              : card.error}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
          {turn.q && !noKey && (
            <AssistantButton
              onClick={() => onRetry?.(turn.q)}
              tone={accents.amber}
              variant="outline"
              startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
            >
              Try again
            </AssistantButton>
          )}
          <AssistantButton onClick={() => { onClose(); navigate('/profile'); }} tone={accents.blue} variant="quiet">
            {noKey ? 'Open settings' : 'Go to settings'}
          </AssistantButton>
        </Box>
      </Panel>
    );
  }

  switch (card.type) {
    case 'expense_added': {
      const e = card.expense;
      return (
        <Panel tone={accents.mint}>
          <Row icon={ReceiptLongRoundedIcon} tone={accents.mint}
            title={e.description} amount={parseFloat(e.amount)} type={e.transaction_type}
            category={e.category_name || e.category?.name} tags={e.tags?.map((t) => t.name || t)} />
          <SavedActions busy={busy} deleting={turn.deleting}
            deleteLabel={`Delete ${e.description}`}
            onDelete={() => onDelete(turn.id, [e.id])}
            onView={() => { onClose(); navigate('/expense-tracker'); }} />
        </Panel>
      );
    }
    case 'batch_added': {
      const expenses = card.expenses || [];
      return (
        <Panel tone={accents.mint}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            <CheckCircleRoundedIcon aria-hidden sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom', color: accents.mint }} />
            {expenses.length} transactions saved
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, mt: 0.75, mb: 0, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 180, overflowY: 'auto' }}>
            {expenses.map((e) => (
              <Box component="li" key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" noWrap>{e.description}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(parseFloat(e.amount))}</Typography>
              </Box>
            ))}
          </Box>
          <SavedActions busy={busy} deleting={turn.deleting}
            deleteLabel={`Delete all ${expenses.length}`}
            onDelete={() => onDelete(turn.id, expenses.map((e) => e.id))}
            onView={() => { onClose(); navigate('/expense-tracker'); }} />
        </Panel>
      );
    }
    case 'split_added': {
      const e = card.expense;
      const splits = card.splits || [];
      return (
        <Panel tone={accents.mint}>
          <Row icon={CallSplitRoundedIcon} tone={accents.mint}
            title={e?.description} amount={parseFloat(e?.amount || 0)} type="expense"
            category={e?.category_name || e?.category?.name} />
          <Box component="ul" sx={{ listStyle: 'none', p: 0, mt: 1, mb: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {splits.map((s, i) => (
              <Box component="li" key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{s.person_name || s.person?.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: accents.blue, fontVariantNumeric: 'tabular-nums' }}>{money(parseFloat(s.amount))}</Typography>
              </Box>
            ))}
          </Box>
          <SavedActions busy={busy} deleting={turn.deleting}
            deleteLabel={`Delete ${e?.description || 'this split'}`}
            onDelete={() => onDelete(turn.id, [e.id])}
            onView={() => { onClose(); navigate('/splits'); }} />
        </Panel>
      );
    }
    // Legacy preview types — kept for backward compatibility with cached responses
    case 'expense_preview': {
      const d = card.draft;
      return (
        <Panel tone={accents.blue}>
          <Row icon={ReceiptLongRoundedIcon} tone={accents.blue}
            title={d.description} amount={d.amount} type={d.transaction_type} category={d.category_name} tags={d.tags} />
          <Actions busy={busy} confirmLabel="Add expense" tone={accents.blue}
            onConfirm={() => onConfirm(turn.id, { commit: 'expense', draft: d })} onDiscard={() => {}} />
        </Panel>
      );
    }
    case 'search': {
      return (
        <Panel tone={accents.cyan}>
          {card.interpretation && <Typography variant="caption" color="text.secondary">{card.interpretation}</Typography>}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5, mb: card.results?.length ? 1 : 0 }}>
            <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 750, fontSize: '1.5rem', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {money(card.total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">across {card.count} {card.count === 1 ? 'transaction' : 'transactions'}</Typography>
          </Box>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 200, overflowY: 'auto' }}>
            {(card.results || []).slice(0, 8).map((r) => (
              <Box component="li" key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{r.description}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.date}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</Typography>
              </Box>
            ))}
          </Box>
        </Panel>
      );
    }
    case 'insight': {
      return (
        <Panel tone={accents.purple}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.75, lineHeight: 1.3 }}>
            <InsightsRoundedIcon aria-hidden sx={{ fontSize: 18, color: accents.purple, flexShrink: 0 }} />{card.headline}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{card.summary}</Typography>
          {(card.suggestions || []).length > 0 && (
            <Box component="ul" sx={{ pl: 2.5, my: 1, '& li': { mb: 0.25 } }}>
              {card.suggestions.slice(0, 3).map((s, i) => <li key={i}><Typography variant="body2">{s}</Typography></li>)}
            </Box>
          )}
          {card.entries_analysed != null && (
            <Typography variant="caption" color="text.disabled">From {card.entries_analysed} entries in your data.</Typography>
          )}
        </Panel>
      );
    }
    case 'tag_suggestion': {
      return (
        <Panel tone={accents.mint}>
          <Typography variant="body2">Tag <b>{card.description}</b> with:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 1 }}>
            {(card.tags || []).map((t) => (
              <Chip key={t} label={t} size="small" icon={<SellRoundedIcon />} sx={{ bgcolor: `${accents.mint}22`, color: accents.mint }} />
            ))}
          </Box>
          <Actions busy={busy} confirmLabel="Apply tags" tone={accents.mint}
            onConfirm={() => onConfirm(turn.id, { commit: 'tags', expense_id: card.expense_id, tags: card.tags })} onDiscard={() => {}} />
        </Panel>
      );
    }
    case 'answer':
    default:
      return null;
  }
}

function Panel({ tone, children }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: `${radius.lg}px`, border: '1px solid', borderColor: `${tone}44`, background: `linear-gradient(120deg, ${tone}12, transparent 80%)` }}>
      {children}
    </Box>
  );
}

function Row({ icon: Icon, tone, title, amount, type: kind, category, tags }) {
  const income = kind === 'income';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box aria-hidden sx={{ width: 36, height: 36, borderRadius: `${radius.sm + 2}px`, flexShrink: 0, backgroundColor: `${tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ color: tone, fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 650 }} noWrap>{title}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
          {category && <Chip label={category} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
          {(tags || []).map((t) => <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />)}
        </Box>
      </Box>
      <Typography sx={{ fontWeight: 750, fontVariantNumeric: 'tabular-nums', color: income ? accents.mint : 'text.primary' }}>
        {income ? '+' : ''}{money(amount)}
      </Typography>
    </Box>
  );
}

function SavedActions({ busy, deleting, onDelete, onView, deleteLabel = 'Delete' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
        <CheckCircleRoundedIcon aria-hidden sx={{ color: accents.mint, fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: accents.mint }}>Saved</Typography>
      </Box>
      <AssistantButton onClick={onView} disabled={busy} tone={accents.blue} variant="quiet">
        View
      </AssistantButton>
      <AssistantButton
        onClick={onDelete}
        disabled={busy}
        aria-label={deleteLabel}
        tone={accents.red}
        variant="outline"
        startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />}
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </AssistantButton>
    </Box>
  );
}

function Actions({ busy, confirmLabel, tone, onConfirm, onDiscard }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
      <AssistantButton onClick={onConfirm} disabled={busy} tone={tone} variant="solid" sx={{ flex: 1, minHeight: 38 }}>
        {busy ? 'Saving…' : confirmLabel}
      </AssistantButton>
      <AssistantButton onClick={onDiscard} disabled={busy} variant="outline" tone={accents.violet} sx={{ minHeight: 38, color: 'text.secondary', borderColor: 'divider' }}>
        Discard
      </AssistantButton>
    </Box>
  );
}

function SuccessCard({ result, onClose, navigate }) {
  const label = result.kind === 'split' ? 'Split created'
    : result.kind === 'batch' ? `Added ${result.count} transactions`
      : result.kind === 'tags' ? 'Tags applied'
        : `Added ${result.expense?.description || 'expense'}`;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: `${radius.md + 2}px`, border: '1px solid', borderColor: `${accents.mint}55`, backgroundColor: `${accents.mint}14` }}>
      <CheckCircleRoundedIcon aria-hidden sx={{ color: accents.mint, fontSize: 20 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{label}</Typography>
      <AssistantButton
        onClick={() => { onClose(); navigate(result.kind === 'split' ? '/splits' : '/expense-tracker'); }}
        tone={accents.blue}
        variant="quiet"
      >
        View
      </AssistantButton>
    </Box>
  );
}
