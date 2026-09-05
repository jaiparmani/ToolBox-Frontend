import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import { useAuth } from '../../contexts/AuthContext';
import { yourShareOf } from '../rest/expenseTrackerApis';
import StorySection from '../ui/StorySection';
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
import { money } from '../ui/money';
import { accents, type, motion as motionTokens } from '../../theme/tokens';

const GREEN = accents.mint;
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };
const greetOf = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const Eyebrow = ({ children }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled' }}>{children}</Typography>
);
const Frame = ({ children, wide }) => <Box sx={{ maxWidth: wide ? 720 : 460, mx: 'auto', width: '100%' }}>{children}</Box>;
const Tile = ({ children }) => <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>{children}</Box>;

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
  const listRef = useRef(null);
  const addPress = usePressSpring({ pressScale: 0.96 });
  const activityPress = usePressSpring({ pressScale: 0.96 });
  const [addOpen, setAddOpen] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const [active, setActive] = useState(0);

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
  const scrollToIndex = (i) => {
    const el = listRef.current?.children?.[i];
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAdd = (e) => { setOriginRect(e.currentTarget.getBoundingClientRect()); setAddOpen(true); };

  const renderSection = (key) => {
    switch (key) {
      case 'cover':
        return (
          <Frame>
            <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
            <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.35rem', sm: '1.5rem' }, fontWeight: 600, letterSpacing: '-0.03em', mt: 0.25 }}>
              {greetOf()}, {name}.
            </Typography>
            <Box sx={{ mt: 2.5 }}>
              <Eyebrow>Spent this month</Eyebrow>
              <Typography component="div" sx={{ ...num, fontSize: { xs: '2.9rem', sm: '3.6rem' }, fontWeight: 660, letterSpacing: '-0.04em', lineHeight: 0.95, mt: 0.75 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 2 }}>
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
          </Frame>
        );
      case 'trend':
        return (
          <Frame wide>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
              <Eyebrow>This month's shape</Eyebrow>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>cumulative · hover to inspect</Typography>
            </Box>
            <ProjectionChart series={trend} accent={GREEN} height={180} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>1 {monthName.slice(0, 3)}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Today · {money(spent)}</Typography>
            </Box>
          </Frame>
        );
      case 'flow':
        return (
          <Frame wide>
            <Eyebrow>Money in, money out</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
              {monthFlowVisible && <Tile><DashMonthFlow income={monthIncome ?? 0} spent={spent} monthName={monthName} /></Tile>}
              {spendTrendVisible && <Tile><DashSpendTrend months={history} /></Tile>}
            </Box>
          </Frame>
        );
      case 'insight':
        return (
          <Frame>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: `${accents.violet}1f` }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: accents.violet }} />
              </Box>
              <Box>
                <Eyebrow>Insight</Eyebrow>
                <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.5, mt: 0.5 }}>{insightText}</Typography>
              </Box>
            </Box>
          </Frame>
        );
      case 'rhythm':
        return (
          <Frame wide>
            <Eyebrow>This month's rhythm</Eyebrow>
            <Box sx={{ display: 'flex', alignItems: 'stretch', mt: 1.5, flexWrap: 'wrap', gap: { xs: 2, sm: 0 } }}>
              {[
                { label: 'Transactions', value: String(count) },
                { label: 'Avg / transaction', value: money(rhythm.avgPerTxn) },
                { label: 'Active days', value: `${rhythm.activeDays} of ${daysInMonth}` },
                ...(rhythm.busiest ? [{ label: 'Busiest day', value: money(rhythm.busiest.total), sub: new Date(rhythm.busiest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }] : []),
              ].map((s, i) => (
                <Box key={s.label} sx={{ flex: '1 1 120px', minWidth: 0, px: { xs: 0, sm: 1.75 }, borderLeft: { sm: i === 0 ? 'none' : '1px solid' }, borderColor: 'divider' }}>
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
            <Eyebrow>Where you're headed</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
              {paceVisible && <Tile><DashPace spent={spent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} /></Tile>}
              <Tile><DashWeekdayPattern dailyTotals={report?.daily_totals || []} /></Tile>
            </Box>
          </Frame>
        );
      case 'calendar':
        return (
          <Frame wide>
            <Eyebrow>Day by day</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
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
            <Eyebrow>Where it went</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
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
            <Eyebrow>What changed</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
              {weekVisible && <Tile><DashWeekCompare dailyTotals={[...(report?.daily_totals || []), ...(lastReport?.daily_totals || [])]} /></Tile>}
              {moversVisible && <Tile><DashCategoryMovers current={report?.category_totals || []} previous={lastReport?.category_totals || []} /></Tile>}
            </Box>
          </Frame>
        );
      case 'recent':
        return (
          <Frame wide>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Eyebrow>Recent</Eyebrow>
              <Typography onClick={() => navigate('/expense-tracker')} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.4, '&:hover': { color: 'text.primary' } }}>
                View all <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
              </Typography>
            </Box>
            {recent.length === 0 ? (
              <Box sx={{ py: 2.5, textAlign: 'center' }}><Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>No expenses yet — add your first.</Typography></Box>
            ) : recent.slice(0, 8).map((e, i, arr) => (
              <Box key={e.id ?? i} onClick={() => navigate('/expense-tracker')}
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
            <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.3rem', sm: '1.5rem' }, fontWeight: 650, letterSpacing: '-0.03em' }}>
              That's your story so far.
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75 }}>
              Come back any time — it rewrites itself around what actually happened.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5, flexWrap: 'wrap' }}>
              <StoryButton primary onClick={openAdd} pressRef={addPress.ref} pressEvents={addPress.bindEvents} icon={<AddRoundedIcon sx={{ fontSize: 19 }} />}>
                Add expense
              </StoryButton>
              <StoryButton onClick={() => navigate('/expense-tracker')} pressRef={activityPress.ref} pressEvents={activityPress.bindEvents}>
                View full activity
              </StoryButton>
            </Box>
          </Frame>
        );
    }
  };

  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, md: 6 } }}>
      <Box ref={listRef}>
        {sections.map((s, i) => (
          <StorySection key={s.key} index={i} onEnter={handleEnter} divider={i < sections.length - 1}>
            {renderSection(s.key)}
          </StorySection>
        ))}
      </Box>

      {/* progress rail — a quiet "you are here" through the story, not a paging control */}
      {sections.length > 1 && (
        <Box role="tablist" aria-label="Story sections" sx={{
          position: 'fixed', right: { xs: 8, sm: 16 }, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        }}>
          {sections.map((s, i) => (
            <Box
              key={s.key}
              component="button" role="tab" aria-selected={active === i} aria-label={`Go to section ${i + 1} of ${sections.length}`}
              onClick={() => scrollToIndex(i)}
              sx={{
                width: 7, height: 7, borderRadius: '50%', p: 0, border: 'none', cursor: 'pointer',
                bgcolor: active === i ? GREEN : 'action.disabledBackground',
                transform: active === i ? 'scale(1.25)' : 'scale(1)',
                transition: `background-color ${motionTokens.normal}ms ${motionTokens.ease}, transform ${motionTokens.normal}ms ${motionTokens.ease}`,
              }}
            />
          ))}
        </Box>
      )}

      <QuickAddExpense open={addOpen} onClose={() => setAddOpen(false)} categories={categories} onAdded={reload} originRect={originRect} />
    </Box>
  );
}
