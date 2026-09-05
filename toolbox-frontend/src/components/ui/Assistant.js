import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Dialog, InputBase, Typography, useTheme } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { accents, motion as motionTokens, type } from '../../theme/tokens';
import { askAssistant, commitAssistant, deleteExpense } from '../rest/expenseTrackerApis';
import { useMoney } from '../../contexts/MoneyContext';
import ThinkingHint from './ThinkingHint';
import AssistantOrb from './AssistantOrb';
import TypedLight from './TypedLight';
import { feedback } from './feedback';
import { money, moneySmart } from './money';

const EXAMPLES = [
  '20 aamras',
  'How much on food this month?',
  'split 1200 dinner with Raj and Mira',
  'Did I overspend on food?',
];

const NAV = {
  home: '/dashboard', dashboard: '/dashboard', activity: '/expense-tracker',
  expenses: '/expense-tracker', inbox: '/inbox', insights: '/reports', reports: '/reports',
  shared: '/splits', splits: '/splits', recurring: '/recurring', health: '/health-tracker',
  settings: '/profile',
};

export default function Assistant() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { projection, refresh: refreshMoney } = useMoney();
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [turns, setTurns] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(0);
  const bodyRef = React.useRef(null);
  const convId = React.useRef(null);

  const orbState = loading ? 'thinking' : speaking > 0 ? 'speaking' : 'idle';
  const onSpeakStart = React.useCallback(() => setSpeaking(s => s + 1), []);
  const onSpeakEnd = React.useCallback(() => setSpeaking(s => Math.max(0, s - 1)), []);

  const [unseen, setUnseen] = React.useState(false);
  const openRef = React.useRef(false);
  React.useEffect(() => { openRef.current = open; if (open) setUnseen(false); }, [open]);

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
  const [factIdx, setFactIdx] = React.useState(0);
  React.useEffect(() => {
    if (!loading || facts.length === 0) return undefined;
    setFactIdx(0);
    const id = setInterval(() => setFactIdx(i => (i + 1) % facts.length), 2400);
    return () => clearInterval(id);
  }, [loading, facts.length]);
  const thinkingText = loading && facts.length ? facts[factIdx % facts.length] : null;

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setOpen(o => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('toolbox:command-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('toolbox:command-palette', onOpen); };
  }, []);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [turns, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const m = q.toLowerCase().match(/^(?:go to|open|show me|show)\s+([a-z]+)/);
    if (m && NAV[m[1]]) { navigate(NAV[m[1]]); setOpen(false); return; }

    setInput('');
    feedback('send');
    const uid = Date.now();
    setTurns(t => [...t, { id: uid, role: 'user', text: q }]);
    setLoading(true);
    try {
      const r = await askAssistant(q, { conversationId: convId.current });
      if (r.conversation_id) convId.current = r.conversation_id;
      setTurns(t => [...t, { id: uid + 1, role: 'assistant', card: r }]);
      if (!openRef.current) { setUnseen(true); feedback('success'); }
      // Refresh balances when the assistant saved something.
      if (r.type === 'expense_added' || r.type === 'batch_added' || r.type === 'split_added') {
        refreshMoney();
        if (r.type === 'split_added') window.dispatchEvent(new Event('toolbox:notify-refresh'));
      }
    } catch (e) {
      feedback('error');
      setTurns(t => [...t, { id: uid + 1, role: 'assistant', card: { type: 'error', error: e.message } }]);
      if (!openRef.current) setUnseen(true);
    } finally {
      setLoading(false);
    }
  };

  // Legacy confirm path (for tags which still use the two-step flow).
  const confirm = async (turnId, payload) => {
    setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: true } : x));
    try {
      const res = await commitAssistant(payload);
      feedback('success');
      if (payload?.commit === 'split') window.dispatchEvent(new Event('toolbox:notify-refresh'));
      setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: false, committed: res } : x));
      refreshMoney();
    } catch (e) {
      setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: false, card: { ...x.card, error: e.message } } : x));
    }
  };

  const handleDelete = async (turnId, expenseIds) => {
    setTurns(t => t.map(x => x.id === turnId ? { ...x, deleting: true } : x));
    try {
      for (const id of expenseIds) {
        await deleteExpense(id);
      }
      feedback('success');
      setTurns(t => t.map(x => x.id === turnId ? { ...x, deleting: false, deleted: true } : x));
      refreshMoney();
    } catch (e) {
      setTurns(t => t.map(x => x.id === turnId ? { ...x, deleting: false, card: { ...x.card, error: e.message } } : x));
    }
  };

  const showDock = !open && (loading || turns.length > 0);

  return (
    <>
    {showDock && (
      <Box
        role="button"
        aria-label={unseen ? 'Assistant has a reply' : 'Reopen the assistant'}
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed', zIndex: (t) => t.zIndex.speedDial,
          left: 16, bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 24 },
          cursor: 'pointer', borderRadius: 999, p: '5px',
          '@keyframes dockIn': { from: { opacity: 0, transform: 'translateY(10px) scale(0.9)' }, to: { opacity: 1, transform: 'none' } },
          animation: reduce ? 'none' : 'dockIn 260ms cubic-bezier(0.2,0.7,0.2,1)',
        }}
      >
        <AssistantOrb state={loading ? 'thinking' : 'idle'} size={46} reduce={reduce} />
        {unseen && !loading && (
          <Box aria-hidden sx={{
            position: 'absolute', top: 2, right: 2, width: 13, height: 13, borderRadius: '50%',
            background: accents.mint, border: '2px solid', borderColor: 'background.default',
            boxShadow: `0 0 10px ${accents.mint}`,
            '@keyframes dotPop': { '0%': { transform: 'scale(0)' }, '70%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
            animation: reduce ? 'none' : 'dotPop 320ms ease-out',
          }} />
        )}
      </Box>
    )}
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute', top: { xs: 16, sm: 72 }, m: 0, width: '100%',
          height: turns.length ? { xs: '82vh', sm: 560 } : 'auto',
          borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          backgroundImage: `radial-gradient(120% 120% at 0% 0%, ${accents.violet}22, transparent 52%), radial-gradient(90% 90% at 100% 100%, ${accents.cyan}14, transparent 55%)`,
          backdropFilter: 'blur(34px) saturate(1.6)',
          boxShadow: orbState === 'idle'
            ? `0 30px 90px rgba(0,0,0,0.6), 0 0 60px -20px ${accents.violet}66`
            : `0 30px 90px rgba(0,0,0,0.6), 0 0 100px -14px ${orbState === 'thinking' ? accents.violet : accents.cyan}b0`,
          transition: 'box-shadow 600ms ease',
          '&::before': {
            content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1px', pointerEvents: 'none',
            background: `conic-gradient(from 0deg, ${accents.violet}, ${accents.cyan}, ${accents.blue}, ${accents.violet})`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
            opacity: orbState === 'idle' ? 0.55 : 0.95,
            transition: 'opacity 400ms ease',
            animation: reduce ? 'none' : `dialogHue ${orbState === 'thinking' ? 2.4 : orbState === 'speaking' ? 4 : 7}s linear infinite`,
          },
          '@keyframes dialogHue': { to: { filter: 'hue-rotate(360deg)' } },
        },
      }}
    >
      {turns.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, pt: 2.25, pb: 1.5, flexShrink: 0 }}>
          <AssistantOrb state={orbState} size={44} reduce={reduce} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2 }}>ToolBox Assistant</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {loading ? (thinkingText || 'Thinking…') : speaking > 0 ? 'Answering…' : 'Ready when you are'}
            </Typography>
          </Box>
        </Box>
      )}

      {turns.length > 0 && (
        <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {turns.map((turn) => (
            <Turn key={turn.id} turn={turn} reduce={reduce} theme={theme} navigate={navigate}
              onConfirm={confirm} onDelete={handleDelete} onClose={() => setOpen(false)}
              onSpeakStart={onSpeakStart} onSpeakEnd={onSpeakEnd} />
          ))}
          {loading && <ThinkingHint show label={thinkingText || 'Working that out…'} />}
        </Box>
      )}

      {turns.length === 0 && (
        <Box sx={{ textAlign: 'center', px: 3, pt: { xs: 3.5, sm: 4.5 }, pb: 2, position: 'relative',
          '@keyframes assistRise': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          '@keyframes assistAura': { '0%,100%': { opacity: 0.55, transform: 'translate(-50%,-50%) scale(1)' }, '50%': { opacity: 0.9, transform: 'translate(-50%,-50%) scale(1.12)' } } }}>
          <Box aria-hidden sx={{ position: 'absolute', top: 78, left: '50%', width: 260, height: 260,
            transform: 'translate(-50%,-50%)', pointerEvents: 'none', borderRadius: '50%',
            background: `radial-gradient(circle, ${accents.violet}3a, ${accents.blue}1c 45%, transparent 70%)`,
            filter: 'blur(20px)', animation: reduce ? 'none' : 'assistAura 5s ease-in-out infinite' }} />
          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 2.25 }}>
            <AssistantOrb state={orbState} size={82} reduce={reduce} />
          </Box>
          <Typography sx={{ fontFamily: type.displayFamily, fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.025em', position: 'relative' }}>
            {loading ? (thinkingText || 'Thinking…') : 'How can I help?'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2.25, maxWidth: 360, mx: 'auto', position: 'relative' }}>
            Add an expense, split a bill, search, or ask how you're doing — one box, one brain.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85, justifyContent: 'center', position: 'relative' }}>
            {EXAMPLES.map((ex, i) => (
              <Chip key={ex} label={ex} onClick={() => send(ex)}
                sx={{
                  cursor: 'pointer', borderRadius: 999, fontWeight: 500, height: 32,
                  border: '1px solid', borderColor: `${accents.violet}3d`,
                  backgroundColor: `${accents.violet}0f`, color: 'text.primary',
                  opacity: reduce ? 1 : 0,
                  animation: reduce ? 'none' : `assistRise 380ms ${motionTokens.ease} forwards`,
                  animationDelay: reduce ? undefined : `${140 + i * 55}ms`,
                  transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, background-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
                  '&:hover': { borderColor: accents.violet, backgroundColor: `${accents.violet}24`, boxShadow: `0 6px 16px -6px ${accents.violet}88` },
                }} />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ px: 2, pt: 1.25, pb: 2, flexShrink: 0 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 0.75, borderRadius: 999,
          border: '1.5px solid', borderColor: `${accents.violet}40`,
          backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}, box-shadow ${motionTokens.fast}ms ${motionTokens.ease}`,
          '&:focus-within': { borderColor: accents.violet, boxShadow: `0 0 0 3px ${accents.violet}22, 0 8px 26px -8px ${accents.violet}77` },
        }}>
          <AutoAwesomeRoundedIcon sx={{ color: accents.violet, fontSize: 20, flexShrink: 0 }} />
          <InputBase
            autoFocus fullWidth value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setOpen(false); }}
            placeholder="Add, split, search, or ask…"
            sx={{ fontSize: '1.02rem', fontWeight: 500 }}
          />
          <Box role="button" aria-label="Send" onClick={() => send()}
            sx={{
              flexShrink: 0, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() ? `linear-gradient(135deg, ${accents.violet}, ${accents.blue})` : 'action.disabledBackground',
              color: input.trim() ? '#fff' : 'text.disabled',
              boxShadow: input.trim() ? `0 6px 16px -4px ${accents.violet}aa` : 'none',
              transition: `all ${motionTokens.fast}ms ${motionTokens.ease}`,
            }}>
            <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </Box>
    </Dialog>
    </>
  );
}

function Turn({ turn, reduce, theme, navigate, onConfirm, onDelete, onClose, onSpeakStart, onSpeakEnd }) {
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
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{turn.text}</Typography>
      </Box>
    );
  }

  const emitSx = reduce ? {} : {
    animation: `asstEmit ${motionTokens.slow}ms ${motionTokens.emphasis} both`,
    '@keyframes asstEmit': {
      from: { opacity: 0, transform: 'translateY(8px) scale(0.9)', filter: 'brightness(1.5)' },
      to: { opacity: 1, transform: 'none', filter: 'none' },
    },
  };

  return (
    <Box sx={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
      {hasReply && (
        <Typography variant="body2" color="text.secondary" sx={{ position: 'relative', mb: c.type === 'answer' ? 0 : 1 }}>
          <TypedLight text={c.reply} reduce={reduce} onStart={onSpeakStart}
            onDone={() => { setStreamed(true); onSpeakEnd?.(); }} />
        </Typography>
      )}

      {turn.deleted ? (
        <Typography variant="caption" color="text.disabled">Deleted.</Typography>
      ) : turn.committed ? (
        <Box sx={emitSx}><SuccessCard result={turn.committed} onClose={onClose} navigate={navigate} /></Box>
      ) : streamed ? (
        <Box sx={emitSx}>
          <CardBody card={c} turn={turn} onConfirm={onConfirm} onDelete={onDelete} onClose={onClose} navigate={navigate} theme={theme} />
        </Box>
      ) : null}
    </Box>
  );
}

function CardBody({ card, turn, onConfirm, onDelete, onClose, navigate, theme }) {
  const busy = turn.committing || turn.deleting;

  if (card.error) {
    const noKey = /openrouter|ai features are unavailable/i.test(card.error);
    return (
      <Panel tone={accents.amber}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{noKey ? "AI isn't set up yet" : 'Something went wrong'}</Typography>
        <Typography variant="caption" color="text.secondary">{noKey ? 'Add an OpenRouter key to enable the assistant.' : card.error}</Typography>
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
            category={e.category_name || e.category?.name} tags={e.tags?.map(t => t.name || t)} />
          <SavedActions busy={busy} deleting={turn.deleting}
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
            <CheckCircleRoundedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom', color: accents.mint }} />
            {expenses.length} transactions saved
          </Typography>
          <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 180, overflowY: 'auto' }}>
            {expenses.map((e) => (
              <Box key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" noWrap>{e.description}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(parseFloat(e.amount))}</Typography>
              </Box>
            ))}
          </Box>
          <SavedActions busy={busy} deleting={turn.deleting}
            deleteLabel={`Delete all ${expenses.length}`}
            onDelete={() => onDelete(turn.id, expenses.map(e => e.id))}
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
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {splits.map((s, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{s.person_name || s.person?.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: accents.blue }}>{money(parseFloat(s.amount))}</Typography>
              </Box>
            ))}
          </Box>
          <SavedActions busy={busy} deleting={turn.deleting}
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
            <Typography sx={{ fontWeight: 750, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>{money(card.total)}</Typography>
            <Typography variant="caption" color="text.secondary">across {card.count} {card.count === 1 ? 'transaction' : 'transactions'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 200, overflowY: 'auto' }}>
            {(card.results || []).slice(0, 8).map((r) => (
              <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{r.description}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.date}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(r.amount)}</Typography>
              </Box>
            ))}
          </Box>
        </Panel>
      );
    }
    case 'insight': {
      return (
        <Panel tone={accents.purple}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <InsightsRoundedIcon sx={{ fontSize: 18, color: accents.purple }} />{card.headline}
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
            {(card.tags || []).map(t => <Chip key={t} label={t} size="small" icon={<SellRoundedIcon />} sx={{ bgcolor: `${accents.mint}22`, color: accents.mint }} />)}
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
    <Box sx={{ p: 1.75, borderRadius: 3, border: '1px solid', borderColor: `${tone}44`, background: `linear-gradient(120deg, ${tone}12, transparent 80%)` }}>
      {children}
    </Box>
  );
}

function Row({ icon: Icon, tone, title, amount, type, category, tags }) {
  const income = type === 'income';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, backgroundColor: `${tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ color: tone, fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 650 }} noWrap>{title}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
          {category && <Chip label={category} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
          {(tags || []).map(t => <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />)}
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
        <CheckCircleRoundedIcon sx={{ color: accents.mint, fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: accents.mint }}>Saved</Typography>
      </Box>
      <Box role="button" onClick={busy ? undefined : onView}
        sx={{ px: 1.5, py: 0.6, borderRadius: 2, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: accents.blue }}>
        View
      </Box>
      <Box role="button" onClick={busy ? undefined : onDelete}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.4,
          px: 1.5, py: 0.6, borderRadius: 2, cursor: busy ? 'default' : 'pointer',
          fontWeight: 600, fontSize: '0.8rem', color: accents.red, opacity: busy ? 0.5 : 1,
          border: '1px solid', borderColor: `${accents.red}44`,
          '&:hover': { backgroundColor: `${accents.red}14` },
        }}>
        <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
        {deleting ? 'Deleting…' : deleteLabel}
      </Box>
    </Box>
  );
}

function Actions({ busy, confirmLabel, tone, onConfirm, onDiscard }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
      <Box role="button" onClick={busy ? undefined : onConfirm}
        sx={{ flex: 1, textAlign: 'center', py: 0.9, borderRadius: 2, cursor: busy ? 'default' : 'pointer', fontWeight: 650, fontSize: '0.9rem', color: '#fff', backgroundColor: tone, opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Saving…' : confirmLabel}
      </Box>
      <Box role="button" onClick={busy ? undefined : onDiscard}
        sx={{ px: 2, py: 0.9, borderRadius: 2, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}>
        Discard
      </Box>
    </Box>
  );
}

function SuccessCard({ result, onClose, navigate }) {
  const label = result.kind === 'split' ? 'Split created'
    : result.kind === 'batch' ? `Added ${result.count} transactions`
    : result.kind === 'tags' ? 'Tags applied'
    : `Added ${result.expense?.description || 'expense'}`;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 2.5, border: '1px solid', borderColor: `${accents.mint}55`, backgroundColor: `${accents.mint}14` }}>
      <CheckCircleRoundedIcon sx={{ color: accents.mint, fontSize: 20 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{label}</Typography>
      <Typography variant="caption" sx={{ color: accents.blue, cursor: 'pointer', fontWeight: 600 }}
        onClick={() => { onClose(); navigate(result.kind === 'split' ? '/splits' : '/expense-tracker'); }}>
        View
      </Typography>
    </Box>
  );
}
