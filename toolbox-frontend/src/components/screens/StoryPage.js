import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { useAuth } from '../../contexts/AuthContext';
import { getMonthlyReport, getSplitBalances, getCategories } from '../rest/expenseTrackerApis';
import StorySection from '../ui/StorySection';
import CategoryDonut from '../ui/CategoryDonut';
import DashPace from '../ui/DashPace';
import DashWeekCompare from '../ui/DashWeekCompare';
import DashCategoryMovers from '../ui/DashCategoryMovers';
import AnimatedNumber from '../ui/AnimatedNumber';
import QuickAddExpense from '../ui/QuickAddExpense';
import usePressSpring from '../ui/usePressSpring';
import { computeSettle } from '../ui/settleSummary';
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

  const [report, setReport] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [balances, setBalances] = useState(null);
  const [categories, setCategories] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const [active, setActive] = useState(0);

  const load = useCallback(() => {
    const now = new Date();
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    Promise.allSettled([
      getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
      getMonthlyReport(lm.getFullYear(), lm.getMonth() + 1),
      getSplitBalances(),
      getCategories({ type: 'expense' }),
    ]).then(([r, l, bal, cat]) => {
      if (r.status === 'fulfilled') setReport(r.value);
      if (l.status === 'fulfilled') setLastReport(l.value ?? null);
      if (bal.status === 'fulfilled') setBalances(bal.value ?? null);
      if (cat.status === 'fulfilled') setCategories(Array.isArray(cat.value) ? cat.value : (cat.value?.results || []));
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const name = user?.firstName || user?.first_name || user?.username || 'there';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const spent = report?.total_amount ?? 0;
  const count = report?.total_count ?? 0;
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  const cats = useMemo(
    () => (report?.category_totals || []).map((c) => ({ name: c.category__name, amount: c.total, color: c.category__color })),
    [report],
  );
  const topCat = useMemo(() => (cats.length ? [...cats].sort((a, b) => b.amount - a.amount)[0] : null), [cats]);

  const lastSamePeriod = useMemo(() => {
    if (!lastReport?.daily_totals) return null;
    return lastReport.daily_totals.reduce((s, d) => {
      const dd = new Date(d.date).getDate();
      return dd <= dayOfMonth ? s + (Number(d.total) || 0) : s;
    }, 0);
  }, [lastReport, dayOfMonth]);
  const delta = (lastSamePeriod != null && lastSamePeriod > 0) ? ((spent - lastSamePeriod) / lastSamePeriod) * 100 : null;
  const avgPerDay = spent > 0 ? spent / dayOfMonth : 0;

  const settle = useMemo(() => computeSettle(balances), [balances]);
  const paceVisible = spent > 0 && dayOfMonth >= 8 && dayOfMonth < daysInMonth;
  const weekVisible = spent > 0 || (lastReport?.total_amount ?? 0) > 0;
  const moversVisible = (report?.category_totals?.length ?? 0) > 0 && (lastReport?.category_totals?.length ?? 0) > 0;
  const breakdownVisible = cats.length > 0 || weekVisible;
  const changesVisible = moversVisible || !!settle;

  const sections = useMemo(() => {
    const list = [{ key: 'cover' }];
    if (paceVisible) list.push({ key: 'pace' });
    if (breakdownVisible) list.push({ key: 'breakdown' });
    if (changesVisible) list.push({ key: 'changes' });
    list.push({ key: 'close' });
    return list;
  }, [paceVisible, breakdownVisible, changesVisible]);

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
      case 'pace':
        return (
          <Frame>
            <Eyebrow>Where you're headed</Eyebrow>
            <Box sx={{ mt: 1.5 }}>
              <DashPace spent={spent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} />
            </Box>
          </Frame>
        );
      case 'breakdown':
        return (
          <Frame wide>
            <Eyebrow>The full picture</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
              {cats.length > 0 && (
                <Tile>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.25 }, height: '100%' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.25 }}>Where it went</Typography>
                    <CategoryDonut cats={cats} size={104} />
                  </Box>
                </Tile>
              )}
              {weekVisible && (
                <Tile>
                  <DashWeekCompare dailyTotals={[...(report?.daily_totals || []), ...(lastReport?.daily_totals || [])]} />
                </Tile>
              )}
            </Box>
          </Frame>
        );
      case 'changes':
        return (
          <Frame wide>
            <Eyebrow>What changed</Eyebrow>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
              {moversVisible && (
                <Tile>
                  <DashCategoryMovers current={report?.category_totals || []} previous={lastReport?.category_totals || []} />
                </Tile>
              )}
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

      <QuickAddExpense open={addOpen} onClose={() => setAddOpen(false)} categories={categories} onAdded={load} originRect={originRect} />
    </Box>
  );
}
