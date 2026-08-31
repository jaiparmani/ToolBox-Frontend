// The authenticated app shell. Previously a stock @toolpad/core DashboardLayout;
// now a bespoke shell (AppShell) in the app's own glass/aurora language — a
// translucent rail with an animated active indicator, a populated toolbar, and
// a proper account menu. Kept as this module so the router import is unchanged.
export { default } from './AppShell';
