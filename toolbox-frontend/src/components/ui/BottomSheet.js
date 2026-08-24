import React from 'react';
import { Box, Modal, Fade, Slide, useMediaQuery, useTheme } from '@mui/material';
import { radius } from '../../theme/tokens';

/**
 * A sheet that slides up from the bottom on phones and becomes a centred
 * dialog on larger screens. The one container for detail sheets, pickers and
 * composers so they share a single motion + scrim treatment.
 */
export default function BottomSheet({ open, onClose, children, maxWidth = 520, sx }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Modal open={open} onClose={onClose} closeAfterTransition
      sx={{ display: 'flex', alignItems: isPhone ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <Slide in={open} direction={isPhone ? 'up' : undefined} timeout={isPhone ? 260 : 0}>
        <Box>
          <Fade in={open} timeout={isPhone ? 0 : 200}>
            <Box sx={{
              width: isPhone ? '100vw' : `min(${maxWidth}px, 92vw)`,
              maxHeight: isPhone ? '92vh' : '88vh', overflowY: 'auto',
              bgcolor: 'background.paper',
              borderRadius: isPhone ? `${radius.xl}px ${radius.xl}px 0 0` : `${radius.lg}px`,
              boxShadow: 24, outline: 'none', p: { xs: 2.5, sm: 3 },
              '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', ...sx,
            }}>
              {isPhone && <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: 'divider', mx: 'auto', mb: 2 }} />}
              {children}
            </Box>
          </Fade>
        </Box>
      </Slide>
    </Modal>
  );
}
