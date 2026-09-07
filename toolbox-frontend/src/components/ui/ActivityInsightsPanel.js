import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useReducedMotion } from 'framer-motion';
import {
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  WarningAmber as WarningAmberIcon,
  Lightbulb as LightbulbIcon,
  HelpOutline as HelpOutlineIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { accents, chart, color as colorRole, motion, radius, type } from '../../theme/tokens';
import ActivityBarRow from './ActivityBarRow';
import AnimatedNumber from './AnimatedNumber';
import Reveal from './Reveal';
import ThinkingHint from './ThinkingHint';
import { money } from './money';

/** A quiet section label — the page's one way of naming a band of content. */
function Eyebrow({ children, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1 }}>
      <Typography
        component="h3"
        sx={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'text.disabled',
        }}
      >
        {children}
      </Typography>
      {action}
    </Box>
  );
}

/**
 * The four kinds of thing the model can say, each with its own colour rail so
 * a concern never reads like a suggestion. Colours are token roles, and the
 * grey one is deliberately grey: "not enough data" is not a finding.
 */
const REVIEW_SECTIONS = [
  { key: 'observations', label: 'What the numbers show', icon: InsightsIcon, tone: accents.blue },
  { key: 'concerns', label: 'Worth attention', icon: WarningAmberIcon, tone: accents.amber },
  { key: 'suggestions', label: 'What you could do', icon: LightbulbIcon, tone: accents.mint },
  { key: 'data_gaps', label: 'Not enough data to say', icon: HelpOutlineIcon, tone: null },
];

/**
 * Insights, rebuilt around the numbers instead of around a model call.
 *
 * The old tab was a dead end: with no stored review it showed a dashed box
 * saying "No review yet" and offered no way to make one, so most of the time
 * the tab was literally empty. Now the tab always leads with a breakdown the
 * page already has server-side totals for — every row is a real figure, and
 * tapping one drills into exactly those transactions — and the written review
 * sits underneath it as the optional, clearly-labelled AI layer.
 *
 * Data-true: every amount comes from `breakdown` (the server's
 * category_breakdown for the active date scope). Percentages are computed
 * against the sum of those same rows, so they always add up to what's shown.
 * Nothing is drawn for a category with no spend.
 */
export default function ActivityInsightsPanel({
  breakdown = [],
  categories = [],
  scopeLabel,
  insight,
  onGenerate,
  onSelectCategory,
}) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const reduce = useReducedMotion();
  const palette = chart.categorical[mode];

  // Colour a row with the user's own category colour when we can find it, so
  // the swatch here matches the swatch on the Labels tab and in the composer.
  const colorFor = React.useCallback((name, i) => {
    const match = categories.find((c) => c.name === name);
    return match?.color || palette[i % palette.length];
  }, [categories, palette]);
  const idFor = React.useCallback(
    (name) => categories.find((c) => c.name === name)?.id,
    [categories],
  );

  const rows = React.useMemo(() => {
    const cleaned = (breakdown || [])
      .map((c) => ({ name: c.name, amount: Math.abs(Number(c.amount) || 0) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const total = cleaned.reduce((s, c) => s + c.amount, 0);
    return { list: cleaned, total };
  }, [breakdown]);

  const top = rows.list.slice(0, 8);
  const rest = rows.list.slice(8);
  const restTotal = rest.reduce((s, c) => s + c.amount, 0);
  const leader = rows.list[0];
  const leaderShare = leader && rows.total ? (leader.amount / rows.total) * 100 : 0;

  const review = insight?.data;
  // A review can arrive without a period (older rows, or a model reply that
  // skipped the dates). Each half of the meta line is therefore optional.
  const hasPeriod = !!(review?.period_start && review?.period_end);
  const entriesRead = review?.payload?.entries_analysed ?? null;
  const busy = !!insight?.loading;
  const hasNumbers = rows.list.length > 0;

  return (
    <Box>
      {/* ── Header: what am I looking at, and over what window ─────────── */}
      <Box
        sx={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 2, flexWrap: 'wrap', mb: 2.5,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{ fontFamily: type.displayFamily, fontSize: '1.3rem', fontWeight: 650, letterSpacing: '-0.02em' }}
          >
            Insights
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {scopeLabel}
            {hasNumbers ? ` · ${rows.list.length} ${rows.list.length === 1 ? 'category' : 'categories'}` : ''}
          </Typography>
        </Box>
        <Button
          variant={review ? 'outlined' : 'contained'}
          size="small"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => onGenerate(!!review)}
          disabled={busy}
          sx={{ borderRadius: `${radius.pill}px`, px: 2 }}
        >
          {busy ? 'Reading…' : review ? 'Refresh review' : 'Write me a review'}
        </Button>
      </Box>

      {/* ── The numbers. Always first: they need no model call ─────────── */}
      {hasNumbers ? (
        <Reveal>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: `${radius.lg}px`,
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            }}
          >
            <Eyebrow>Where it went</Eyebrow>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography
                sx={{
                  fontFamily: type.displayFamily, fontSize: 'clamp(1.7rem, 6vw, 2.3rem)',
                  fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.05,
                }}
              >
                <AnimatedNumber value={rows.total} />
              </Typography>
              {leader && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {leader.name} takes {Math.round(leaderShare)}%
                </Typography>
              )}
            </Box>

            {/* A screen reader gets the same table the bars encode. */}
            <Box component="ul" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', p: 0, m: 0 }}>
              {rows.list.map((c) => (
                <li key={c.name}>{`${c.name}: ${money(c.amount)}, ${Math.round((c.amount / rows.total) * 100)} percent`}</li>
              ))}
            </Box>

            <Box aria-hidden sx={{ mt: 1.5 }}>
              {top.map((c, i) => (
                <ActivityBarRow
                  key={c.name}
                  index={i}
                  color={colorFor(c.name, i)}
                  label={c.name}
                  amount={c.amount}
                  pct={(c.amount / rows.total) * 100}
                  onSelect={idFor(c.name) ? () => onSelectCategory(idFor(c.name)) : undefined}
                  selectHint="Opens these transactions"
                />
              ))}
              {rest.length > 0 && (
                <ActivityBarRow
                  index={top.length}
                  color={mode === 'dark' ? '#5a5a66' : '#a9adb8'}
                  label={`${rest.length} smaller ${rest.length === 1 ? 'category' : 'categories'}`}
                  amount={restTotal}
                  pct={(restTotal / rows.total) * 100}
                  dense
                />
              )}
            </Box>
          </Box>
        </Reveal>
      ) : (
        <Box
          sx={{
            p: 4, mb: 3, borderRadius: `${radius.lg}px`, textAlign: 'center',
            border: '1px dashed', borderColor: 'divider',
          }}
        >
          <InsightsIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 600 }}>Nothing to read yet</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 320, mx: 'auto', mt: 0.5 }}>
            {scopeLabel} has no categorised spending. Add a few expenses, or widen the
            date scope above, and the breakdown appears here.
          </Typography>
        </Box>
      )}

      {/* ── The written review: clearly the AI layer, never the whole tab ── */}
      <Eyebrow>The written review</Eyebrow>
      <ThinkingHint show={busy} label="Reading your last 30 days…" />

      {!review && !busy && (
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 }, borderRadius: `${radius.lg}px`,
            border: '1px dashed', borderColor: 'divider',
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontWeight: 600 }}>No review written yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
              ToolBox can read the last 30 days and tell you what stands out. The numbers
              above are yours either way.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => onGenerate(false)}
            sx={{ borderRadius: `${radius.pill}px` }}
          >
            Write it
          </Button>
        </Box>
      )}

      {review && (
        <Reveal>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 }, borderRadius: `${radius.lg}px`,
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
              background: mode === 'dark'
                ? `linear-gradient(168deg, ${accents.violet}12 0%, transparent 55%)`
                : `linear-gradient(168deg, ${accents.violet}0d 0%, transparent 55%)`,
            }}
          >
            <Typography
              component="h3"
              sx={{
                fontFamily: type.displayFamily, fontSize: 'clamp(1.15rem, 3.6vw, 1.5rem)',
                fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.2,
              }}
            >
              {review.headline}
            </Typography>
            {review.summary && (
              <Typography sx={{ fontSize: 14.5, lineHeight: 1.55, color: 'text.secondary', mt: 1 }}>
                {review.summary}
              </Typography>
            )}
            {(hasPeriod || entriesRead != null) && (
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.5, display: 'block' }}>
                {hasPeriod && `${review.period_start} to ${review.period_end}`}
                {hasPeriod && entriesRead != null && ' \u00b7 '}
                {entriesRead != null && `${entriesRead} transactions read`}
              </Typography>
            )}

            <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {REVIEW_SECTIONS.map((section, si) => {
                const items = review.payload?.[section.key] || [];
                if (!items.length) return null;
                const tone = section.tone || (mode === 'dark' ? '#5a5a66' : '#a9adb8');
                return (
                  <Reveal key={section.key} index={reduce ? 0 : si + 1}>
                    <Box
                      sx={{
                        pl: 1.75, borderLeft: '2px solid', borderColor: `${tone}66`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, mb: 0.85 }}>
                        <section.icon sx={{ color: tone, fontSize: 15 }} />
                        <Typography
                          sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: tone }}
                        >
                          {section.label}
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2, m: 0, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                        {items.map((item, i) => (
                          <Typography
                            component="li"
                            key={i}
                            sx={{ fontSize: 14, lineHeight: 1.5, color: 'text.secondary' }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Reveal>
                );
              })}
            </Box>

            {hasNumbers && leader && idFor(leader.name) && (
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => onSelectCategory(idFor(leader.name))}
                sx={{
                  mt: 2.5, borderRadius: `${radius.pill}px`, textTransform: 'none',
                  color: 'text.secondary',
                  transition: `color ${motion.fast}ms ${motion.ease}`,
                  '&:hover': { color: 'text.primary', bgcolor: colorRole.sunken[mode] },
                }}
              >
                See the {leader.name} transactions
              </Button>
            )}
          </Box>
        </Reveal>
      )}
    </Box>
  );
}
