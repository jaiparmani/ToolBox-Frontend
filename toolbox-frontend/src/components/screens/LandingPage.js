import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Fab } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';

import { useAuth } from '../../contexts/AuthContext';
import { yourShareOf } from '../rest/expenseTrackerApis';
import ProjectionChart from '../ui/ProjectionChart';
import DashPace from '../ui/DashPace';
import DashSpendTrend from '../ui/DashSpendTrend';
import DashWeekdayPattern from '../ui/DashWeekdayPattern';
import DashSpendCalendar from '../ui/DashSpendCalendar';
import DashUpcomingBills from '../ui/DashUpcomingBills';
import DashWeekCompare from '../ui/DashWeekCompare';
import DashCategoryMovers from '../ui/DashCategoryMovers';
import MoneyPulse from '../ui/MoneyPulse';
import MonthRecapCard, { shouldShowRecap } from '../ui/MonthRecapCard';
import QuickAddExpense from '../ui/QuickAddExpense';
import AnimatedNumber from '../ui/AnimatedNumber';
import CategoryDonut from '../ui/CategoryDonut';
import CursorGlow from '../motion/CursorGlow';
import Reveal from '../ui/Reveal';
import EmptyState from '../ui/EmptyState';
import { dashCardSx, dashCardInteractiveSx } from '../ui/DashSurface';
import {
  HeroSkeleton, FigureCardSkeleton, TrendCardSkeleton, PaceCardSkeleton,
  WeekdayCardSkeleton, WeekCompareCardSkeleton, CalendarCardSkeleton,
  DonutCardSkeleton, ListCardSkeleton, RhythmSkeleton,
  DashLoadingStatus, DashLoadError,
} from '../ui/DashSkeleton';
import { money } from '../ui/money';
import useMonthlyDashboard from '../ui/useMonthlyDashboard';
import usePressSpring from '../ui/usePressSpring';
import { accents, motion as motionTokens, radius, type } from '../../theme/tokens';

const GREEN = accents.mint;
const greetOf = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const num = { fontVariantNumeric: 'tabular-nums', fontFamily: type.displayFamily };

// One vertical rhythm for the whole page instead of a per-row guess.
const ROW = { display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: { xs: 2, md: 2.5 } };
// The six-month history row is the *second* wave. Both its loading placeholder
// and every real or empty outcome are pinned to this height, so when that wave
// lands the page does not move (Apple Design §7).
const WAVE2_H = { xs: 182, sm: 196 };

const Eyebrow = ({ children, sx }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled', ...sx }}>{children}</Typography>
);

/**
 * A named group, so the grid reads as chapters rather than a pile of cards
 * (Apple Design §16: hierarchy is what makes the important thing obvious, and
 * a specific label beats a generic one). The rule fills the leftover width, so
 * the label anchors left and the eye has a line to follow across.
 */
const Rail = ({ label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, mt: { xs: 3, md: 3.5 } }}>
    <Eyebrow sx={{ flexShrink: 0 }}>{label}</Eyebrow>
    <Box aria-hidden sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
  </Box>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroPress = usePressSpring({ pressScale: 0.96 });
  const fabPress = usePressSpring({ pressScale: 0.92 });
  const [originRect, setOriginRect] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState(null);
  const [recapDismissed, setRecapDismissed] = useState(false);

  // Tapping a blank day on the spend calendar opens the same composer,
  // pre-dated there instead of today.
  const openAddForDate = (dateStr) => { setOriginRect(null); setAddDate(dateStr); setAddOpen(true); };

  const {
    report, lastReport, recent, insightText, categories, recurring, history, pulse,
    dayOfMonth, daysInMonth, monthName, spent, count, trend, cats, topCat, delta, avgPerDay, rhythm, settle,
    reload, status,
  } = useMonthlyDashboard();

  const lastMonthName = React.useMemo(() => {
    if (!lastReport) return '';
    return new Date(lastReport.year, lastReport.month - 1, 1).toLocaleDateString('en-IN', { month: 'long' });
  }, [lastReport]);
  const showRecap = !recapDismissed && shouldShowRecap({
    dayOfMonth, lastReport,
    dismissedKey: lastReport ? `${lastReport.year}-${String(lastReport.month).padStart(2, '0')}` : '',
  });

  // open quick-add with the "a" shortcut (when not typing)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target; const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
        e.preventDefault(); setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const name = user?.firstName || user?.first_name || user?.username || 'there';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const catName = (e) => e.category?.name || e.categoryName || e.category_name || (typeof e.category === 'string' ? e.category : '');
  const expAmount = (e) => Math.abs(Number(e.amount ?? e.amountValue ?? 0));

  // Wave state. `firstWave` gates the grid; `secondWave` gates only its own row.
  const firstWave = status.primary === 'loading';
  const secondWave = status.secondary === 'loading';
  const failed = status.failed;

  // Mirror of the second-wave card's own honesty gate, so the row knows whether
  // anything real is coming before it decides what to hold.
  const trendMonths = (history || []).filter((m) => m && m.ok !== false);
  const spendTrendVisible = trendMonths.length >= 4 && trendMonths.filter((m) => m.total > 0).length >= 3;
  const wave2Empty = !secondWave && !spendTrendVisible;

  // Mirrors of the first-wave cards' own gates, so a section rail never labels
  // an empty stretch of page (§16 wayfinding: a heading must have contents).
  const daily = report?.daily_totals || [];
  const activeDays = daily.filter((d) => (Number(d.total) || 0) > 0).length;
  const activeWeekdays = new Set(daily.filter((d) => (Number(d.total) || 0) > 0 && d.date).map((d) => new Date(d.date).getDay())).size;
  const paceVisible = spent > 0 && dayOfMonth >= 8 && dayOfMonth < daysInMonth;
  const weekdayVisible = activeWeekdays >= 3;
  const billsVisible = (recurring || []).some((r) => r.transaction_type === 'expense' && r.is_active !== false && r.next_date);
  const moversVisible = (report?.category_totals?.length ?? 0) > 0 && (lastReport?.category_totals?.length ?? 0) > 0;
  const weekVisible = spent > 0 || (lastReport?.total_amount ?? 0) > 0;
  const patternsRail = firstWave || paceVisible || weekdayVisible || activeDays >= 4 || !!settle;
  const whereRail = firstWave || cats.length > 0 || billsVisible || weekVisible || moversVisible;

  const slot = { flex: '1 1 320px', minWidth: 0 };
  const wave2Slot = { ...slot, minHeight: WAVE2_H };

  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, md: 6 } }}>
      <CursorGlow />
      <Box
        sx={{ position: 'relative', zIndex: 1 }}
        aria-busy={status.loading ? 'true' : 'false'}
      >

        {/* ── HERO ── spending overview + the hero action ── */}
        <Box
          sx={{
            position: 'relative',
            pt: { xs: 0.5, md: 1 }, pb: { xs: 2.5, md: 3.5 },
            borderBottom: '1px solid', borderColor: 'divider', mb: { xs: 2, md: 2.5 },
            // A single static wash behind the biggest figure on the page: depth
            // without a moving background (§12/§14). Painted once, never animated.
            '&::before': {
              content: '""', position: 'absolute', zIndex: -1, pointerEvents: 'none',
              left: { xs: -24, md: -48 }, right: { xs: -24, md: -48 }, top: -32, height: 340,
              background: `radial-gradient(60% 70% at 22% 42%, ${GREEN}14, transparent 70%)`,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
              <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.35rem', sm: '1.5rem' }, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, mt: 0.25 }}>
                {greetOf()}, {name}.
              </Typography>
            </Box>
            {/* ongoing status, said once, for eyes and for screen readers */}
            <DashLoadingStatus loading={status.loading} slow={status.slow} secondary={!firstWave && secondWave} />
          </Box>

          {firstWave ? (
            <Box sx={{ mt: { xs: 2.5, md: 3 } }}><HeroSkeleton /></Box>
          ) : failed ? (
            <Box sx={{ mt: { xs: 2.5, md: 3 } }}><DashLoadError onRetry={reload} /></Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center', mt: { xs: 2.5, md: 3 } }}>
              <Reveal index={0}>
                <Eyebrow>Spent this month</Eyebrow>
                <Typography component="div" sx={{ ...num, fontSize: { xs: '3.4rem', sm: '4.4rem', md: '4.9rem' }, fontWeight: 640, letterSpacing: '-0.05em', lineHeight: 0.9, mt: 1 }}>
                  <AnimatedNumber value={spent} format="money" />
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
                    {count} {count === 1 ? 'expense' : 'expenses'} · {monthName}
                  </Typography>
                  {delta != null && (
                    <Typography sx={{
                      ...num, fontSize: 12, fontWeight: 650, lineHeight: 1,
                      px: 0.9, py: 0.5, borderRadius: `${radius.pill}px`,
                      color: delta <= 0 ? GREEN : accents.amber,
                      bgcolor: `${delta <= 0 ? GREEN : accents.amber}1a`,
                    }}>
                      {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs last month to date
                    </Typography>
                  )}
                </Box>

                {/* data-true micro-stats */}
                {spent > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1.9 }}>
                    <Box>
                      <Typography sx={{ ...num, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{money(avgPerDay)}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em' }}>avg / day</Typography>
                    </Box>
                    {topCat && (
                      <>
                        <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider' }} />
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topCat.name}</Typography>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em' }}>top category · {money(topCat.amount)}</Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                )}

                {/* hero action */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
                  <Box ref={heroPress.ref} role="button" tabIndex={0} onClick={(e) => { setOriginRect(e.currentTarget.getBoundingClientRect()); setAddDate(null); setAddOpen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAddOpen(true); } }}
                    {...heroPress.bindEvents}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, pl: 1.75, pr: 2.25, py: 1.15, borderRadius: `${radius.pill}px`, cursor: 'pointer',
                      bgcolor: GREEN, color: '#04150e', fontWeight: 650, fontSize: 14.5,
                      boxShadow: `0 8px 24px -12px ${GREEN}`,
                      transition: `filter ${motionTokens.instant}ms ${motionTokens.ease}`,
                      '&:hover': { filter: 'brightness(1.05)' },
                      '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 3 } }}>
                    <AddRoundedIcon sx={{ fontSize: 20 }} /> Add expense
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>
                    or press <Box component="span" sx={{ px: 0.6, py: 0.1, borderRadius: '5px', border: '1px solid', borderColor: 'divider', fontWeight: 700 }}>A</Box>
                  </Typography>
                </Box>
              </Reveal>

              <Reveal index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                  <Eyebrow>Spending this month</Eyebrow>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>cumulative · hover or tap to inspect</Typography>
                </Box>
                <ProjectionChart series={trend} accent={GREEN} height={200} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>1 {monthName.slice(0, 3)}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>Today · {money(spent)}</Typography>
                </Box>
              </Reveal>
            </Box>
          )}
        </Box>

        {/* The ambient read on where you stand right now — a plain-language
            status plus the actual numbers behind it, one tap away. */}
        {!firstWave && !failed && (
          <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
            <Reveal index={2}>
              <MoneyPulse pulse={pulse} />
            </Reveal>
          </Box>
        )}

        {/* A brief look back at the month that just ended — first week of a
            new month only, and only while it hasn't been dismissed. */}
        {!firstWave && !failed && showRecap && (
          <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
            <Reveal index={3}>
              <MonthRecapCard lastReport={lastReport} monthName={lastMonthName} onDismiss={() => setRecapDismissed(true)} />
            </Reveal>
          </Box>
        )}

        {!failed && (
          <>
            {/* ── six-month band ── how this month sits against the last five
                (second wave). Held at one height across all three outcomes so
                this row can never shove the page around when it lands. */}
            <Box sx={ROW}>
              {secondWave ? (
                <Box sx={wave2Slot}><TrendCardSkeleton /></Box>
              ) : wave2Empty ? (
                <Box sx={{ ...wave2Slot, ...dashCardSx, display: 'grid', placeItems: 'center' }}>
                  <EmptyState
                    dense icon={BarChartRoundedIcon} tone={GREEN}
                    title="Not enough history yet"
                    description="After a few months of spending, this becomes the run of months you can compare today against."
                    actionLabel="Add an expense"
                    onAction={() => navigate('/expense-tracker')}
                    sx={{ py: 0 }}
                  />
                </Box>
              ) : (
                <Reveal index={0} sx={wave2Slot}>
                  <DashSpendTrend months={history} />
                </Reveal>
              )}
            </Box>

            {/* ── insight ── */}
            {firstWave ? (
              <Box sx={{ mb: { xs: 2, md: 2.5 } }}><ListCardSkeleton rows={1} pad={2} /></Box>
            ) : insightText && (
              <Reveal index={2}>
                <Box sx={{ ...dashCardSx, display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: { xs: 2, md: 2.5 }, p: { xs: 2, sm: 2.5 } }}>
                  <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: `${radius.sm}px`, display: 'grid', placeItems: 'center', bgcolor: `${accents.violet}1f` }}>
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: accents.violet }} />
                  </Box>
                  <Box>
                    <Eyebrow sx={{ mb: 0.25 }}>Insight</Eyebrow>
                    <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.55 }}>{insightText}</Typography>
                  </Box>
                </Box>
              </Reveal>
            )}

            {/* ── this month's rhythm — factual stats ── */}
            {firstWave ? (
              <Box sx={{ mb: { xs: 2, md: 2.5 } }}><RhythmSkeleton /></Box>
            ) : spent > 0 && (
              <Reveal index={3}>
                <Box sx={{ ...dashCardSx, mb: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'stretch', p: { xs: 1.75, sm: 2.25 } }}>
                  {[
                    { label: 'Transactions', value: String(count) },
                    { label: 'Avg / transaction', value: money(rhythm.avgPerTxn) },
                    { label: 'Active days', value: `${rhythm.activeDays} of ${daysInMonth}` },
                    ...(rhythm.busiest ? [{ label: 'Busiest day', value: money(rhythm.busiest.total), sub: new Date(rhythm.busiest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }] : []),
                  ].map((s, i) => (
                    <Box key={s.label} sx={{ flex: 1, minWidth: 0, px: { xs: 1, sm: 1.75 }, borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ ...num, fontSize: { xs: 17, sm: 20 }, fontWeight: 640, letterSpacing: '-0.025em', lineHeight: 1.05 }} noWrap>{s.value}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', letterSpacing: '0.02em', mt: 0.4 }} noWrap>{s.label}{s.sub ? ` · ${s.sub}` : ''}</Typography>
                    </Box>
                  ))}
                </Box>
              </Reveal>
            )}

            {patternsRail && <Rail label="Patterns" />}

            {/* ── pace | weekday ── */}
            <Box sx={{ ...ROW, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
              {firstWave ? (
                <>
                  <Box sx={{ ...slot, flexBasis: 300 }}><PaceCardSkeleton /></Box>
                  <Box sx={{ ...slot, flexBasis: 300 }}><WeekdayCardSkeleton /></Box>
                </>
              ) : (
                <>
                  <Reveal index={4} sx={{ ...slot, flexBasis: 300, '&:empty': { display: 'none' } }}>
                    <DashPace spent={spent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} />
                  </Reveal>
                  <Reveal index={5} sx={{ ...slot, flexBasis: 300, '&:empty': { display: 'none' } }}>
                    <DashWeekdayPattern dailyTotals={report?.daily_totals || []} />
                  </Reveal>
                </>
              )}
            </Box>

            {/* ── daily-spend heatmap | owed to you ── */}
            <Box sx={{ ...ROW, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
              {firstWave ? (
                <>
                  <Box sx={slot}><CalendarCardSkeleton /></Box>
                  <Box sx={{ ...slot, flexBasis: 300 }}><FigureCardSkeleton footer={0} /></Box>
                </>
              ) : (
                <>
                  <Reveal index={6} sx={{ ...slot, '&:empty': { display: 'none' } }}>
                    <DashSpendCalendar dailyTotals={report?.daily_totals || []} onAddExpense={openAddForDate} />
                  </Reveal>
                  {settle && (
                    <Reveal index={7} sx={{ ...slot, flexBasis: 300 }}>
                      <Box
                        role="button" tabIndex={0} onClick={() => navigate('/splits')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/splits'); } }}
                        aria-label={`Owed to you ${money(settle.owed)}${settle.youOwe > 0 ? `, you owe ${money(settle.youOwe)}` : ''}. Open splits.`}
                        sx={{ ...dashCardInteractiveSx, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: { xs: 2, sm: 2.5 },
                          '&:focus-visible': { outline: `2px solid ${GREEN}`, outlineOffset: 2 } }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Eyebrow>Owed to you</Eyebrow>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                            <Typography sx={{ ...num, fontSize: { xs: 26, sm: 30 }, fontWeight: 640, letterSpacing: '-0.035em', color: GREEN, lineHeight: 1 }}>{money(settle.owed)}</Typography>
                            {settle.youOwe > 0 && (
                              <Typography sx={{ ...num, fontSize: 12.5, color: accents.amber }}>· you owe {money(settle.youOwe)}</Typography>
                            )}
                          </Box>
                          {settle.label && (
                            <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }} noWrap>{settle.label}</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary', flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}>
                          Settle up <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
                        </Box>
                      </Box>
                    </Reveal>
                  )}
                </>
              )}
            </Box>

            {whereRail && <Rail label="Where it went" />}

            {/* ── categories | upcoming bills ── */}
            <Box sx={{ ...ROW, mb: 1.5, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
              {firstWave ? (
                <>
                  <Box sx={slot}><DonutCardSkeleton /></Box>
                  <Box sx={{ ...slot, flexBasis: 300 }}><ListCardSkeleton rows={4} /></Box>
                </>
              ) : (
                <>
                  <Reveal index={8} sx={slot}>
                    <Box sx={{ ...dashCardSx, height: '100%', p: { xs: 2, sm: 2.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>Where it went</Typography>
                        <Typography onClick={() => navigate('/reports')} sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>Insights</Typography>
                      </Box>
                      <CategoryDonut cats={cats} />
                    </Box>
                  </Reveal>
                  <Reveal index={9} sx={{ ...slot, flexBasis: 300, '&:empty': { display: 'none' } }}>
                    <DashUpcomingBills rules={recurring} />
                  </Reveal>
                </>
              )}
            </Box>

            {/* ── week compare | category movers ── */}
            <Box sx={{ ...ROW, '&:not(:has(> *:not(:empty)))': { display: 'none' } }}>
              {firstWave ? (
                <>
                  <Box sx={{ ...slot, flexBasis: 380 }}><WeekCompareCardSkeleton /></Box>
                  <Box sx={{ ...slot, flexBasis: 300 }}><ListCardSkeleton rows={4} /></Box>
                </>
              ) : (
                <>
                  <Reveal index={10} sx={{ ...slot, flexBasis: 380, '&:empty': { display: 'none' } }}>
                    <DashWeekCompare dailyTotals={[...(report?.daily_totals || []), ...(lastReport?.daily_totals || [])]} />
                  </Reveal>
                  <Reveal index={11} sx={{ ...slot, flexBasis: 300, '&:empty': { display: 'none' } }}>
                    <DashCategoryMovers current={report?.category_totals || []} previous={lastReport?.category_totals || []} />
                  </Reveal>
                </>
              )}
            </Box>

            <Rail label="Recent activity" />

            {/* ── recent activity ── */}
            {firstWave ? (
              <ListCardSkeleton rows={6} dot />
            ) : (
              <Reveal index={12} sx={{ ...dashCardSx, p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>Recent</Typography>
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
                      mx: -1, px: 1, borderRadius: 2, transition: `background-color ${motionTokens.instant}ms ${motionTokens.ease}`, '&:hover': { bgcolor: 'action.hover' },
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', flexShrink: 0, bgcolor: e.category?.color || accents.blue }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.75, fontWeight: 550 }} noWrap>{e.description || catName(e) || 'Expense'}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
                        {catName(e)}{catName(e) && e.date ? ' · ' : ''}{e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        {e.isSplit ? ` · split of ${money(expAmount(e))}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ ...num, fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em' }}>−{money(yourShareOf(e))}</Typography>
                  </Box>
                ))}
              </Reveal>
            )}
          </>
        )}
      </Box>

      {/* floating add (mobile-friendly, always reachable) */}
      <Fab ref={fabPress.ref} onClick={(e) => { setOriginRect(e.currentTarget.getBoundingClientRect()); setAddDate(null); setAddOpen(true); }} aria-label="Add expense"
        {...fabPress.bindEvents}
        sx={{ position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 }, zIndex: 20, bgcolor: GREEN, color: '#04150e', boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)', '&:hover': { bgcolor: GREEN, filter: 'brightness(1.05)' } }}>
        <AddRoundedIcon />
      </Fab>

      <QuickAddExpense open={addOpen} onClose={() => setAddOpen(false)} categories={categories} onAdded={reload} originRect={originRect} initialDate={addDate} />
    </Box>
  );
}
