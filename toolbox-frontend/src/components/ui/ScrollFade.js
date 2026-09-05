import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';

/**
 * Horizontal scroll container with gradient edge masks — Apple Design §9.
 *
 * Fade masks appear/disappear based on scroll position: left mask shows when
 * scrolled right, right mask shows when there's more content to the right.
 * The masks are CSS mask-image gradients so they're composited on the GPU
 * and don't trigger layout/paint.
 *
 * Usage:
 *   <ScrollFade>
 *     <Chip /><Chip /><Chip />...
 *   </ScrollFade>
 */
export default function ScrollFade({ children, fadeWidth = 24, sx, ...rest }) {
  const scrollRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const check = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setEdges({
      left: scrollLeft > 2,
      right: scrollLeft + clientWidth < scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [check]);

  const maskParts = [];
  if (edges.left) maskParts.push(`linear-gradient(to right, transparent, black ${fadeWidth}px)`);
  if (edges.right) maskParts.push(`linear-gradient(to left, transparent, black ${fadeWidth}px)`);

  const maskImage = maskParts.length === 2
    ? `linear-gradient(to right, transparent, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), transparent)`
    : maskParts.length === 1
      ? maskParts[0]
      : 'none';

  return (
    <Box
      ref={scrollRef}
      sx={{
        display: 'flex',
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        ...(maskImage !== 'none' && {
          maskImage,
          WebkitMaskImage: maskImage,
        }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
