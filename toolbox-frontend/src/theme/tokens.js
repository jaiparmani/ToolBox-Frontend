/**
 * Design tokens: one source for colour, motion and elevation.
 *
 * Values were scattered as hex literals across components, so a colour could
 * drift between two places that meant the same thing. Anything visual that
 * repeats belongs here.
 */

// Motion. Durations are short enough to feel like response rather than
// animation; the standard curve eases out so movement settles instead of
// stopping dead, and `emphasis` overshoots slightly for things that appear.
export const motion = {
  instant: 90,
  fast: 160,
  normal: 240,
  slow: 380,
  ease: 'cubic-bezier(0.32, 0.72, 0, 1)',
  emphasis: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const accents = {
  blue: '#0A84FF',
  cyan: '#64D2FF',
  green: '#30D158',
  amber: '#FF9F0A',
  purple: '#BF5AF2',
  red: '#FF453A',
};

/**
 * Chart colours, kept apart from UI accents on purpose.
 *
 * The interface palette above fails as chart colour: on a dark surface the
 * green, amber and cyan sit outside the usable lightness band, and amber
 * against green separates by only ΔE 7.1 for deuteranopia - a coin flip for a
 * red-green colourblind reader. These steps are validated for both surfaces
 * (lightness band, chroma floor, CVD separation, contrast).
 *
 * Slots are assigned in fixed order and never cycled, so a series keeps its
 * colour when the set it belongs to changes.
 */
export const chart = {
  dark:  ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  // Magnitude is carried by bar length, so a ranked breakdown uses one hue and
  // names each row directly - a different colour per bar would imply a
  // difference in kind that isn't there.
  sequential: { dark: '#3987e5', light: '#2a78d6' },
  gridline: { dark: 'rgba(255,255,255,0.07)', light: 'rgba(0,0,0,0.06)' },

  /**
   * Money owed in one direction or the other is polarity, not identity, so it
   * takes a diverging pair: one cool pole, one warm, and a neutral middle for
   * settled. Blue against red separates by ΔE 31 for normal vision and 25 for
   * protanopia. The sign is written out beside every figure regardless -
   * direction of debt is too important to leave to hue alone.
   */
  flow: {
    dark:  { owedToYou: '#3987e5', youOwe: '#d94f3d', settled: '#383835' },
    light: { owedToYou: '#2a78d6', youOwe: '#c8402f', settled: '#d8d7d2' },
  },
};

export const surfaces = {
  dark: {
    canvas: '#0b0b0d',
    raised: 'rgba(255,255,255,0.045)',
    sunken: 'rgba(255,255,255,0.025)',
    hairline: 'rgba(255,255,255,0.09)',
  },
  light: {
    canvas: '#f4f4f6',
    raised: 'rgba(255,255,255,0.82)',
    sunken: 'rgba(0,0,0,0.018)',
    hairline: 'rgba(0,0,0,0.08)',
  },
};

// A single soft shadow scale. Dark surfaces need depth from contrast rather
// than shadow, so its shadows are tighter and darker.
export const shadows = {
  dark: {
    card: '0 1px 2px rgba(0,0,0,0.4)',
    lifted: '0 12px 32px rgba(0,0,0,0.55)',
  },
  light: {
    card: '0 1px 2px rgba(0,0,0,0.05)',
    lifted: '0 12px 32px rgba(0,0,0,0.12)',
  },
};
