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
import { accents, motion as motionTokens } from '../../theme/tokens';
import { askAssistant, commitAssistant } from '../rest/expenseTrackerApis';
import { useMoney } from '../../contexts/MoneyContext';
import ThinkingHint from './ThinkingHint';
import AssistantOrb from './AssistantOrb';
import TypedLight from './TypedLight';
import { feedback } from './feedback';
import { money } from './money';

/**
 * ToolBox Assistant — the single conversational surface for all of the app's
 * AI. ⌘K (or the toolbar button) opens it; type anything and it does the right
 * thing: "20 aamras" adds an expense, "how much on food this month?" searches,
 * "split 1200 dinner with Raj and Mira" previews a split, "did I overspend?"
 * returns an insight. One box, one brain.
 *
 * Writes always come back as a preview to confirm; reads are instant. Motion is
 * gated on prefers-reduced-motion. Plain "go to <screen>" navigates with no AI.
 */
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
  const { refresh: refreshMoney } = useMoney();
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [turns, setTurns] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(0); // # of replies currently streaming in
  const bodyRef = React.useRef(null);
  const convId = React.useRef(null);

  // The orb's mood follows what the assistant is actually doing.
  const orbState = loading ? 'thinking' : speaking > 0 ? 'speaking' : 'idle';
  const onSpeakStart = React.useCallback(() => setSpeaking(s => s + 1), []);
  const onSpeakEnd = React.useCallback(() => setSpeaking(s => Math.max(0, s - 1)), []);

  // Global hotkey + a decoupled open event (toolbar button dispatches it).
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
    // Plain navigation, no AI needed.
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
    } catch (e) {
      feedback('error');
      setTurns(t => [...t, { id: uid + 1, role: 'assistant', card: { type: 'error', error: e.message } }]);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (turnId, payload) => {
    setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: true } : x));
    try {
      const res = await commitAssistant(payload);
      feedback('success');
      setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: false, committed: res } : x));
      refreshMoney();
    } catch (e) {
      setTurns(t => t.map(x => x.id === turnId ? { ...x, committing: false, card: { ...x.card, error: e.message } } : x));
    }
  };

  const discard = (turnId) => setTurns(t => t.map(x => x.id === turnId ? { ...x, discarded: true } : x));

  return (
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
          border: '1px solid', borderColor: 'divider',
          backgroundImage: `radial-gradient(120% 130% at 0% 0%, ${accents.violet}18, transparent 55%)`,
          backdropFilter: 'blur(30px) saturate(1.4)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        },
      }}
    >
      {/* The presence — a persistent orb that reflects what it's doing */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, pt: 2.25, pb: turns.length ? 1.5 : 0.5, flexShrink: 0 }}>
        <AssistantOrb state={orbState} size={44} reduce={reduce} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2 }}>ToolBox Assistant</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {loading ? 'Thinking…' : speaking > 0 ? 'Answering…' : 'Ready when you are'}
          </Typography>
        </Box>
      </Box>

      {/* Conversation */}
      {turns.length > 0 && (
        <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {turns.map((turn) => (
            <Turn key={turn.id} turn={turn} reduce={reduce} theme={theme} navigate={navigate}
              onConfirm={confirm} onDiscard={discard} onClose={() => setOpen(false)}
              onSpeakStart={onSpeakStart} onSpeakEnd={onSpeakEnd} />
          ))}
          {loading && <ThinkingHint show label="Working that out…" />}
        </Box>
      )}

      {/* Empty state */}
      {turns.length === 0 && (
        <Box sx={{ px: 3, pt: 1, pb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.75 }}>
            Add an expense, split a bill, search, or ask how you're doing — all in one place.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {EXAMPLES.map(ex => (
              <Chip key={ex} label={ex} size="small" onClick={() => send(ex)}
                sx={{ cursor: 'pointer', borderColor: 'divider' }} variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderTop: turns.length ? '1px solid' : 'none', borderColor: 'divider', flexShrink: 0 }}>
        <AutoAwesomeRoundedIcon sx={{ color: accents.violet, fontSize: 20 }} />
        <InputBase
          autoFocus
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setOpen(false); }}
          placeholder="Add, split, search, or ask…"
          sx={{ fontSize: '1.02rem', fontWeight: 500 }}
        />
        <Box role="button" aria-label="Send" onClick={() => send()}
          sx={{
            flexShrink: 0, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: input.trim() ? accents.violet : 'action.disabledBackground',
            color: input.trim() ? '#fff' : 'text.disabled',
            transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
          }}>
          <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
      </Box>
    </Dialog>
  );
}

/** One conversation turn — a user bubble, or an assistant response card. */
function Turn({ turn, reduce, theme, navigate, onConfirm, onDiscard, onClose, onSpeakStart, onSpeakEnd }) {
  const c = turn.card || {};
  const hasReply = turn.role === 'assistant' && !!c.reply && !turn.committed;
  // The card is "emitted" only after the words finish arriving, so the reply
  // streams first and the result then blooms out of it. (Hook stays above the
  // user-bubble early return so hook order is stable.)
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

      {turn.committed ? (
        <Box sx={emitSx}><SuccessCard result={turn.committed} onClose={onClose} navigate={navigate} /></Box>
      ) : turn.discarded ? (
        <Typography variant="caption" color="text.disabled">Discarded.</Typography>
      ) : streamed ? (
        <Box sx={emitSx}>
          <CardBody card={c} turn={turn} onConfirm={onConfirm} onDiscard={onDiscard} onClose={onClose} navigate={navigate} theme={theme} />
        </Box>
      ) : null}
    </Box>
  );
}

function CardBody({ card, turn, onConfirm, onDiscard, onClose, navigate, theme }) {
  const busy = turn.committing;

  if (card.error) {
    const noKey = /openrouter|ai features are unavailable/i.test(card.error);
    return (
      <Panel tone={accents.amber}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{noKey ? 'AI isn’t set up yet' : 'Something went wrong'}</Typography>
        <Typography variant="caption" color="text.secondary">{noKey ? 'Add an OpenRouter key to enable the assistant.' : card.error}</Typography>
      </Panel>
    );
  }

  switch (card.type) {
    case 'expense_preview': {
      const d = card.draft;
      return (
        <Panel tone={accents.blue}>
          <Row icon={ReceiptLongRoundedIcon} tone={accents.blue}
            title={d.description} amount={d.amount} type={d.transaction_type} category={d.category_name} tags={d.tags} />
          <Actions busy={busy} confirmLabel="Add expense" tone={accents.blue}
            onConfirm={() => onConfirm(turn.id, { commit: 'expense', draft: d })} onDiscard={() => onDiscard(turn.id)} />
        </Panel>
      );
    }
    case 'batch_preview': {
      const drafts = card.drafts || [];
      return (
        <Panel tone={accents.blue}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{drafts.length} transactions</Typography>
          <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 180, overflowY: 'auto' }}>
            {drafts.map((d, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" noWrap>{d.description}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(d.amount)}</Typography>
              </Box>
            ))}
          </Box>
          <Actions busy={busy} confirmLabel={`Add all ${drafts.length}`} tone={accents.blue}
            onConfirm={() => onConfirm(turn.id, { commit: 'batch', drafts })} onDiscard={() => onDiscard(turn.id)} />
        </Panel>
      );
    }
    case 'split_preview': {
      const s = card.split;
      return (
        <Panel tone={accents.amber}>
          <Row icon={CallSplitRoundedIcon} tone={accents.amber} title={s.description} amount={s.amount} type="expense" category={s.category_name} />
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {s.split_with_me && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">You</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(s.your_share)}</Typography>
              </Box>
            )}
            {(s.owed || []).map((o, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{o.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: accents.blue }}>{money(o.amount)}</Typography>
              </Box>
            ))}
          </Box>
          <Actions busy={busy} confirmLabel="Create split" tone={accents.amber}
            onConfirm={() => onConfirm(turn.id, { commit: 'split', split: s })} onDiscard={() => onDiscard(turn.id)} />
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
            onConfirm={() => onConfirm(turn.id, { commit: 'tags', expense_id: card.expense_id, tags: card.tags })} onDiscard={() => onDiscard(turn.id)} />
        </Panel>
      );
    }
    case 'answer':
    default:
      return null; // the reply text already renders above
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
