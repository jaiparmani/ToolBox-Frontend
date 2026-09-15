import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';

import DashboardIcon from '@mui/icons-material/SpaceDashboardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import AllInboxIcon from '@mui/icons-material/MoveToInboxRounded';
import TimelineIcon from '@mui/icons-material/TimelineRounded';
import AutorenewIcon from '@mui/icons-material/AutorenewRounded';
import AutoGraphIcon from '@mui/icons-material/InsightsRounded';
import CallSplitIcon from '@mui/icons-material/CallSplitRounded';
import BubbleChartIcon from '@mui/icons-material/BubbleChartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import Reveal from '../ui/Reveal';
import ScrollFade from '../ui/ScrollFade';
import usePressSpring from '../ui/usePressSpring';
import useScrollEdge from '../ui/useScrollEdge';
import { accents, radius, motion as motionTokens, type } from '../../theme/tokens';

/**
 * How to use — the app's own manual.
 *
 * Money OS grew a lot of capability that a person cannot find by looking: the
 * assistant is a keystroke, rows swipe, and a split with a linked account
 * quietly appears on the other person's screen. This screen is the place that
 * says so, in the order someone actually needs it: get money in, ask questions,
 * share bills, forecast, then the map of where everything lives.
 *
 * It is a reading surface first, so the craft here is typographic rather than
 * kinetic — real h1/h2/h3 so a screen reader can navigate by heading, a
 * measure that stays readable, size-specific tracking and leading (Apple
 * Design §15), and only Reveal's existing entrance for motion. Advanced paths
 * (phone capture, keyboard) sit one level deeper inside native <details>, which
 * costs no animated height and is keyboard-accessible for free.
 *
 * Every claim on this page was verified against the source. Nothing aspirational.
 */

/* ── Type roles for this surface ────────────────────────────────────────────
   Tracking tightens as size grows and leading loosens as size shrinks — one
   value for all sizes would be wrong somewhere. */
const H1 = {
  fontFamily: type.displayFamily,
  fontSize: 'clamp(1.9rem, 5.2vw, 2.6rem)',
  fontWeight: 660,
  letterSpacing: '-0.035em',
  lineHeight: 1.04,
  m: 0,
};
const H2 = {
  fontFamily: type.displayFamily,
  fontSize: 'clamp(1.15rem, 2.6vw, 1.4rem)',
  fontWeight: 650,
  letterSpacing: '-0.022em',
  lineHeight: 1.16,
  m: 0,
};
const H3 = {
  fontSize: '0.95rem',
  fontWeight: 650,
  letterSpacing: '-0.008em',
  lineHeight: 1.35,
  m: 0,
};
const BODY = {
  fontSize: '0.945rem',
  fontWeight: 400,
  letterSpacing: 0,
  lineHeight: 1.62,
  color: 'text.secondary',
};
const EYEBROW = {
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  color: 'text.disabled',
};

const MEASURE = 62; // ch — the comfortable reading measure for body copy

/** A keycap. Same lockup as the ⌘K pill in the top bar, so it reads as the same thing. */
function Kbd({ children }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-block',
        px: 0.62,
        py: 0.12,
        mx: '1px',
        borderRadius: `${radius.sm - 2}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontFamily: 'inherit',
        fontSize: '0.76em',
        fontWeight: 700,
        letterSpacing: '0.01em',
        color: 'text.primary',
        whiteSpace: 'nowrap',
        verticalAlign: 'baseline',
      }}
    >
      {children}
    </Box>
  );
}

/** Body copy, held to a readable measure. */
function P({ children, sx }) {
  return <Typography sx={{ ...BODY, maxWidth: `${MEASURE}ch`, ...sx }}>{children}</Typography>;
}

/** A section: real <section> + real <h2>, with the scroll-margin the jump bar needs. */
function Section({ id, index, eyebrow, title, children }) {
  return (
    <Reveal index={index}>
      <Box
        component="section"
        id={id}
        aria-labelledby={`${id}-title`}
        sx={{
          scrollMarginTop: 116,
          py: { xs: 3, sm: 4 },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ ...EYEBROW, mb: 0.9 }}>{eyebrow}</Typography>
        <Typography component="h2" id={`${id}-title`} sx={{ ...H2, mb: 1.75 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Reveal>
  );
}

/**
 * One instruction. Deliberately plain — a heading, a line of language, and a
 * hairline. These lists are dense and read top-to-bottom; an icon per row would
 * be decoration competing with the words. The tinted badges are saved for the
 * map below, where they carry real meaning (they are the sidebar's own icons).
 */
function Item({ title, children, headingLevel = 'h3' }) {
  return (
    <Box
      sx={{
        py: 1.35,
        borderTop: '1px solid',
        borderColor: 'divider',
        '&:first-of-type': { borderTop: 'none' },
      }}
    >
      <Typography component={headingLevel} sx={{ ...H3, mb: 0.35 }}>
        {title}
      </Typography>
      <Typography sx={{ ...BODY, fontSize: '0.9rem', maxWidth: `${MEASURE}ch` }}>{children}</Typography>
    </Box>
  );
}

/** A numbered step. Order matters here, so the list is a real <ol>. */
function Step({ n, title, children }) {
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.1 }}>
      <Box
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          mt: '1px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          fontFamily: type.displayFamily,
          fontSize: '0.76rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
        }}
      >
        {n}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h3" sx={{ ...H3, mb: 0.3 }}>
          {title}
        </Typography>
        <Typography sx={{ ...BODY, fontSize: '0.9rem', maxWidth: `${MEASURE}ch` }}>{children}</Typography>
      </Box>
    </Box>
  );
}

/**
 * The one thing on this page most worth knowing. Tinted, not shouted.
 */
function Callout({ tone = accents.amber, title, children }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 1.75, sm: 2 },
        borderRadius: `${radius.lg}px`,
        border: '1px solid',
        borderColor: `${tone}44`,
        bgcolor: `${tone}12`,
        maxWidth: `${MEASURE + 6}ch`,
      }}
    >
      <Typography component="h3" sx={{ ...H3, mb: 0.4, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography sx={{ ...BODY, fontSize: '0.9rem', color: 'text.primary', opacity: 0.86 }}>
        {children}
      </Typography>
    </Box>
  );
}

/**
 * Advanced options, one level deeper. Native <details> so it is keyboard and
 * screen-reader correct without a line of JS, and so nothing animates height.
 */
function More({ summary, children }) {
  return (
    <Box
      component="details"
      sx={{
        mt: 2,
        borderRadius: `${radius.lg}px`,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        maxWidth: `${MEASURE + 6}ch`,
        '& > summary': {
          listStyle: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 0.9,
          px: 1.75,
          py: 1.3,
          fontSize: '0.88rem',
          fontWeight: 620,
          letterSpacing: '-0.005em',
          color: 'text.primary',
          transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
        },
        '& > summary::-webkit-details-marker': { display: 'none' },
        '& > summary:hover': { bgcolor: 'action.hover' },
        '& > summary:focus-visible': { outline: `2px solid ${accents.blue}`, outlineOffset: -2 },
        '& > summary .chev': {
          fontSize: 18,
          color: 'text.disabled',
          transition: `transform ${motionTokens.fast}ms ${motionTokens.ease}`,
        },
        '&[open] > summary .chev': { transform: 'rotate(180deg)' },
        '@media (prefers-reduced-motion: reduce)': {
          '& > summary .chev': { transition: 'none' },
        },
      }}
    >
      <Box component="summary">
        <ExpandMoreRoundedIcon className="chev" />
        {summary}
      </Box>
      <Box sx={{ px: 1.75, pb: 1.75, pt: 0.25, borderTop: '1px solid', borderColor: 'divider' }}>
        {children}
      </Box>
    </Box>
  );
}

/** A row in the "where everything lives" map — nav icon, label, what's there. */
function MapRow({ icon: Icon, tone, label, to, children, onGo }) {
  const press = usePressSpring({ pressScale: 0.985 });
  return (
    <Box
      component="button"
      type="button"
      ref={press.ref}
      {...press.bindEvents}
      onClick={() => onGo(to)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        // A <button> otherwise takes the UA's own text colour, which is dark
        // ink in both themes — the heading disappeared against the dark rail.
        color: 'text.primary',
        cursor: 'pointer',
        px: { xs: 1.25, sm: 1.5 },
        py: 1.35,
        border: 'none',
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: `${radius.md}px`,
        bgcolor: 'transparent',
        transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&:first-of-type': { borderTop: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
        '&:hover .go': { opacity: 1, transform: 'translateX(2px)' },
        '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 2 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          mt: '1px',
          borderRadius: `${radius.sm + 1}px`,
          display: 'grid',
          placeItems: 'center',
          bgcolor: `${tone}1f`,
        }}
      >
        <Icon sx={{ fontSize: 17, color: tone }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography component="h3" sx={{ ...H3, mb: 0.3 }}>
          {label}
        </Typography>
        <Typography sx={{ ...BODY, fontSize: '0.89rem' }}>{children}</Typography>
      </Box>
      <ArrowForwardRoundedIcon
        className="go"
        aria-hidden
        sx={{
          fontSize: 17,
          mt: '7px',
          flexShrink: 0,
          color: 'text.disabled',
          opacity: 0,
          transition: `opacity ${motionTokens.fast}ms ${motionTokens.ease}, transform ${motionTokens.fast}ms ${motionTokens.ease}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
    </Box>
  );
}

/** One shortcut row. */
function Shortcut({ keys, what, where }) {
  return (
    <Box
      component="tr"
      sx={{ '& > td': { py: 1, borderTop: '1px solid', borderColor: 'divider', verticalAlign: 'top' }, '&:first-of-type > td': { borderTop: 'none' } }}
    >
      <Box component="td" sx={{ pr: 2, whiteSpace: 'nowrap' }}>
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            {i > 0 && <Box component="span" sx={{ ...BODY, fontSize: '0.8rem', px: 0.35 }}>or</Box>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </Box>
      <Box component="td" sx={{ pr: 2, fontSize: '0.9rem', fontWeight: 550, letterSpacing: '-0.005em' }}>
        {what}
      </Box>
      <Box component="td" sx={{ ...BODY, fontSize: '0.85rem' }}>
        {where}
      </Box>
    </Box>
  );
}

const JUMPS = [
  { id: 'start', label: 'Start here' },
  { id: 'capture', label: 'Adding expenses' },
  { id: 'assistant', label: 'The assistant' },
  { id: 'ai', label: 'AI features' },
  { id: 'home-screen', label: 'Home screen' },
  { id: 'ease', label: 'Quick flow' },
  { id: 'gestures', label: 'Hidden gestures' },
  { id: 'sharing', label: 'Sharing bills' },
  { id: 'forecast', label: 'Your forecast' },
  { id: 'map', label: 'Where things live' },
  { id: 'account', label: 'Your account' },
  { id: 'keyboard', label: 'Keyboard' },
];

export default function GuidePage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { sentinelRef, scrolled } = useScrollEdge();

  const jump = useCallback(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      // Move focus with the eye, so keyboard and pointer end up in the same place.
      const heading = document.getElementById(`${id}-title`);
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    },
    [reduce],
  );

  return (
    <Container maxWidth="md" sx={{ px: { xs: 0.5, sm: 2 }, pb: 8 }}>
      <Box ref={sentinelRef} sx={{ height: '1px' }} aria-hidden />

      {/* ── Cover ── */}
      <Reveal>
        <Box component="header" sx={{ pt: { xs: 1, sm: 1.5 }, pb: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ ...EYEBROW, mb: 1 }}>Guide</Typography>
          <Typography component="h1" sx={H1}>
            How to use Money OS
          </Typography>
          <P sx={{ mt: 1.75, fontSize: '1.02rem', lineHeight: 1.58 }}>
            Money OS records what you spend, turns your salary and bills into a forecast, and
            keeps track of who owes whom. Most of it is where you would expect. This page is for
            the parts that aren&rsquo;t.
          </P>
        </Box>
      </Reveal>

      {/* ── Jump bar. Sticky under the app topbar, same height and material as
             the story-chapter rail on Today, so the two read as one system. ── */}
      <Box
        sx={{
          position: 'sticky',
          top: 60,
          zIndex: 2,
          mx: { xs: -1.5, sm: -2 },
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderBottom: '1px solid',
          borderColor: scrolled ? 'divider' : 'transparent',
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(10,10,12,0.85)' : 'rgba(251,251,250,0.85)',
          backdropFilter: 'saturate(1.2) blur(12px)',
          WebkitBackdropFilter: 'saturate(1.2) blur(12px)',
          transition: `border-color ${motionTokens.normal}ms ${motionTokens.ease}`,
          '@media (prefers-reduced-transparency: reduce)': {
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            backgroundColor: 'background.default',
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ScrollFade component="nav" aria-label="Sections of this guide" sx={{ gap: 0.75 }}>
          {JUMPS.map((s) => (
            <JumpChip key={s.id} label={s.label} onClick={() => jump(s.id)} />
          ))}
        </ScrollFade>
      </Box>

      <Box>
        {/* ── 1. Start here ── */}
        <Section id="start" index={1} eyebrow="Five minutes" title="Start here">
          <P sx={{ mb: 1 }}>
            Three things, in this order. After them the rest of the app has something to work with.
          </P>
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            <Step n="1" title="Record a few expenses">
              On Home, press <Kbd>A</Kbd> or tap <strong>Add expense</strong>. A quick-add sheet
              opens from wherever you pressed.
            </Step>
            <Step n="2" title="Add your salary and your fixed bills">
              In <strong>Recurring</strong>. This is the step people skip, and it is the one that
              turns a list of expenses into a forecast &mdash; safe-to-spend, upcoming bills and
              the projection all read from it.
            </Step>
            <Step n="3" title="Read the month back">
              <strong>Today</strong> replays your month chapter by chapter. It only shows a
              chapter when there is real data behind it, so a quiet month is a short story.
            </Step>
          </Box>
        </Section>

        {/* ── 2. Adding expenses ── */}
        <Section id="capture" index={2} eyebrow="Getting money in" title="Four ways to add an expense">
          <Item title="The button">
            <strong>Add expense</strong> on Home or Today opens a quick-add sheet.
          </Item>
          <Item title="The keyboard">
            Press <Kbd>A</Kbd> on Home. It only fires when you are not already typing in a field.
          </Item>
          <Item title="Plain words">
            Press <Kbd>⌘K</Kbd> and type what you spent &mdash; <em>&ldquo;20 aamras&rdquo;</em>.
            It is read, saved, and handed back as a card you can delete if it got it wrong.
          </Item>
          <Item title="The full form">
            <strong>Activity</strong> holds the complete ledger: the whole expense form, plus
            search and minimum/maximum amount filters over everything you have recorded.
          </Item>

          <More summary="Adding from your phone">
            <P sx={{ mb: 1.25, fontSize: '0.89rem' }}>
              Settings lives under your name at the bottom of the sidebar.
            </P>
            <Item title="Telegram" headingLevel="h4">
              Connect your Telegram ID in Settings. After that, send <em>any</em> plain message
              to the bot &mdash; <em>&ldquo;coffee 120&rdquo;</em>, <em>&ldquo;petrol 2000&rdquo;</em>
              &mdash; and it is logged instantly. You also get a Telegram ping every time Money OS
              records an expense.
            </Item>
            <Item title="Android: share sheet" headingLevel="h4">
              Add Money OS to your home screen first (Android Chrome &rarr; &ldquo;Add to Home Screen&rdquo;).
              After that, any PhonePe / GPay &ldquo;Share&rdquo; button will include <strong>Money OS</strong>
              in the list. Tap it and the payment text is logged automatically &mdash; zero taps.
            </Item>
            <Item title="iPhone: Shortcuts &amp; SMS" headingLevel="h4">
              Settings generates an API key and offers ready-made shortcuts you can install on
              your iPhone with the key already filled in. One shortcut watches incoming bank SMS
              (HDFC-Bank, ICICIBANKLTD, etc.) and logs the debit automatically; another lets you
              share any text directly to Money OS from the iOS share sheet. The key is shown
              once &mdash; copy it then, or make a new one.
            </Item>
          </More>
        </Section>

        {/* ── 3. The assistant ── */}
        <Section id="assistant" index={3} eyebrow="⌘K" title="Ask Money OS anything">
          <P>
            Press <Kbd>⌘K</Kbd> (or <Kbd>Ctrl K</Kbd>) from any screen. The <strong>Ask</strong>{' '}
            button in the top bar opens the same panel. There is one assistant for the whole app,
            and it does four different jobs depending on what you type.
          </P>
          <Box sx={{ mt: 2 }}>
            <Item title="Record something">
              <em>&ldquo;20 aamras&rdquo;</em> &mdash; saved as an expense.
            </Item>
            <Item title="Ask a question">
              <em>&ldquo;How much on food this month?&rdquo;</em> &mdash; answered from your real
              figures.
            </Item>
            <Item title="Split a bill">
              <em>&ldquo;split 1200 dinner with Raj and Mira&rdquo;</em> &mdash; the split is
              created without leaving the panel.
            </Item>
            <Item title="Go somewhere">
              <em>&ldquo;go to inbox&rdquo;</em>, <em>&ldquo;open insights&rdquo;</em> &mdash; it
              navigates instead of answering.
            </Item>
          </Box>
          <Callout tone={accents.violet} title="Two things nothing on screen tells you">
            Anything the assistant saves comes back as a card with a <strong>Delete</strong>{' '}
            button on it &mdash; that is your undo. And if you close the panel while it is still
            thinking, it shrinks to a small orb in the bottom-left corner; a mint dot on the orb
            means the answer has landed. Click the orb to read it.
          </Callout>
        </Section>

        {/* ── 4. AI features ── */}
        <Section id="ai" index={4} eyebrow="Always working" title="What the AI does">
          <P sx={{ mb: 1 }}>
            Some of these run quietly in the background; others respond to something you tap or type.
            None of them require set-up.
          </P>
          <Item title="Smart fill">
            As you type a description, past expenses surface as suggestions with the right category
            already filled in. Press Tab or tap to accept.
          </Item>
          <Item title="Quick add">
            Type any expense in plain language &mdash; &ldquo;20 chai 100 vada pav&rdquo; &mdash; and
            the AI parses amount, description, and category in one go. Works with voice input too.
          </Item>
          <Item title="Merchant memory">
            The first time you log a Swiggy order, the AI notes the category. Every Swiggy expense
            after that inherits it automatically &mdash; no re-typing.
          </Item>
          <Item title="Location detect">
            Tap the crosshair icon in the expense form. The app reads your GPS and fills the merchant
            name without you typing it.
          </Item>
          <Item title="Financial assistant">
            Press <Kbd>⌘K</Kbd> and ask anything from your own data &mdash;{' '}
            <em>&ldquo;how much did I spend on food last month?&rdquo;</em> or{' '}
            <em>&ldquo;who owes me the most?&rdquo;</em> The AI answers from your real figures.
          </Item>
          <Item title="Monthly narrative">
            At the close of each month, the app writes a 3-sentence story: what happened, what
            pattern emerged, what to watch. It appears in Today.
          </Item>
          <Item title="Month forecast">
            From mid-month, a projected end-of-month total appears, based on your current pace and
            your recurring bills.
          </Item>
          <Item title="Spending personality">
            After 15 or more expenses, a short profile describes your habits in plain language, drawn
            entirely from your actual patterns.
          </Item>
          <Item title="Regret score">
            After logging an expense, optionally rate it: felt good, neutral, or regret. Over time, a
            picture forms of which categories bring you joy and which bring guilt.
          </Item>
          <Item title="Anomaly alerts">
            If a single expense is three times your daily average, a push notification flags it and
            explains why it stood out.
          </Item>
          <Item title="Behaviour nudge">
            Four delivery orders in one week, and the app notes the pattern quietly &mdash; just the
            fact, no lecture.
          </Item>
          <Item title="Category merge suggestions">
            Overlapping categories like &ldquo;Zomato&rdquo;, &ldquo;Food Delivery&rdquo;, and
            &ldquo;Eating Out&rdquo; prompt a suggestion to merge them into one.
          </Item>
          <Item title="Weekly brief">
            Every Monday morning, a 2-sentence push notification compares last week against the week
            before.
          </Item>
          <Item title="Financial age score">
            A five-level rating &mdash; Student, Starter, Builder, Owner, Free &mdash; based on your
            income, savings rate, and spending habits. Two sentences explain exactly where you stand
            and what moves the needle next.
          </Item>
          <Item title="Tap to log from a notification">
            On Android, push notifications show a <strong>Log expense</strong> reply field. Type{' '}
            <em>&ldquo;40 chai&rdquo;</em> directly in the notification banner and it is saved
            without opening the app.
          </Item>
          <Item title="Smart shortcuts bar">
            Your top 5 categories from the last 30 days appear as one-tap chips at the top of the
            home screen. Tap any chip to open the expense composer with that category pre-filled.
          </Item>
          <Item title="Streak counter">
            Tracks how many consecutive days you have logged at least one expense. Milestone labels
            appear at 7, 30, and 100 days — visible in the greeting card at the top of the home
            screen.
          </Item>
          <Item title="Money mood">
            Tap one of five emoji once a day to record how you feel about today&apos;s spending.
            Stored locally on your device; patterns surface over time.
          </Item>
        </Section>

        {/* ── 5. Home screen ── */}
        <Section id="home-screen" index={5} eyebrow="Always in view" title="The home screen, explained">
          <P sx={{ mb: 1 }}>
            The top of the home screen changes through the day. Everything below it is persistent.
          </P>
          <Item title="Personalised greeting card">
            The first card adapts to the time of day: a morning summary, an afternoon pace check,
            an evening prompt to catch anything missed, and a quiet night recap. It knows your
            name, today&rsquo;s total, and your daily average &mdash; all without set-up.
          </Item>
          <Item title="Streak counter">
            Runs inside the greeting card. It counts consecutive days with at least one expense
            logged. The label changes at 7, 30, and 100 days.
          </Item>
          <Item title="Smart shortcuts bar">
            Your five most-used categories from the last 30 days as one-tap chips. Tap any chip
            and the expense composer opens with that category pre-filled.
          </Item>
          <Item title="Money mood">
            One tap, once a day. Five emoji from 😄 to 😔 record how today&rsquo;s spending felt.
            Stored on this device; nothing is sent to a server.
          </Item>
          <Item title="Month forecast tile">
            Your projected end-of-month total, a progress bar, and the three categories driving the
            overage. Turns amber and then red as you close in on the limit.
          </Item>
          <Item title="Monthly narrative">
            A short paragraph at the close of each month: what happened, what pattern stood out,
            what to watch next month. Tap the refresh icon to regenerate.
          </Item>
        </Section>

        {/* ── 6. Ease / quick flow ── */}
        <Section id="ease" index={6} eyebrow="Fewer taps" title="Getting out of your way">
          <P sx={{ mb: 1 }}>
            Features built around the moment you are adding something quickly and just want it done.
          </P>
          <Item title="Expense templates">
            After saving an expense, a <strong>Pin as template</strong> link appears above the Save
            button. Pinned templates become chips at the top of the composer &mdash; tap one to fill
            all four fields at once. Up to four templates; tap &times; on a chip to remove it.
          </Item>
          <Item title="Smart date inference">
            If you log an expense between midnight and 4&nbsp;am, a banner asks whether the expense
            belongs to today or yesterday. One tap corrects the date without re-opening the form.
          </Item>
          <Item title="Confirm-and-continue card">
            After a quick add, a 56&nbsp;px bar slides up from the bottom showing what was just
            saved. Three actions &mdash; dismiss, edit, or delete &mdash; are reachable for four
            seconds before it clears automatically. Keeps the screen uncluttered while still giving
            you an undo.
          </Item>
          <Item title="Swipe to delete with undo">
            Swipe a row left on Activity to delete it. A five-second snackbar at the bottom lets
            you restore it before it is gone.
          </Item>
          <Item title="Home screen shortcuts">
            Long-press the Money OS icon on your phone&rsquo;s home screen. A menu appears with
            two shortcuts: <strong>Quick Add</strong> (opens the composer immediately) and{' '}
            <strong>Ask</strong> (opens the assistant). Works on Android and iOS once the app is
            added to the home screen.
          </Item>
        </Section>

        {/* ── 7. Gestures ── */}
        <Section id="gestures" index={7} eyebrow="Undiscoverable by design" title="Gestures worth knowing">
          <P sx={{ mb: 1.5 }}>
            Nothing on screen advertises these, and they are the fastest way to work.
          </P>
          <Item title="Swipe a transaction left to delete, right to edit">
            On <strong>Activity</strong>. The row tracks your finger and commits once you pass
            about a third of the width; let go earlier and it springs back. Every row also has a
            <Box component="span" sx={{ px: 0.4, fontWeight: 700 }}>⋯</Box>
            menu with the same two actions, and tapping a row opens its full detail.
          </Item>
          <Item title="Swipe a person's card left to settle up">
            On <strong>Shared</strong>. It reads &ldquo;Settle&rdquo; when they owe you and
            &ldquo;Mark paid&rdquo; when you owe them.
          </Item>
          <Item title="Drag the ring on Shared">
            The constellation of people spins like a dial and springs back to rest. Tap a person
            to filter the detail below to just them.
          </Item>
          <Item title="Drag or hover a chart">
            The month chart on Home and Today snaps a guideline to the nearest day and prints
            that day&rsquo;s exact figure. Every chart in the app keeps its real numbers
            reachable this way.
          </Item>
          <P sx={{ mt: 1.75, fontSize: '0.875rem' }}>
            If your system asks for reduced motion, swiping is switched off &mdash; the menus and
            buttons do everything the gestures do.
          </P>
        </Section>

        {/* ── 6. Sharing ── */}
        <Section id="sharing" index={8} eyebrow="Splits and groups" title="Sharing a bill with someone">
          <P>
            Go to <strong>Activity</strong> and open the <strong>Splits</strong> tab. Either
            describe the bill &mdash; <em>&ldquo;split 1200 dinner with raj and priya&rdquo;</em>{' '}
            &mdash; and press <strong>Split</strong>, or press <strong>Enter manually</strong> for
            the exact form. In the form you can search for someone&rsquo;s account or simply type
            a name for a person who has none.
          </P>
          <Callout tone={accents.amber} title="A split with a linked account is not just your note">
            If the person you picked has a Money OS account, the same split appears on their{' '}
            <strong>Shared</strong> screen as money they owe you, and either of you can mark it
            settled. Someone you added as free text is a name only you can see.
          </Callout>
          <Box sx={{ mt: 2 }}>
            <Item title="Two toggles decide the accounting">
              <strong>I shared this too</strong> takes your own share out of the split.{' '}
              <strong>Add to my expenses</strong> decides whether the bill also lands in your own
              ledger. <strong>Who paid?</strong> lets you record a bill somebody else covered.
            </Item>
            <Item title="Groups are for places you keep going back to">
              A flat, a trip. Create one from the strip at the top of <strong>Shared</strong>.
              Only the person who created a group can add people to it; a group somebody else
              shares with you appears in your strip marked <em>shared with you</em>.
            </Item>
            <Item title="Settling is symmetric">
              Swipe a person&rsquo;s card, or open them and settle from there. Either side can be
              the one who records that the money moved.
            </Item>
            <Item title="Shared has its own question box">
              Separate from <Kbd>⌘K</Kbd> and scoped only to who-owes-whom &mdash;{' '}
              <em>&ldquo;Who owes me the most?&rdquo;</em>
            </Item>
          </Box>
        </Section>

        {/* ── 7. Forecast ── */}
        <Section id="forecast" index={9} eyebrow="Recurring and Inbox" title="How the forecast is made">
          <P>
            <strong>Recurring</strong> is the input for everything predictive in the app. Add your
            rent and subscriptions as recurring bills, each with a cadence
            (daily, weekly, monthly, yearly), an interval, and a start date. Removing a rule stops
            it driving the forecast; the transactions it already produced stay where they are.
          </P>
          <P sx={{ mt: 1.25 }}>
            <strong>Inbox</strong> is the other end of the same pipe: cards for things that need
            you, plus every unsettled balance in both directions. Tap a card to go where it
            points, or dismiss it with the &times;.
          </P>
        </Section>

        {/* ── 8. The map ── */}
        <Section id="map" index={10} eyebrow="Wayfinding" title="Where everything lives">
          <P sx={{ mb: 1.5 }}>The sidebar, in order. Each row here goes to that screen.</P>
          <Box sx={{ mx: { xs: -1.25, sm: -1.5 } }}>
            <MapRow icon={DashboardIcon} tone={accents.blue} label="Home" to="/dashboard" onGo={navigate}>
              This month at a glance: what you have spent, how that compares with last month, the
              cumulative curve, and the fastest way to add something.
            </MapRow>
            <MapRow icon={AutoStoriesRoundedIcon} tone={accents.mint} label="Today" to="/story" onGo={navigate}>
              The same month as a scrolling story, one chapter at a time, with a progress rail at
              the top you can tap to jump.
            </MapRow>
            <MapRow icon={AllInboxIcon} tone={accents.cyan} label="Inbox" to="/inbox" onGo={navigate}>
              What needs your attention, and who is unsettled with you.
            </MapRow>
            <MapRow icon={TimelineIcon} tone={accents.blue} label="Activity" to="/expense-tracker" onGo={navigate}>
              The full ledger, plus tabs for categories, tags, insights and splits. This is where
              you search, filter and edit.
            </MapRow>
            <MapRow icon={AutorenewIcon} tone={accents.violet} label="Recurring" to="/recurring" onGo={navigate}>
              The bills and subscriptions behind the forecast.
            </MapRow>
            <MapRow icon={AutoGraphIcon} tone={accents.purple} label="Insights" to="/reports" onGo={navigate}>
              One month at a time: where it went, when it left, and the biggest line items. Step
              back through months with the arrows.
            </MapRow>
            <MapRow icon={BubbleChartIcon} tone={accents.violet} label="Universe" to="/universe" onGo={navigate}>
              Your month as a spatial scene, every body sized by a real amount. Tap a category to
              filter Activity by it.
            </MapRow>
            <MapRow icon={CallSplitIcon} tone={accents.amber} label="Shared" to="/splits" onGo={navigate}>
              Who owes whom, as a picture and as a list, plus your groups.
            </MapRow>
          </Box>
        </Section>

        {/* ── 9. Account ── */}
        <Section id="account" index={11} eyebrow="Sign-in and settings" title="Your account">
          <Item title="A 6-digit MPIN is the normal way in">
            The sign-in screen leads with the PIN pad. <strong>Use Email OTP instead</strong> and
            a password sign-in are behind links on that same screen, and{' '}
            <strong>Forgot MPIN?</strong> emails you a reset code. Set or change your MPIN in
            Settings.
          </Item>
          <Item title="Settings holds the rest">
            Your details and password, the Telegram and Apple Shortcuts connections, and two
            <em> feel</em> switches: haptics, and sound &mdash; sound is off until you turn it on.
          </Item>
          <Item title="The top bar">
            The bell collects notifications; the sun/moon switches light and dark. Both work on
            every screen.
          </Item>
          <Item title="Clear local data">
            In the account menu. It wipes this device&rsquo;s stored session and signs you out.
            Your account and its data on the server are untouched.
          </Item>
        </Section>

        {/* ── 10. Keyboard ── */}
        <Section id="keyboard" index={12} eyebrow="Reference" title="Keyboard shortcuts">
          <Box
            component="table"
            sx={{ width: '100%', maxWidth: `${MEASURE + 8}ch`, borderCollapse: 'collapse', mt: 0.5 }}
          >
            <caption style={{ captionSide: 'bottom', textAlign: 'left' }}>
              <Typography sx={{ ...BODY, fontSize: '0.82rem', mt: 1.25 }}>
                On Windows and Linux, <Kbd>Ctrl</Kbd> stands in for <Kbd>⌘</Kbd>. Letter shortcuts
                are ignored while you are typing in a field.
              </Typography>
            </caption>
            <Box component="thead" sx={{ '& th': { ...EYEBROW, textAlign: 'left', pb: 1 } }}>
              <Box component="tr">
                <Box component="th" scope="col">Key</Box>
                <Box component="th" scope="col">Does</Box>
                <Box component="th" scope="col">Where</Box>
              </Box>
            </Box>
            <Box component="tbody">
              <Shortcut keys={['⌘K', 'Ctrl K']} what="Open the assistant" where="Anywhere" />
              <Shortcut keys={['A']} what="Add an expense" where="Home" />
              <Shortcut keys={['⌘N']} what="New expense" where="Activity" />
              <Shortcut keys={['⌘R']} what="Reload the data" where="Activity" />
              <Shortcut keys={['⌘/']} what="Jump to search" where="Activity" />
            </Box>
          </Box>
        </Section>
      </Box>
    </Container>
  );
}

/** One chip in the jump bar. */
function JumpChip({ label, onClick }) {
  const press = usePressSpring({ pressScale: 0.95 });
  return (
    <Box
      component="button"
      type="button"
      ref={press.ref}
      {...press.bindEvents}
      onClick={onClick}
      sx={{
        flexShrink: 0,
        px: 1.25,
        py: 0.55,
        borderRadius: `${radius.pill}px`,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'transparent',
        color: 'text.secondary',
        font: 'inherit',
        fontSize: '0.8rem',
        fontWeight: 550,
        letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `color ${motionTokens.fast}ms ${motionTokens.ease}, border-color ${motionTokens.fast}ms ${motionTokens.ease}, background-color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&:hover': { color: 'text.primary', borderColor: `${accents.blue}66`, bgcolor: `${accents.blue}0d` },
        '&:focus-visible': { outline: `2px solid ${accents.blue}`, outlineOffset: 2 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {label}
    </Box>
  );
}
