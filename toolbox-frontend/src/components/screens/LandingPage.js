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

import { useAuth } from '../../contexts/AuthContext';
import { useMoney } from '../../contexts/MoneyContext';
import { getExpenseSummary, getSplitBalances, getCopilotCards, dismissCopilotCard } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import ProjectionChart from '../ui/ProjectionChart';
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
  { to: '/health-tracker', icon: FavoriteIcon, title: 'Health', hint: 'Body metrics' },
];

// ── restrained primitives ───────────────────────────────────────────────────
const cardSx = { border: '1px solid', borderColor: 'divider', borderRadius: '13px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 } };
const Card = ({ children, sx }) => <Box sx={{ ...cardSx, ...sx }}>{children}</Box>;
const Eyebrow = ({ children }) => <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>;
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

function Metric({ label, value, tone, sub }) {
  return (
    <Card sx={{ p: 1.75 }}>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }} noWrap>{label}</Typography>
      <Typography sx={{ ...num, fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', mt: 0.75, color: tone || 'text.primary' }} noWrap>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }} noWrap>{sub}</Typography>}
    </Card>
  );
}

function StatRow({ k, v, tone, first }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.9, borderTop: first ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{k}</Typography>
      <Typography sx={{ ...num, fontSize: 12.5, fontWeight: 600, color: tone || 'text.primary' }}>{v}</Typography>
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

// category donut (green → neutral shades; monochromatic, restrained)
const DONUT_SHADES = ['#35c98a', '#2ba377', '#3f6f5c', '#4a4a52', '#33333a', '#2a2a30'];
function Donut({ cats }) {
  const items = (cats || []).map((c) => ({ name: c.name || c.label, amount: Math.abs(Number(c.amount ?? c.value ?? 0)) }))
    .filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = items.reduce((s, c) => s + c.amount, 0);
  if (!total) {
    return <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>No spending yet this month</Typography>
      <Typography sx={{ fontSize: 12, mt: 0.5 }}>Add an expense and the breakdown appears here.</Typography>
    </Box>;
  }
  const top = items.slice(0, 5);
  const otherAmt = items.slice(5).reduce((s, c) => s + c.amount, 0);
  const segs = otherAmt > 0 ? [...top, { name: 'Other', amount: otherAmt }] : top;
  let acc = 25; // start at 12 o'clock
  const R = 15.9, C = 2 * Math.PI * R;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <svg width="108" height="108" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {segs.map((s, i) => {
          const frac = s.amount / total; const len = frac * 100; const dash = `${(len / 100) * C} ${C}`;
          const off = (acc / 100) * C; acc -= len;
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

  // upcoming bill/income events, derived straight from the projection series
  const upcoming = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const evs = [];
    (p.series || []).forEach((d) => (d.events || []).forEach((e) => {
      if (new Date(d.date) >= start) evs.push({ ...e, date: d.date });
    }));
    return evs.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  }, [p.series]);

  const people = useMemo(() => {
    if (!splits) return [];
    const byName = new Map();
    (splits.balances || []).forEach((b) => byName.set(b.name.toLowerCase(), { name: b.name, net: b.owed }));
    (splits.youOwe || []).forEach((d) => {
      const k = d.name.toLowerCase(); const ex = byName.get(k);
      if (ex) ex.net -= d.owed; else byName.set(k, { name: d.name, net: -d.owed });
    });
    return [...byName.values()].filter((x) => x.net !== 0).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [splits]);
  const owedNet = splits?.net || 0;

  const dismiss = (id) => { setCopilot((prev) => prev.filter((c) => c.id !== id)); dismissCopilotCard(id).catch(() => {}); };

  return (
    <Box sx={{ pb: 4 }}>
      <Reveal>
        <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
        <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 650, letterSpacing: '-0.03em', mt: 0.25, mb: 2.5 }}>
          {greetOf()}, {name}.
        </Typography>
      </Reveal>

      {/* ── HERO: safe-to-spend + projection | forecast ── */}
      <Reveal index={1}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.7fr 1fr' }, gap: 1.5 }}>
          <Card>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Box>
                <Eyebrow>Safe to spend today</Eyebrow>
                <Typography sx={{ ...num, fontSize: { xs: '2.4rem', sm: '2.85rem' }, fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1, mt: 0.9, color: (safe != null && safe < 0) ? RED : 'text.primary' }}>
                  {safe != null ? fmt(safe) : '—'}
                </Typography>
              </Box>
              {balance != null && (
                <Box sx={{ textAlign: 'right' }}>
                  <Eyebrow>Projected balance</Eyebrow>
                  <Typography sx={{ ...num, fontSize: '1.15rem', fontWeight: 600, mt: 0.75, color: balance < 0 ? RED : 'text.primary' }}>{fmt(balance)}</Typography>
                  {expense && <Typography sx={{ ...num, fontSize: 11.5, fontWeight: 600, mt: 0.25, color: netMonth >= 0 ? GREEN : RED }}>{netMonth >= 0 ? '+' : ''}{fmt(netMonth)} this month</Typography>}
                </Box>
              )}
            </Box>
            <Box sx={{ mt: 2 }}>
              <ProjectionChart series={p.series} low={low} nextIncomeDate={p.next_income_date} accent={GREEN} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, fontSize: 10.5 }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Today</Typography>
                {low && <Typography sx={{ fontSize: 10.5, color: AMBER }}>Low {money(low.balance)} · {fmtDate(low.date)}</Typography>}
                {p.next_income_date && p.upcoming_income > 0 && <Typography sx={{ fontSize: 10.5, color: GREEN }}>+{money(p.upcoming_income)} · {fmtDate(p.next_income_date)}</Typography>}
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>+{p.horizon_days || 30}d</Typography>
              </Box>
            </Box>
          </Card>

          <Card sx={{ display: 'flex', flexDirection: 'column' }}>
            <Eyebrow>Forecast</Eyebrow>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
              <Typography sx={{ ...num, fontSize: '2.1rem', fontWeight: 650, letterSpacing: '-0.03em', color: (p.runway_days != null && p.runway_days <= 3) ? AMBER : 'text.primary' }}>
                {p.runway_days != null ? p.runway_days : '—'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.25 }}>days of runway<br />at your usual pace</Typography>
            </Box>
            <Box sx={{ height: '1px', bgcolor: 'divider', my: 1.5 }} />
            <StatRow first k="Next income" v={p.upcoming_income > 0 ? `${fmt(p.upcoming_income)} · ${fmtDate(p.next_income_date)}` : '—'} tone={p.upcoming_income > 0 ? GREEN : undefined} />
            <StatRow k="Bills ahead" v={fmt(p.upcoming_bills || 0)} />
            <StatRow k="Lowest point" v={low ? `${money(low.balance)} · ${fmtDate(low.date)}` : '—'} tone={low && low.balance < 0 ? AMBER : undefined} />
            <StatRow k="Daily budget" v={p.daily_discretionary != null ? fmt(p.daily_discretionary) : '—'} />
          </Card>
        </Box>
      </Reveal>

      {/* ── metrics ── */}
      <Reveal index={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)' }, gap: 1.5, mt: 1.5 }}>
          <Metric label="Spent · this month" value={fmt(expense?.totalExpenses ?? 0)} />
          <Metric label="Income" value={fmt(expense?.totalIncome ?? 0)} tone={expense?.totalIncome ? GREEN : undefined} />
          <Metric label="Net" value={`${netMonth >= 0 ? '+' : ''}${fmt(netMonth)}`} tone={netMonth >= 0 ? GREEN : RED} />
          <Metric label="Transactions" value={expense?.transactionCount ?? 0} />
          <Metric label="Owed to you" value={fmt(Math.abs(owedNet))} tone={owedNet >= 0 ? GREEN : RED} sub={people.length ? `${people.length} ${people.length === 1 ? 'person' : 'people'}` : undefined} />
        </Box>
      </Reveal>

      {/* ── breakdown | attention ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
        <Reveal index={3}>
          <Card>
            <SectionHead title="Where it went" count={expense ? fmt(expense.totalExpenses || 0) : ''} />
            <Donut cats={expense?.categoryBreakdown} />
          </Card>
        </Reveal>
        <Reveal index={4}>
          <Card>
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
          </Card>
        </Reveal>
      </Box>

      {/* ── upcoming | shared ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
        <Reveal index={5}>
          <Card>
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
          </Card>
        </Reveal>

        <Reveal index={6}>
          <Card>
            <SectionHead title="Shared" action="View all" onAction={() => navigate('/splits')} />
            {people.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}>
                <HandshakeRoundedIcon sx={{ fontSize: 26, color: 'text.disabled', mb: 0.5 }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>All square — nobody owes anybody.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ ...num, fontSize: '1.35rem', fontWeight: 650, color: owedNet >= 0 ? GREEN : RED }}>{owedNet >= 0 ? '+' : '−'}{money(Math.abs(owedNet))}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>net {owedNet >= 0 ? 'owed to you' : 'you owe'}</Typography>
                </Box>
                {people.slice(0, 3).map((pr, i) => (
                  <ListRow key={pr.name} icon={pr.net >= 0 ? NorthEastRoundedIcon : SouthWestRoundedIcon} title={pr.net >= 0 ? `${pr.name}` : `${pr.name}`}
                    detail={pr.net >= 0 ? 'owes you' : 'you owe'} right={`${pr.net >= 0 ? '+' : '−'}${money(Math.abs(pr.net))}`}
                    tone={pr.net >= 0 ? GREEN : RED} onClick={() => navigate('/splits')} last={i === Math.min(people.length, 3) - 1} />
                ))}
              </>
            )}
          </Card>
        </Reveal>
      </Box>

      {/* ── jump to ── */}
      <Reveal index={7}>
        <Eyebrow>Jump to</Eyebrow>
      </Reveal>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)' }, gap: 1, mt: 1.25 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.to} index={8 + i}>
            <Box role="button" tabIndex={0} onClick={() => navigate(f.to)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(f.to); } }}
              sx={{ ...cardSx, p: 1.75, cursor: 'pointer', transition: 'border-color .12s ease',
                '&:hover': { borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,20,0.22)' },
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
  );
}
