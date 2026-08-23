import React from 'react';
import { BottomNavigation, BottomNavigationAction, Box, Paper, Portal, Tab, Tabs, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Section switcher that changes shape rather than shrinking.
 *
 * Five scrolling tabs at the top of a phone are both hard to reach and easy to
 * miss. Below the md breakpoint this becomes a fixed bottom bar - inside thumb
 * reach, and padded for the home indicator on notched devices.
 */
export default function SectionNav({ value, onChange, sections }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return (
      <Tabs
        value={value}
        onChange={(e, next) => onChange(next)}
        sx={{
          borderBottom: 1, borderColor: 'divider', px: 2,
          '& .MuiTab-root': { minHeight: 60, py: 1 },
        }}
      >
        {sections.map((section) => (
          <Tab
            key={section.label}
            iconPosition="start"
            icon={
              <Box
                sx={{
                  width: 30, height: 30, borderRadius: '9px',
                  backgroundColor: `${section.color}1f`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <section.icon sx={{ color: section.color, fontSize: 17 }} />
              </Box>
            }
            label={section.label}
          />
        ))}
      </Tabs>
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
      sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar,
        borderTop: '1px solid', borderColor: 'divider',
        borderRadius: 0,
        // Keep the bar clear of the iOS home indicator.
        pb: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(20px)',
        backgroundColor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(20,20,22,0.85)' : 'rgba(255,255,255,0.88)',
      }}
    >
      <BottomNavigation
        value={value}
        onChange={(e, next) => onChange(next)}
        showLabels
        sx={{
          backgroundColor: 'transparent',
          // Taller than the default so the label isn't cropped, and each target
          // clears the 44px minimum for a thumb.
          height: 60,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0, px: 0.5, py: 1, gap: 0.25,
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.68rem',
            // Keep labels visible when unselected too, otherwise four of the
            // five sections are unlabelled icons.
            opacity: 1,
            '&.Mui-selected': { fontSize: '0.68rem' },
          },
        }}
      >
        {sections.map((section) => (
          <BottomNavigationAction
            key={section.label}
            label={section.label}
            icon={<section.icon sx={{ fontSize: 21 }} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
    </Portal>
  );
}
