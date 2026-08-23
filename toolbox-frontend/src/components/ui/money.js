/**
 * One place that decides how money looks.
 *
 * Amounts are stored in rupees server-side, so everything here is INR. Compact
 * form is for tight mobile spots where "₹1.2L" beats a number that wraps.
 */
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
});
const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

export const money = (amount) => inr.format(Number(amount) || 0);
export const moneyWhole = (amount) => inrWhole.format(Number(amount) || 0);

// Long numbers break mobile layouts, so switch to compact past six figures.
export const moneySmart = (amount) => {
  const value = Number(amount) || 0;
  return Math.abs(value) >= 100000 ? inrCompact.format(value) : inrWhole.format(value);
};

export const relativeDay = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const days = Math.round((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
