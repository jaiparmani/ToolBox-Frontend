import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { motion, useReducedMotion } from 'framer-motion';

import { useAuth } from '../../contexts/AuthContext';
import { getMonthlyReport, getSplitBalances, getCategories } from '../rest/expenseTrackerApis';
import AuroraBackground from '../motion/AuroraBackground';
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
  <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'text.disabled', textAlign: 'center' }}>{children}</Typography>
);
const Frame = ({ children }) => <Box sx={{ maxWidth: 480, mx: 'auto', width: '100%' }}>{children}</Box>;

/** Big centered pill button — reused for the two closing CTAs. */
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
  const containerRef = useRef(null);
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

  const sections = useMemo(() => {
    const list = [{ key: 'cover' }];
    if (paceVisible) list.push({ key: 'pace' });
    if (cats.length) list.push({ key: 'where' });
    if (weekVisible) list.push({ key: 'week' });
    if (moversVisible) list.push({ key: 'movers' });
    if (settle) list.push({ key: 'settle' });
    list.push({ key: 'close' });
    return list;
  }, [paceVisible, cats.length, weekVisible, moversVisible, settle]);

  const handleEnter = useCallback((i) => setActive(i), []);
  const scrollToIndex = (i) => {
    const el = containerRef.current?.children?.[i];
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const openAdd = (e) => { setOriginRect(e.currentTarget.getBoundingClientRect()); setAddOpen(true); };

  const renderSection = (key) => {
    switch (key) {
      case 'cover':
        return (
          <Frame>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'text.disabled', fontWeight: 500 }}>{dateStr}</Typography>
              <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.5rem', sm: '1.8rem' }, fontWeight: 650, letterSpacing: '-0.03em', mt: 0.5 }}>
                {greetOf()}, {name}.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Eyebrow>Spent this month</Eyebrow>
                <Typography component="div" sx={{ ...num, fontSize: { xs: '3.4rem', sm: '5rem' }, fontWeight: 660, letterSpacing: '-0.045em', lineHeight: 0.95, mt: 1, textAlign: 'center' }}>
                  <AnimatedNumber value={spent} format="money" />
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 1.5, textAlign: 'center' }}>
                  {count} {count === 1 ? 'expense' : 'expenses'} · {monthName}
                  {delta != null && (
                    <Box component="span" sx={{ color: delta <= 0 ? GREEN : accents.amber, fontWeight: 600 }}>
                      {' · '}{delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}% vs last month
                    </Box>
                  )}
                </Typography>
              </Box>
            </Box>
          </Frame>
        );
      case 'pace':
        return (
          <Frame>
            <Eyebrow>Where you're headed</Eyebrow>
            <Box sx={{ mt: 2 }}>
              <DashPace spent={spent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} lastMonthTotal={lastReport?.total_amount ?? 0} monthName={monthName} />
            </Box>
            {topCat && (
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled', textAlign: 'center', mt: 2 }}>
                Averaging <Box component="span" sx={{ ...num, color: 'text.primary', fontWeight: 600 }}>{money(avgPerDay)}</Box> a day · most on <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{topCat.name}</Box>
              </Typography>
            )}
          </Frame>
        );
      case 'where':
        return (
          <Frame>
            <Eyebrow>Where it went</Eyebrow>
            <Box sx={{ mt: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '14px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } }}>
              <CategoryDonut cats={cats} size={132} />
            </Box>
          </Frame>
        );
      case 'week':
        return (
          <Frame>
            <Eyebrow>This week's rhythm</Eyebrow>
            <Box sx={{ mt: 2 }}>
              <DashWeekCompare dailyTotals={[...(report?.daily_totals || []), ...(lastReport?.daily_totals || [])]} />
            </Box>
          </Frame>
        );
      case 'movers':
        return (
          <Frame>
            <Eyebrow>What changed</Eyebrow>
            <Box sx={{ mt: 2 }}>
              <DashCategoryMovers current={report?.category_totals || []} previous={lastReport?.category_totals || []} />
            </Box>
          </Frame>
        );
      case 'settle':
        return (
          <Frame>
            <Box
              role="button" tabIndex={0} onClick={() => navigate('/splits')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/splits'); } }}
              sx={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <Eyebrow>Owed to you</Eyebrow>
              <Typography sx={{ ...num, fontSize: { xs: 40, sm: 52 }, fontWeight: 660, letterSpacing: '-0.03em', color: GREEN, lineHeight: 1, mt: 1.5 }}>
                {money(settle.owed)}
              </Typography>
              {settle.youOwe > 0 && (
                <Typography sx={{ ...num, fontSize: 13.5, color: accents.amber, mt: 1 }}>you owe {money(settle.youOwe)}</Typography>
              )}
              {settle.label && <Typography sx={{ fontSize: 12.5, color: 'text.disabled', mt: 0.75 }}>{settle.label}</Typography>}
              <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 2.5, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                Settle up <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
              </Typography>
            </Box>
          </Frame>
        );
      case 'close':
      default:
        return (
          <Frame>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontFamily: type.displayFamily, fontSize: { xs: '1.5rem', sm: '1.8rem' }, fontWeight: 650, letterSpacing: '-0.03em' }}>
                That's your story so far.
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 1 }}>
                Come back any time — it rewrites itself around what actually happened.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 3.5, flexWrap: 'wrap' }}>
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
    <Box sx={{ position: 'relative', mx: { xs: -1.5, sm: -3 }, mt: { xs: -2, sm: -3 }, mb: { xs: -2, sm: -3 } }}>
      <AuroraBackground />

      <Box
        ref={containerRef}
        role="region"
        aria-label="Monthly spending story"
        tabIndex={0}
        sx={{
          position: 'relative', zIndex: 1,
          height: 'calc(100dvh - 60px)',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollBehavior: reduce ? 'auto' : 'smooth',
          px: { xs: 1.5, sm: 3 },
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 999 },
        }}
      >
        {sections.map((s, i) => (
          <StorySection key={s.key} index={i} onEnter={handleEnter} containerRef={containerRef}>
            {renderSection(s.key)}
          </StorySection>
        ))}
      </Box>

      {/* scroll hint — only on the cover, only while it's the active section */}
      {active === 0 && (
        <motion.div
          initial={false}
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none' }}
        >
          <KeyboardArrowDownRoundedIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
        </motion.div>
      )}

      {/* progress rail */}
      {sections.length > 1 && (
        <Box role="tablist" aria-label="Story sections" sx={{
          position: 'absolute', right: { xs: 8, sm: 16 }, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        }}>
          {sections.map((s, i) => (
            <Box
              key={s.key}
              component="button" role="tab" aria-selected={active === i} aria-label={`Go to section ${i + 1} of ${sections.length}`}
              onClick={() => scrollToIndex(i)}
              sx={{
                width: 8, height: 8, borderRadius: '50%', p: 0, border: 'none', cursor: 'pointer',
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
