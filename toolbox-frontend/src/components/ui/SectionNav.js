import React from 'react';
import { Box, Paper, Portal, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion as framerMotion, useReducedMotion } from 'framer-motion';
import usePressSpring from './usePressSpring';
import ScrollFade from './ScrollFade';
import { feedback } from './feedback';
import { motion as motionTokens, radius } from '../../theme/tokens';

/**
 * Critically damped (Apple Design §4): the indicator travels to the new tab and
 * settles without overshooting. Nothing threw it, so nothing should bounce.
 * Matches the spring AppShell's primary nav already uses, so the two nav layers
 * share one motion language.
 */
const INDICATOR_SPRING = { type: 'spring', stiffness: 520, damping: 40 };

/**
 * One tab. The press scale lives on an inner wrapper rather than the button so
 * that framer-motion measures the shared indicator against an untransformed
 * box — a scaled parent would make the indicator land 4% off.
 */
function NavItem({ section, active, mobile, reduce, onSelect, onKeyDown, itemRef }) {
  const press = usePressSpring({ pressScale: mobile ? 0.92 : 0.96 });
  const Icon = section.icon;

  // The moving indicator only exists on the active tab; framer's layoutId
  // carries it across as one object rather than cross-fading two. Reduced
  // motion gets the identical mark, placed instantly (Apple Design §14).
  const indicator = (
    <Box
      component={reduce ? 'div' : framerMotion.div}
      layoutId={reduce ? undefined : 'section-nav-pill'}
      transition={reduce ? undefined : INDICATOR_SPRING}
      sx={{
        position: 'absolute', inset: mobile ? '4px 6px' : '6px 4px',
        borderRadius: `${radius.md}px`, zIndex: 0,
        background: `linear-gradient(180deg, ${section.color}24, ${section.color}0f)`,
        border: '1px solid', borderColor: `${section.color}38`,
      }}
    />
  );

  const bar = !mobile && (
    <Box
      component={reduce ? 'div' : framerMotion.div}
      layoutId={reduce ? undefined : 'section-nav-bar'}
      transition={reduce ? undefined : INDICATOR_SPRING}
      sx={{
        // Sits on the container's own bottom edge rather than 1px below it:
        // the row is an overflow-x scroller, so anything past the edge would be
        // clipped (and could add a phantom scroll).
        position: 'absolute', left: '28%', right: '28%', bottom: 0, height: 2,
        borderRadius: 2, zIndex: 1, background: section.color,
      }}
    />
  );

  return (
    <Box
      component="button"
      type="button"
      role="tab"
      ref={itemRef}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      {...press.bindEvents}
      sx={{
        position: 'relative', flex: mobile ? 1 : '0 0 auto', minWidth: 0,
        display: 'flex', flexDirection: mobile ? 'column' : 'row',
        alignItems: 'center', justifyContent: 'center',
        gap: mobile ? 0.25 : 1,
        px: mobile ? 0.5 : 2, py: mobile ? 1 : 0,
        minHeight: mobile ? 56 : 60,
        border: 'none', background: 'transparent', font: 'inherit', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        color: active ? 'text.primary' : 'text.secondary',
        transition: `color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&:hover': { color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${section.color}`, outlineOffset: -2, borderRadius: `${radius.md}px` },
      }}
    >
      {active && indicator}
      {active && bar}
      <Box
        ref={press.ref}
        sx={{
          position: 'relative', zIndex: 2, display: 'flex', minWidth: 0,
          flexDirection: mobile ? 'column' : 'row', alignItems: 'center',
          gap: mobile ? 0.25 : 1,
        }}
      >
        {mobile ? (
          <Icon sx={{ fontSize: 21, color: active ? section.color : 'inherit', transition: `color ${motionTokens.fast}ms ${motionTokens.ease}` }} />
        ) : (
          <Box
            aria-hidden
            sx={{
              width: 30, height: 30, borderRadius: `${radius.sm}px`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${section.color}1f`,
            }}
          >
            <Icon sx={{ color: section.color, fontSize: 17 }} />
          </Box>
        )}
        <Typography
          noWrap
          sx={{
            fontSize: mobile ? '0.68rem' : '0.86rem',
            fontWeight: active ? 650 : 500,
            letterSpacing: '-0.01em', lineHeight: 1.3,
          }}
        >
          {section.label}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Section switcher that changes shape rather than shrinking.
 *
 * Five scrolling tabs at the top of a phone are both hard to reach and easy to
 * miss. Below the md breakpoint this becomes a fixed bottom bar - inside thumb
 * reach, and padded for the home indicator on notched devices.
 *
 * Both shapes are the same hand-built tablist rather than stock MUI, because
 * two Apple Design rules needed to hold that MUI's Tabs/BottomNavigation don't
 * give: every tab responds on pointer-DOWN (§1, via usePressSpring), and the
 * active mark is one object that physically slides between tabs (§7 spatial
 * consistency, via framer's shared layoutId) instead of a mark that blinks out
 * here and blinks in there. Roving tabindex + arrow keys keep the keyboard
 * behaviour MUI was providing.
 */
export default function SectionNav({ value, onChange, sections }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const reduce = useReducedMotion();
  const itemRefs = React.useRef([]);

  const select = React.useCallback((next) => {
    if (next === value) return;
    // A section change is a real commit, not idle motion — worth one tick of
    // haptic on the devices that have it (Apple Design §13 utility). No-ops on
    // desktop and whenever the user has muted feedback.
    feedback('snap');
    onChange(next);
  }, [onChange, value]);

  const onKeyDown = (e) => {
    const last = sections.length - 1;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = value >= last ? 0 : value + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = value <= 0 ? last : value - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    itemRefs.current[next]?.focus();
  };

  const items = sections.map((section, i) => (
    <NavItem
      key={section.label}
      section={section}
      active={i === value}
      mobile={isMobile}
      reduce={reduce}
      onSelect={() => select(i)}
      onKeyDown={onKeyDown}
      itemRef={(node) => { itemRefs.current[i] = node; }}
    />
  ));

  if (!isMobile) {
    return (
      <ScrollFade
        role="tablist"
        aria-label="Expense sections"
        sx={{
          alignItems: 'stretch', gap: 0.5, px: 2,
          borderBottom: '1px solid', borderColor: 'divider',
        }}
      >
        {items}
      </ScrollFade>
    );
  }

  // Rendered into <body>. An ancestor with backdrop-filter (the glass panels
  // this page is full of) becomes the containing block for position:fixed, which
  // pinned this bar to the bottom of a panel instead of the screen. A portal
  // makes it independent of where it happens to be mounted.
  return (
    <Portal>
      <Paper
        elevation={0}
        role="tablist"
        aria-label="Expense sections"
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar,
          display: 'flex', alignItems: 'stretch',
          borderTop: '1px solid', borderColor: 'divider',
          borderRadius: 0,
          // Keep the bar clear of the iOS home indicator.
          pb: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(20px)',
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(20,20,22,0.85)' : 'rgba(255,255,255,0.88)',
          // Translucency collapses when the user asks for less of it (§14).
          '@media (prefers-reduced-transparency: reduce)': {
            backdropFilter: 'none',
            backgroundColor: (t) => t.palette.background.paper,
          },
        }}
      >
        {items}
      </Paper>
    </Portal>
  );
}
