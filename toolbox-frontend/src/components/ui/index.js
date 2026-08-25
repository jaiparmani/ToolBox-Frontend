// ── ToolBox UI kit ───────────────────────────────────────────────────────────
// One barrel for the reusable design-system primitives. Import from here so
// screens depend on the kit, not on individual file paths:
//   import { Panel, MetricCard, AmountDisplay } from '../ui';

// Layout & surfaces
export { default as Panel } from './Panel';
export { default as PageHeader, SectionHeader } from './PageHeader';
export { default as ChartContainer } from './ChartContainer';
export { default as BottomSheet } from './BottomSheet';

// Data display
export { default as MetricCard } from './MetricCard';
export { default as AmountDisplay } from './AmountDisplay';
export { default as AnimatedNumber } from './AnimatedNumber';
export { default as EmptyState } from './EmptyState';
export { default as StatusBadge, ConfidenceBadge } from './StatusBadge';

// Controls & feedback
export { default as SegmentedControl } from './SegmentedControl';
export { default as ConfirmDialog } from './ConfirmDialog';
export { ToastProvider, useToast } from './Toast';
export { default as ErrorBanner } from './ErrorBanner';
export { default as CommandPalette } from './CommandPalette';

// Money OS — the cinematic finance surfaces
export { default as SafeToSpendHero } from './SafeToSpendHero';
export { default as FinancialWeather, deriveWeather, WEATHER } from './FinancialWeather';
export { default as FinancialWeatherBar } from './FinancialWeatherBar';
export { default as AttentionLayer } from './AttentionLayer';
export { default as InsightConstellation } from './InsightConstellation';
export { deriveProjectionAttention } from './moneyAttention';
export { default as MoneyPulse } from './MoneyPulse';
export { default as CashFlowRiver } from './CashFlowRiver';
export { default as TransactionStoryDrawer, buildStoryFromEvent, buildStoryFromExpense } from './TransactionStoryDrawer';

// Money helpers
export { money, moneyWhole, moneySmart, relativeDay } from './money';
