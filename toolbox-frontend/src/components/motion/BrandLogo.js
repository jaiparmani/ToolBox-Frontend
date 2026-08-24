import React from 'react';

/**
 * The app's mark. A rounded-square money node with an orbiting split line,
 * echoing the constellation the whole app is built around. Gradient fill so
 * it reads as branded rather than a stock icon.
 */
export default function BrandLogo({ size = 30 }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="ToolBox">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0A84FF" />
          <stop offset="0.55" stopColor="#BF5AF2" />
          <stop offset="1" stopColor="#FF375F" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="24" height="24" rx="8" fill={`url(#${id}-g)`} />
      {/* the "you at the centre, people around" glyph */}
      <circle cx="16" cy="16" r="3.4" fill="#fff" />
      <circle cx="16" cy="8.5" r="1.9" fill="#fff" opacity="0.9" />
      <circle cx="22.5" cy="19.5" r="1.9" fill="#fff" opacity="0.9" />
      <circle cx="9.5" cy="19.5" r="1.9" fill="#fff" opacity="0.9" />
      <path d="M16 16 L16 8.5 M16 16 L22.5 19.5 M16 16 L9.5 19.5"
            stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
