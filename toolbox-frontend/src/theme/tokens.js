/**
 * Semantic design tokens - the single source for every visual value.
 *
 * "Calm futurism": deep ink surfaces, restrained translucency, a small set of
 * electric accents, money numbers large and confident. Nothing here is a raw
 * hex scattered in a component; screens consume roles (surface.raised,
 * state.warning, space.4) so the whole system can be retuned in one place and
 * light/dark stay in lockstep.
 *
 * Roles that differ by mode expose { dark, light }; pick with tokensFor(mode).
 */

// ── Primitive ramps (not used directly by screens) ──────────────────────────
const ink = {
  900: '#0b0b10', 800: '#131319', 700: '#1a1a22', 600: '#22222c',
  500: '#2c2c38', 400: '#3a3a48',
};
const paper = {
  0: '#ffffff', 50: '#f6f7f9', 100: '#eceef3', 200: '#e2e5ec', 300: '#d3d7e0',
};

// ── Accents (the electric set; deliberately few) ────────────────────────────
export const accents = {
  blue: '#0A84FF',    // primary / income-neutral
  violet: '#7C5CFF',  // secondary / accent
  cyan: '#64D2FF',    // cool highlight
  mint: '#30D6A5',    // positive / on-track
  emerald: '#30D158',
  amber: '#FF9F0A',   // caution / attention
  red: '#FF453A',     // negative / danger
  purple: '#BF5AF2',
};

// ── Semantic colour roles (mode-aware) ──────────────────────────────────────
export const color = {
  // App background + surface stack (elevation reads as lightness/translucency)
  bg:        { dark: '#0b0b10', light: '#eef0f4' },
  surface:   { dark: 'rgba(20,20,26,0.86)',  light: 'rgba(255,255,255,0.86)' },
  raised:    { dark: 'rgba(28,28,36,0.82)',  light: 'rgba(255,255,255,0.92)' },
  sunken:    { dark: 'rgba(255,255,255,0.03)', light: 'rgba(0,0,0,0.02)' },
  glass:     { dark: 'rgba(24,24,32,0.62)',  light: 'rgba(255,255,255,0.66)' },
  hairline:  { dark: 'rgba(255,255,255,0.09)', light: 'rgba(0,0,0,0.08)' },
  // Ink
  text:      { dark: '#f5f6fa', light: '#15161b' },
  textDim:   { dark: '#a4a6b3', light: '#5f6470' },
  textFaint: { dark: '#6c6e7d', light: '#8b90a0' },
  // Brand
  primary:   { dark: accents.blue, light: '#0071e3' },
  accent:    { dark: accents.violet, light: '#6a4bff' },
};

// State colours (reserved; never reused as chart series) - each mode-tuned
export const state = {
  success: { dark: accents.mint,   light: '#0ca37a' },
  warning: { dark: accents.amber,  light: '#c98500' },
  danger:  { dark: accents.red,    light: '#d0342c' },
  info:    { dark: accents.cyan,   light: '#2a78d6' },
};

// Money direction (owed vs owing) - a diverging pair, validated for CVD
export const flowColor = {
  in:  { dark: '#3987e5', light: '#2a78d6' },  // money to you
  out: { dark: '#d94f3d', light: '#c8402f' },  // money you owe
  neutral: { dark: '#383835', light: '#d8d7d2' },
};

// ── Chart palette (kept apart from UI accents; validated both surfaces) ──────
export const chart = {
  categorical: {
    dark:  ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  },
  sequential: { dark: '#3987e5', light: '#2a78d6' },
  gridline: { dark: 'rgba(255,255,255,0.07)', light: 'rgba(0,0,0,0.06)' },
  // legacy alias kept so existing components keep working
  flow: {
    dark:  { owedToYou: '#3987e5', youOwe: '#d94f3d', settled: '#383835' },
    light: { owedToYou: '#2a78d6', youOwe: '#c8402f', settled: '#d8d7d2' },
  },
};

// ── Space (4pt base) ────────────────────────────────────────────────────────
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 };

// ── Radii ───────────────────────────────────────────────────────────────────
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, pill: 999 };

// ── Type scale (fluid where it matters) ─────────────────────────────────────
export const type = {
  family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", ui-monospace, monospace',
  // money numbers: large and confident
  hero:    { size: 'clamp(2.2rem, 8vw, 3.4rem)', weight: 700, spacing: '-0.03em' },
  display: { size: 'clamp(1.6rem, 5vw, 2.4rem)', weight: 700, spacing: '-0.025em' },
  title:   { size: '1.25rem', weight: 650, spacing: '-0.015em' },
  body:    { size: '1rem', weight: 400, spacing: '0' },
  label:   { size: '0.82rem', weight: 600, spacing: '0' },
  caption: { size: '0.72rem', weight: 500, spacing: '0.01em' },
};

// ── Elevation (depth from contrast on dark, shadow on light) ────────────────
export const shadow = {
  dark:  { sm: '0 1px 2px rgba(0,0,0,0.4)', md: '0 6px 20px rgba(0,0,0,0.5)', lg: '0 16px 40px rgba(0,0,0,0.6)' },
  light: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 6px 20px rgba(0,0,0,0.1)', lg: '0 16px 40px rgba(0,0,0,0.14)' },
};

// ── Z-index ladder ──────────────────────────────────────────────────────────
export const z = { base: 0, raised: 1, sticky: 100, header: 1000, drawer: 1100, modal: 1300, toast: 1500, max: 2000 };

// ── Motion ──────────────────────────────────────────────────────────────────
export const motion = {
  instant: 90, fast: 160, normal: 240, slow: 380, slower: 560,
  ease: 'cubic-bezier(0.32, 0.72, 0, 1)',        // settle
  emphasis: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // overshoot
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Back-compat surface/shadow shapes some components already import
export const surfaces = {
  dark:  { canvas: color.bg.dark,  raised: color.raised.dark,  sunken: color.sunken.dark,  hairline: color.hairline.dark },
  light: { canvas: color.bg.light, raised: color.raised.light, sunken: color.sunken.light, hairline: color.hairline.light },
};
export const shadows = { dark: { card: shadow.dark.sm, lifted: shadow.dark.lg }, light: { card: shadow.light.sm, lifted: shadow.light.lg } };

/** Resolve every mode-aware role to concrete values for one mode. */
export function tokensFor(mode = 'dark') {
  const pick = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v[mode]]));
  return {
    color: pick(color), state: pick(state), flow: pick(flowColor),
    chart: { categorical: chart.categorical[mode], sequential: chart.sequential[mode], gridline: chart.gridline[mode] },
    shadow: shadow[mode], space, radius, type, z, motion, accents,
  };
}
