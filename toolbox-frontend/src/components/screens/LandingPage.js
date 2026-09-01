import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import AutorenewIcon from '@mui/icons-material/AutorenewRounded';
import CallSplitIcon from '@mui/icons-material/CallSplitRounded';
import AssessmentIcon from '@mui/icons-material/InsightsRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import BubbleChartIcon from '@mui/icons-material/BubbleChartRounded';

import { useAuth } from '../../contexts/AuthContext';
import { useMoney } from '../../contexts/MoneyContext';
import { getExpenseSummary, getSplitBalances, getCopilotCards, dismissCopilotCard } from '../rest/expenseTrackerApis';
import ProjectionChart from '../ui/ProjectionChart';
import CursorGlow from '../motion/CursorGlow';
import Reveal from '../ui/Reveal';
import { copilotIcon } from '../ui';
import { money } from '../ui/money';
import { accents, type } from '../../theme/tokens';

const GREEN = accents.mint, RED = accents.red, AMBER = accents.amber;
const fmt = (n) => money(n);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const greetOf = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

const FEATURES = [
  { to: '/expense-tracker', icon: BarChartIcon, title: 'Activity', hint: 'Every transaction' },
  { to: '/recurring', icon: AutorenewIcon, title: 'Recurring', hint: 'Income & bills' },
  { to: '/splits', icon: CallSplitIcon, title: 'Shared', hint: 'Who owes whom' },
  { to: '/reports', icon: AssessmentIcon, title: 'Insights', hint: 'Trends' },
  { to: '/universe', icon: BubbleChartIcon, title: 'Universe', hint: 'Explore' },
  { to: '/health-tracker', icon: FavoriteIcon, title: 'Health', hint: 'Body metrics' },
];

const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 } };

const Eyebrow = ({ children, sx }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled', ...sx }}>{children}</Typography>
);
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };

function SectionHead({ title, count, action, onAction }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
      {action ? <Typography onClick={onAction} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>{action}</Typography>
        : count != null ? <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{count}</Typography> : null}
    </Box>
  );
}

function ListRow({ icon: Icon, title, detail, right, tone, onClick, last }) {
  return (
    <Box role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      sx={{ display: 'flex', alignItems: 'center', gap: 1.4, py: 1.15, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default', mx: onClick ? -1 : 0, px: onClick ? 1 : 0, borderRadius: onClick ? 2 : 0,
        transition: 'background-color .12s ease', '&:hover': onClick ? { bgcolor: 'action.hover' } : {},
        '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: -2 } }}>
      {Icon && <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}><Icon sx={{ fontSize: 15, color: 'text.secondary' }} /></Box>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.75, fontWeight: 550, letterSpacing: '-0.01em' }} noWrap>{title}</Typography>
        {detail && <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: '1px' }} noWrap>{detail}</Typography>}
      </Box>
      {right != null && <Typography sx={{ ...num, fontSize: 13, fontWeight: 600, color: tone || 'text.primary', flexShrink: 0 }}>{right}</Typography>}
    </Box>
  );
}

const DONUT_SHADES = ['#35c98a', '#2ba377', '#3f6f5c', '#4a4a52', '#33333a', '#2a2a30'];
function Donut({ cats }) {
  const items = (cats || []).map((c) => ({ name: c.name || c.label, amount: Math.abs(Number(c.amount ?? c.value ?? 0)) }))
    .filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = items.reduce((s, c) => s + c.amount, 0);
  if (!total) {
    return <Box sx={{ py: 3, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>No spending yet this month</Typography>
      <Typography sx={{ fontSize: 12, mt: 0.5, color: 'text.disabled' }}>Add an expense and the breakdown appears here.</Typography>
    </Box>;
  }
  const top = items.slice(0, 5);
  const otherAmt = items.slice(5).reduce((s, c) => s + c.amount, 0);
  const segs = otherAmt > 0 ? [...top, { name: 'Other', amount: otherAmt }] : top;
  let acc = 25; const R = 15.9, C = 2 * Math.PI * R;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <svg width="108" height="108" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {segs.map((s, i) => {
          const len = (s.amount / total) * 100; const dash = `${(len / 100) * C} ${C}`; const off = (acc / 100) * C; acc -= len;
          return <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={DONUT_SHADES[i]} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={off} transform="rotate(-90 21 21)" />;
        })}
        <text x="21" y="20.5" textAnchor="middle" fill="#f5f5f6" fontSize="6" fontWeight="600" fontFamily="sans-serif">{segs.length}</text>
        <text x="21" y="25.5" textAnchor="middle" fill="#77777f" fontSize="2.6" fontFamily="sans-serif">categories</text>
      </svg>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        {segs.map((s, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: DONUT_SHADES[i] }} />
            <Typography sx={{ flex: 1, fontSize: 12, color: 'text.secondary' }} noWrap>{s.name}</Typography>
            <Typography sx={{ ...num, fontSize: 11.5, color: 'text.disabled' }}>{Math.round((s.amount / total) * 100)}%</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projection } = useMoney();
  const [expense, setExpense] = useState(null);
  const [splits, setSplits] = useState(null);
  const [copilot, setCopilot] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 8) + '01';
    Promise.allSettled([getExpenseSummary({ dateFrom: month, dateTo: today }), getSplitBalances(), getCopilotCards()])
      .then(([e, s, c]) => {
        if (e.status === 'fulfilled') setExpense(e.value);
        if (s.status === 'fulfilled') setSplits(s.value);
        if (c.status === 'fulfilled') setCopilot(c.value);
      });
  }, []);

  const name = user?.username || 'there';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const p = projection || {};
  const safe = p.safe_to_spend_today;
  const balance = p.current_balance;
  const low = p.projected_low;
  const netMonth = expense?.netBalance ?? 0;
  const runway = p.runway_days;

  // the hero's one-line status — the "why" behind the number
  const heroStatus = useMemo(() => {
    if (!projection) return 'Reading your money…';
    if (safe != null && safe <= 0) return `You're at your limit today — the bills ahead already claim what's coming in.`;
    if (runway != null && runway <= 3) return `Tight: about ${runway} day${runway === 1 ? '' : 's'} of runway before your next income lands${p.next_income_date ? ` on ${fmtDate(p.next_income_date)}` : ''}.`;
    if (runway != null) return `On track — roughly ${runway} days of runway, and nothing unusual ahead.`;
    return 'Add a recurring income or bill to forecast what today leaves you.';
  }, [projection, safe, runway, p.next_income_date]);

  const upcoming = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const evs = [];
    (p.series || []).forEach((d) => (d.events || []).forEach((e) => { if (new Date(d.date) >= start) evs.push({ ...e, date: d.date }); }));
    return evs.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  }, [p.series]);

  const people = useMemo(() => {
    if (!splits) return [];
    const byName = new Map();
    (splits.balances || []).forEach((b) => byName.set(b.name.toLowerCase(), { name: b.name, net: b.owed }));
    (splits.youOwe || []).forEach((d) => { const k = d.name.toLowerCase(); const ex = byName.get(k); if (ex) ex.net -= d.owed; else byName.set(k, { name: d.name, net: -d.owed }); });
    return [...byName.values()].filter((x) => x.net !== 0).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [splits]);
  const owedNet = splits?.net || 0;

  const dismiss = (id) => { setCopilot((prev) => prev.filter((c) => c.id !== id)); dismissCopilotCard(id).catch(() => {}); };

  const metrics = [
    { label: 'Spent · this month', value: fmt(expense?.totalExpenses ?? 0) },
    { label: 'Income', value: fmt(expense?.totalIncome ?? 0), tone: expense?.totalIncome ? GREEN : undefined },
    { label: 'Net', value: `${netMonth >= 0 ? '+' : ''}${fmt(netMonth)}`, tone: netMonth >= 0 ? GREEN : RED },
    { label: 'Transactions', value: `${expense?.transactionCount ?? 0}` },
    { label: 'Owed to you', value: fmt(Math.abs(owedNet)), tone: owedNet >= 0 ? GREEN : RED },
  ];

  return (
    <Box sx={{ position: 'relative', pb: 4 }}>
      <CursorGlow />
      <Box sx={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── open composition, not a card ── */}
        <Box sx={{ pt: { xs: 0.5, md: 1 }, pb: { xs: 3, md: 4 }, borderBottom: '1px solid', borderColor: 'divider', mb: { xs: 2.5, md: 3 } }}>
          <Reveal index={0}>
            <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
            <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.35rem', sm: '1.5rem' }, fontWeight: 600, letterSpacing: '-0.03em', mt: 0.25 }}>
              {greetOf()}, {name}.
            </Typography>
          </Reveal>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' }, gap: { xs: 2.5, md: 5 }, alignItems: 'center', mt: { xs: 2.5, md: 3 } }}>
            {/* the one number */}
            <Reveal index={1}>
              <Eyebrow>Safe to spend today</Eyebrow>
              <Typography sx={{ ...num, fontSize: { xs: '3.4rem', sm: '4.4rem', md: '4.9rem' }, fontWeight: 640, letterSpacing: '-0.045em', lineHeight: 0.92, mt: 1, color: (safe != null && safe < 0) ? RED : 'text.primary' }}>
                {safe != null ? fmt(safe) : '—'}
              </Typography>
              <Typography sx={{ fontSize: { xs: 13.5, sm: 14.5 }, color: 'text.secondary', mt: 1.5, maxWidth: '38ch', lineHeight: 1.5 }}>
                {heroStatus}
              </Typography>
              {/* inline forecast facts — no boxes */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 }, mt: 2.5 }}>
                <HeroStat label="Runway" value={runway != null ? `${runway} day${runway === 1 ? '' : 's'}` : '—'} tone={runway != null && runway <= 3 ? AMBER : undefined} />
                <HeroStat label="Next income" value={p.upcoming_income > 0 ? `${fmt(p.upcoming_income)} · ${fmtDate(p.next_income_date)}` : '—'} tone={p.upcoming_income > 0 ? GREEN : undefined} />
                <HeroStat label="Balance" value={balance != null ? fmt(balance) : '—'} tone={balance != null && balance < 0 ? RED : undefined} />
              </Box>
            </Reveal>

            {/* interactive chart — the signature */}
            <Reveal index={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                <Eyebrow>30-day projection</Eyebrow>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>hover to inspect any day</Typography>
              </Box>
              <ProjectionChart series={p.series} low={low} nextIncomeDate={p.next_income_date} accent={GREEN} height={200} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Today</Typography>
                {low && <Typography sx={{ fontSize: 10.5, color: AMBER }}>Low {money(low.balance)} · {fmtDate(low.date)}</Typography>}
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>+{p.horizon_days || 30}d</Typography>
              </Box>
            </Reveal>
          </Box>
        </Box>

        {/* ── METRICS BAND — typographic, no cards ── */}
        <Reveal index={3}>
          <Box sx={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
            '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', mb: { xs: 2.5, md: 3 } }}>
            {metrics.map((m, i) => (
              <Box key={m.label} sx={{ flex: { xs: '0 0 auto', md: 1 }, minWidth: { xs: 140, md: 0 }, py: 2, px: { xs: 2, md: 2.75 },
                borderLeft: i ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }} noWrap>{m.label}</Typography>
                <Typography sx={{ ...num, fontSize: '1.4rem', fontWeight: 620, letterSpacing: '-0.025em', mt: 0.75, color: m.tone || 'text.primary' }} noWrap>{m.value}</Typography>
              </Box>
            ))}
          </Box>
        </Reveal>

        {/* ── breakdown | attention ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
          <Reveal index={4} sx={cardSx}>
            <SectionHead title="Where it went" count={expense ? fmt(expense.totalExpenses || 0) : ''} />
            <Donut cats={expense?.categoryBreakdown} />
          </Reveal>
          <Reveal index={5} sx={cardSx}>
            <SectionHead title="Needs attention" count={copilot.length || undefined} />
            {copilot.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>You're all caught up</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>New concerns show up here as they arise.</Typography>
              </Box>
            ) : copilot.slice(0, 4).map((c, i) => (
              <ListRow key={c.id} icon={copilotIcon(c)} title={c.title} detail={c.body}
                right="›" tone="text.disabled" last={i === Math.min(copilot.length, 4) - 1}
                onClick={() => (c.action_route ? navigate(c.action_route) : dismiss(c.id))} />
            ))}
          </Reveal>
        </Box>

        {/* ── upcoming | shared ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
          <Reveal index={6} sx={cardSx}>
            <SectionHead title="Upcoming" count={`next ${p.horizon_days || 30} days`} />
            {upcoming.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}><Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Nothing scheduled ahead.</Typography></Box>
            ) : (
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: '1.5px', bgcolor: 'divider' }} />
                {upcoming.map((e, i) => {
                  const income = (e.signed ?? -e.amount) > 0;
                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1.4, py: 0.85, position: 'relative' }}>
                      <Box sx={{ width: 17, height: 17, flexShrink: 0, borderRadius: '50%', bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', zIndex: 1 }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: income ? GREEN : e.source === 'recurring' ? 'text.disabled' : RED }} />
                      </Box>
                      <Typography sx={{ width: 44, flexShrink: 0, fontSize: 11, color: 'text.disabled', pt: '1px' }}>{fmtDate(e.date)}</Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} noWrap>{e.description || (income ? 'Income' : 'Payment')}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>{e.category || e.source || e.type}</Typography>
                      </Box>
                      <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600, color: income ? GREEN : RED }}>{income ? '+' : '−'}{money(Math.abs(e.signed ?? e.amount))}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Reveal>

          <Reveal index={7} sx={cardSx}>
            <SectionHead title="Shared" action="View all" onAction={() => navigate('/splits')} />
            {people.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}>
                <HandshakeRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', mb: 0.5 }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>All square — nobody owes anybody.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ ...num, fontSize: '1.35rem', fontWeight: 640, color: owedNet >= 0 ? GREEN : RED }}>{owedNet >= 0 ? '+' : '−'}{money(Math.abs(owedNet))}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>net {owedNet >= 0 ? 'owed to you' : 'you owe'}</Typography>
                </Box>
                {people.slice(0, 3).map((pr, i) => (
                  <ListRow key={pr.name} icon={pr.net >= 0 ? NorthEastRoundedIcon : SouthWestRoundedIcon} title={pr.name}
                    detail={pr.net >= 0 ? 'owes you' : 'you owe'} right={`${pr.net >= 0 ? '+' : '−'}${money(Math.abs(pr.net))}`}
                    tone={pr.net >= 0 ? GREEN : RED} onClick={() => navigate('/splits')} last={i === Math.min(people.length, 3) - 1} />
                ))}
              </>
            )}
          </Reveal>
        </Box>

        {/* ── jump to ── */}
        <Reveal index={8}><Eyebrow sx={{ mt: 1 }}>Jump to</Eyebrow></Reveal>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(6,1fr)' }, gap: 1, mt: 1.25 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.to} index={9 + i}>
              <Box role="button" tabIndex={0} onClick={() => navigate(f.to)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(f.to); } }}
                sx={{ ...cardSx, p: 1.75, cursor: 'pointer', transition: 'border-color .12s ease, transform .12s ease',
                  '&:hover': { borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,20,0.22)', transform: 'translateY(-2px)' },
                  '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 2 } }}>
                <Box sx={{ width: 30, height: 30, borderRadius: '8px', mb: 1.25, display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
                  <f.icon sx={{ fontSize: 17, color: 'text.secondary' }} />
                </Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{f.title}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{f.hint}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function HeroStat({ label, value, tone }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.disabled' }}>{label}</Typography>
      <Typography sx={{ ...num, fontSize: 14.5, fontWeight: 600, mt: 0.25, color: tone || 'text.primary' }}>{value}</Typography>
    </Box>
  );
}
