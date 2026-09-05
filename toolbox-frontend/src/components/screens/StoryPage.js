import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DonutLargeRoundedIcon from '@mui/icons-material/DonutLargeRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

import { useAuth } from '../../contexts/AuthContext';
import { yourShareOf } from '../rest/expenseTrackerApis';
import StorySection, { storyItem } from '../ui/StorySection';
import CategoryDonut from '../ui/CategoryDonut';
import ProjectionChart from '../ui/ProjectionChart';
import DashPace from '../ui/DashPace';
import DashMonthFlow from '../ui/DashMonthFlow';
import DashSpendTrend from '../ui/DashSpendTrend';
import DashWeekdayPattern from '../ui/DashWeekdayPattern';
import DashSpendCalendar from '../ui/DashSpendCalendar';
import DashUpcomingBills from '../ui/DashUpcomingBills';
import DashWeekCompare from '../ui/DashWeekCompare';
import DashCategoryMovers from '../ui/DashCategoryMovers';
import AnimatedNumber from '../ui/AnimatedNumber';
import QuickAddExpense from '../ui/QuickAddExpense';
import usePressSpring from '../ui/usePressSpring';
import useMonthlyDashboard from '../ui/useMonthlyDashboard';
import { feedback } from '../ui/feedback';
import { money } from '../ui/money';
import { accents, type, motion as motionTokens } from '../../theme/tokens';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const greetOf = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);
const Frame = ({ children, wide }) => <Box sx={{ maxWidth: wide ? 720 : 460, mx: 'auto', width: '100%' }}>{children}</Box>;
/** A stat/card tile that pops in on its own beat within a staggered chapter. */
const Tile = ({ children }) => <Box component={motion.div} variants={storyItem} sx={{ flex: '1 1 260px', minWidth: 0 }}>{children}</Box>;

const CHAPTERS = {
  trend: { icon: ShowChartRoundedIcon, color: accents.mint, label: "This month's shape" },
  flow: { icon: AccountBalanceWalletRoundedIcon, color: accents.blue, label: 'Money in, money out' },
  insight: { icon: AutoAwesomeRoundedIcon, color: accents.violet, label: 'Insight' },
  rhythm: { icon: GraphicEqRoundedIcon, color: accents.amber, label: "This month's rhythm" },
  pace: { icon: SpeedRoundedIcon, color: accents.cyan, label: "Where you're headed" },
  calendar: { icon: CalendarMonthRoundedIcon, color: accents.mint, label: 'Day by day' },
  breakdown: { icon: DonutLargeRoundedIcon, color: accents.purple, label: 'Where it went' },
  changes: { icon: CompareArrowsRoundedIcon, color: accents.amber, label: 'What changed' },
  recent: { icon: HistoryRoundedIcon, color: accents.blue, label: 'Recent' },
};

/** Icon badge + label + "03 / 10" chapter counter — the story's consistent chapter marker. */
function ChapterHeader({ chapterKey, index, total, action }) {
  const c = CHAPTERS[chapterKey];
  const Icon = c.icon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 26, height: 26, borderRadius: '8px', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: `${c.color}1f` }}>
          <Icon sx={{ fontSize: 14, color: c.color }} />
        </Box>
        <Eyebrow>{c.label}</Eyebrow>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        {action}
        <Typography sx={{ ...num, fontSize: 10, color: 'text.disabled' }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Typography>
      </Box>
    </Box>
  );
}

/** Big pill button — reused for the two closing CTAs. */
function StoryButton({ onClick, primary, icon, children, pressRef, pressEvents }) {
  return (
    <Box
      ref={pressRef}
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      {...pressEvents}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.2, borderRadius: 999, cursor: 'pointer',
        fontWeight: 650, fontSize: 14.5,
        bgcolor: primary ? GREEN : 'transparent',
        color: primary ? '#04150e' : 'text.primary',
        border: primary ? 'none' : '1px solid', borderColor: 'divider',
        transition: `filter ${motionTokens.fast}ms ${motionTokens.ease}, border-color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&:hover': { filter: primary ? 'brightness(1.05)' : 'none', borderColor: primary ? undefined : 'text.disabled' },
        '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 3 },
      }}
    >
      {icon}{children}
    </Box>
  );
}

export default function StoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const listRef = useRef(null);
  const addPress = usePressSpring({ pressScale: 0.96 });
  const activityPress = usePressSpring({ pressScale: 0.96 });
  const [addOpen, setAddOpen] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const [active, setActive] = useState(0);
  const [scrubDay, setScrubDay] = useState(null); // { date, balance } while dragging the month chart, else null
  const finaleFiredRef = useRef(false);

  const {
    report, lastReport, recent, insightText, categories, recurring, monthIncome, history,
    dayOfMonth, daysInMonth, monthName, spent, count, trend, cats, topCat, delta, avgPerDay, rhythm, settle,
    reload,
  } = useMonthlyDashboard();

  const name = user?.firstName || user?.first_name || user?.username || 'there';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const catName = (e) => e.category?.name || e.categoryName || e.category_name || (typeof e.category === 'string' ? e.category : '');
  const expAmount = (e) => Math.abs(Number(e.amount ?? e.amountValue ?? 0));

  const paceVisible = spent > 0 && dayOfMonth >= 8 && dayOfMonth < daysInMonth;
  const weekVisible = spent > 0 || (lastReport?.total_amount ?? 0) > 0;
  const moversVisible = (report?.category_totals?.length ?? 0) > 0 && (lastReport?.category_totals?.length ?? 0) > 0;
  const activeDaysCount = (report?.daily_totals || []).filter((d) => (Number(d.total) || 0) > 0).length;
  const billsVisible = (recurring || []).some((r) => r.transaction_type === 'expense' && r.is_active !== false && r.next_date);
  const monthFlowVisible = (monthIncome ?? 0) > 0;
  const spendTrendVisible = history.length >= 4 && history.filter((m) => m.total > 0).length >= 3;

  const flowVisible = monthFlowVisible || spendTrendVisible;
  const rhythmVisible = spent > 0;
  const paceChapterVisible = paceVisible || activeDaysCount > 0;
  const calendarVisible = activeDaysCount >= 4 || !!settle;
  const breakdownVisible = cats.length > 0 || billsVisible;
  const changesVisible = moversVisible || weekVisible;

  const sections = useMemo(() => {
    const list = [{ key: 'cover' }, { key: 'trend' }];
    if (flowVisible) list.push({ key: 'flow' });
    if (insightText) list.push({ key: 'insight' });
    if (rhythmVisible) list.push({ key: 'rhythm' });
    if (paceChapterVisible) list.push({ key: 'pace' });
    if (calendarVisible) list.push({ key: 'calendar' });
    if (breakdownVisible) list.push({ key: 'breakdown' });
    if (changesVisible) list.push({ key: 'changes' });
    list.push({ key: 'recent' });
    list.push({ key: 'close' });
    return list;
  }, [flowVisible, insightText, rhythmVisible, paceChapterVisible, calendarVisible, breakdownVisible, changesVisible]);

  const handleEnter = useCallback((i) => setActive(i), []);

  // The story's one ceremonial moment: reaching the end fires a single haptic
  // pulse, once per visit — a real milestone (finished today's story), not a
  // reward for passive scrolling, so it never re-fires on scrolling back up
  // and down again.
  useEffect(() => {
    if (sections.length > 1 && active === sections.length - 1 && !finaleFiredRef.current) {
      finaleFiredRef.current = true;
      feedback('success');
    }
  }, [active, sections.length]);
  const scrollToIndex = (i) => {
    const el = listRef.current?.children?.[i];
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAdd = (e) => { setOriginRect(e.currentTarget.getBoundingClientRect()); setAddOpen(true); };

  const renderSection = (key, idx) => {
    const total = sections.length;
    switch (key) {
      case 'cover':
        return (
          <Frame>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
              <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.4rem', sm: '1.6rem' }, fontWeight: 600, letterSpacing: '-0.03em', mt: 0.25 }}>
                {greetOf()}, {name}.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Eyebrow>Spent this month</Eyebrow>
                <Typography component="div" sx={{ ...num, fontSize: { xs: '3.1rem', sm: '3.9rem' }, fontWeight: 660, letterSpacing: '-0.04em', lineHeight: 0.95, mt: 0.75 }}>
                  <AnimatedNumber value={spent} format="money" />
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 1 }}>
                  {count} {count === 1 ? 'expense' : 'expenses'} · {monthName}
                  {delta != null && (
                    <Box component="span" sx={{ color: delta <= 0 ? GREEN : accents.amber, fontWeight: 600 }}>
                      {' · '}{delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs last month
                    </Box>
                  )}
                </Typography>
                {(avgPerDay > 0 || topCat) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5, mt: 2 }}>
                    {avgPerDay > 0 && (
                      <Box>
                        <Typography sx={{ ...num, fontSize: 15, fontWeight: 600 }}>{money(avgPerDay)}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>avg / day</Typography>
                      </Box>
                    )}
                    {topCat && (
                      <>
                        <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider' }} />
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{topCat.name}</Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>top category · {money(topCat.amount)}</Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Frame>
        );
      case 'trend': {
        const scrubIdx = scrubDay ? trend.findIndex((d) => d.date === scrubDay.date) : -1;
        const scrubOwnSpend = scrubIdx >= 0 ? (trend[scrubIdx].balance - (scrubIdx > 0 ? trend[scrubIdx - 1].balance : 0)) : null;
        const shownLabel = scrubDay
          ? new Date(scrubDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
          : `Today · ${monthName} ${dayOfMonth}`;
        const shownValue = scrubDay ? scrubDay.balance : spent;
        return (
          <Frame wide>
            <ChapterHeader chapterKey="trend" index={idx} total={total} action={
              <Typography sx={{ fontSize: 11, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>drag to explore</Typography>
            } />
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled', fontWeight: 500 }}>{shownLabel}</Typography>
                <Typography sx={{ ...num, fontSize: { xs: 26, sm: 30 }, fontWeight: 660, letterSpacing: '-0.03em', lineHeight: 1.1,
                  color: scrubDay ? GREEN : 'text.primary', transition: `color ${motionTokens.fast}ms ${motionTokens.ease}` }}>
                  {money(shownValue)}
                </Typography>
              </Box>
              {scrubOwnSpend != null && (
                <Typography sx={{ ...num, fontSize: 12, color: 'text.secondary' }}>
                  {scrubOwnSpend > 0 ? `${money(scrubOwnSpend)} that day` : 'nothing spent that day'}
                </Typography>
              )}
            </Box>
            <ProjectionChart series={trend} accent={GREEN} height={160} onScrub={setScrubDay} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>1 {monthName.slice(0, 3)}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{monthName} {dayOfMonth}</Typography>
            </Box>
          </Frame>
        );
      }
      case 'flow':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="flow" index={idx} total={total} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {monthFlowVisible && <Tile><DashMonthFlow income={monthIncome ?? 0} spent={spent} monthName={monthName} /></Tile>}
              {spendTrendVisible && <Tile><DashSpendTrend months={history} /></Tile>}
            </Box>
          </Frame>
        );
      case 'insight':
        return (
          <Frame>
            <ChapterHeader chapterKey="insight" index={idx} total={total} />
            <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.5 }}>{insightText}</Typography>
          </Frame>
        );
      case 'rhythm':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="rhythm" index={idx} total={total} />
            <Box sx={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
              {[
                { label: 'Transactions', value: String(count) },
                { label: 'Avg / transaction', value: money(rhythm.avgPerTxn) },
                { label: 'Active days', value: `${rhythm.activeDays} of ${daysInMonth}` },
                ...(rhythm.busiest ? [{ label: 'Busiest day', value: money(rhythm.busiest.total), sub: new Date(rhythm.busiest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }] : []),
              ].map((s, i) => (
                <Box key={s.label} component={motion.div} variants={storyItem} sx={{ flex: '1 1 120px', minWidth: 0, px: { xs: 0, sm: 1.75 }, borderLeft: { sm: i === 0 ? 'none' : '1px solid' }, borderColor: 'divider' }}>
                  <Typography sx={{ ...num, fontSize: { xs: 19, sm: 22 }, fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1.05 }} noWrap>{s.value}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em', mt: 0.4 }} noWrap>{s.label}{s.sub ? ` · ${s.sub}` : ''}</Typography>
                </Box>
              ))}
            </Box>
          </Frame>
        );
      case 'pace':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="pace" index={idx} total={total} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {paceVisible && <Tile><DashPace spent={spent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} /></Tile>}
              <Tile><DashWeekdayPattern dailyTotals={report?.daily_totals || []} /></Tile>
            </Box>
          </Frame>
        );
      case 'calendar':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="calendar" index={idx} total={total} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Tile><DashSpendCalendar dailyTotals={report?.daily_totals || []} /></Tile>
              {settle && (
                <Tile>
                  <Box
                    role="button" tabIndex={0} onClick={() => navigate('/splits')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/splits'); } }}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%', cursor: 'pointer',
                      transition: `border-color ${motionTokens.fast}ms ${motionTokens.ease}`, '&:hover': { borderColor: 'text.disabled' } }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.25 }}>Owed to you</Typography>
                    <Typography sx={{ ...num, fontSize: { xs: 26, sm: 30 }, fontWeight: 660, letterSpacing: '-0.03em', color: GREEN, lineHeight: 1 }}>
                      {money(settle.owed)}
                    </Typography>
                    {settle.youOwe > 0 && (
                      <Typography sx={{ ...num, fontSize: 12.5, color: accents.amber, mt: 0.75 }}>you owe {money(settle.youOwe)}</Typography>
                    )}
                    {settle.label && <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>{settle.label}</Typography>}
                    <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 1.5, fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>
                      Settle up <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
                    </Typography>
                  </Box>
                </Tile>
              )}
            </Box>
          </Frame>
        );
      case 'breakdown':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="breakdown" index={idx} total={total} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {cats.length > 0 && (
                <Tile>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.25 }}>By category</Typography>
                    <CategoryDonut cats={cats} size={104} />
                  </Box>
                </Tile>
              )}
              {billsVisible && <Tile><DashUpcomingBills rules={recurring} /></Tile>}
            </Box>
          </Frame>
        );
      case 'changes':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="changes" index={idx} total={total} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {weekVisible && <Tile><DashWeekCompare dailyTotals={[...(report?.daily_totals || []), ...(lastReport?.daily_totals || [])]} /></Tile>}
              {moversVisible && <Tile><DashCategoryMovers current={report?.category_totals || []} previous={lastReport?.category_totals || []} /></Tile>}
            </Box>
          </Frame>
        );
      case 'recent':
        return (
          <Frame wide>
            <ChapterHeader chapterKey="recent" index={idx} total={total} action={
              <Typography onClick={() => navigate('/expense-tracker')} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.4, '&:hover': { color: 'text.primary' } }}>
                View all <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
              </Typography>
            } />
            {recent.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}><Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>No expenses yet — add your first.</Typography></Box>
            ) : recent.slice(0, 8).map((e, i, arr) => (
              <Box key={e.id ?? i} component={motion.div} variants={storyItem} onClick={() => navigate('/expense-tracker')}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.4, py: 0.85, cursor: 'pointer',
                  borderBottom: i === Math.min(arr.length, 8) - 1 ? 'none' : '1px solid', borderColor: 'divider',
                  mx: -1, px: 1, borderRadius: 2, transition: 'background-color .12s ease', '&:hover': { bgcolor: 'action.hover' } }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: e.category?.color || accents.blue }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.75, fontWeight: 550 }} noWrap>{e.description || catName(e) || 'Expense'}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
                    {catName(e)}{catName(e) && e.date ? ' · ' : ''}{e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    {e.isSplit ? ` · split of ${money(expAmount(e))}` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ ...num, fontSize: 13, fontWeight: 600 }}>−{money(yourShareOf(e))}</Typography>
              </Box>
            ))}
          </Frame>
        );
      case 'close':
      default:
        return (
          <Frame>
            <Box sx={{ textAlign: 'center' }}>
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={reduce ? { duration: motionTokens.fast / 1000 } : { type: 'spring', stiffness: 320, damping: 22, mass: 0.9 }}
              >
                <Eyebrow>Final tally</Eyebrow>
                <Typography component="div" sx={{ ...num, fontSize: { xs: '2.6rem', sm: '3.2rem' }, fontWeight: 660, letterSpacing: '-0.04em', mt: 0.75, color: GREEN }}>
                  {money(spent)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                  across {count} {count === 1 ? 'expense' : 'expenses'} this {monthName}
                </Typography>
              </motion.div>
              <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.3rem', sm: '1.5rem' }, fontWeight: 650, letterSpacing: '-0.03em', mt: 3 }}>
                That's your story so far.
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75 }}>
                Come back any time — it rewrites itself around what actually happened.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 2.5, flexWrap: 'wrap' }}>
                <StoryButton primary onClick={openAdd} pressRef={addPress.ref} pressEvents={addPress.bindEvents} icon={<AddRoundedIcon sx={{ fontSize: 19 }} />}>
                  Add expense
                </StoryButton>
                <StoryButton onClick={() => navigate('/expense-tracker')} pressRef={activityPress.ref} pressEvents={activityPress.bindEvents}>
                  View full activity
                </StoryButton>
              </Box>
            </Box>
          </Frame>
        );
    }
  };

  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, md: 6 } }}>
      {/* Stories-style segmented progress — a chapter-by-chapter "you are here" that
          doubles as a tap-to-jump nav, sitting sticky just under the topbar. */}
      {sections.length > 1 && (
        <Box role="tablist" aria-label="Story chapters" sx={{
          position: 'sticky', top: 60, zIndex: 2, display: 'flex', gap: 0.5,
          mx: { xs: -1.5, sm: -3 }, px: { xs: 1.5, sm: 3 }, py: 1.25,
          backgroundColor: (t) => t.palette.mode === 'dark' ? 'rgba(10,10,12,0.85)' : 'rgba(251,251,250,0.85)',
          backdropFilter: 'saturate(1.2) blur(10px)', WebkitBackdropFilter: 'saturate(1.2) blur(10px)',
        }}>
          {sections.map((s, i) => (
            <Box
              key={s.key}
              component="button" role="tab" aria-selected={active === i} aria-label={`Go to chapter ${i + 1} of ${sections.length}`}
              onClick={() => scrollToIndex(i)}
              sx={{
                flex: 1, height: 3, borderRadius: 999, p: 0, border: 'none', cursor: 'pointer',
                bgcolor: i <= active ? GREEN : 'action.disabledBackground',
                transition: `background-color ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            />
          ))}
        </Box>
      )}

      <Box ref={listRef}>
        {sections.map((s, i) => (
          <StorySection key={s.key} index={i} onEnter={handleEnter} divider={i < sections.length - 1}>
            {renderSection(s.key, i)}
          </StorySection>
        ))}
      </Box>

      <QuickAddExpense open={addOpen} onClose={() => setAddOpen(false)} categories={categories} onAdded={reload} originRect={originRect} />
    </Box>
  );
}
