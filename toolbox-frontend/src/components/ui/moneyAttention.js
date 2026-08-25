import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { accents } from '../../theme/tokens';
import { money } from './money';

/**
 * The one place that decides what's worth the user's attention, derived purely
 * from data the app already holds (projection + pulse). Shared by the dashboard
 * rail and the Inbox queue so both surface the same real conditions — nothing
 * invented, every item carries its supporting number and a route to act on.
 *
 * Returns [{ id, icon, tone, title, detail, to }]. Callers attach the click
 * (navigate(to)) and choose the layout.
 */
export function deriveProjectionAttention({ projection, pulse }) {
  const items = [];
  const inp = pulse?.inputs || {};

  if (projection?.runway_days != null && projection.runway_days <= 7) {
    const d = projection.runway_days;
    items.push({
      id: 'runway', icon: BoltRoundedIcon, tone: accents.red,
      title: `Runway is short — ~${d} day${d === 1 ? '' : 's'}`,
      detail: 'At your recent pace and the bills ahead', to: '/reports',
    });
  }
  if (inp.prior_7_days_spend > 0 && inp.last_7_days_spend > inp.prior_7_days_spend * 1.25) {
    const pct = Math.round(((inp.last_7_days_spend - inp.prior_7_days_spend) / inp.prior_7_days_spend) * 100);
    items.push({
      id: 'unusual', icon: TrendingUpRoundedIcon, tone: accents.amber,
      title: `Spending up ${pct}% this week`,
      detail: `${money(inp.last_7_days_spend)} vs ${money(inp.prior_7_days_spend)} the week before`,
      to: '/expense-tracker',
    });
  }
  if (projection?.upcoming_bills > 0) {
    items.push({
      id: 'bills', icon: ReceiptLongRoundedIcon, tone: accents.violet,
      title: `${money(projection.upcoming_bills)} in bills ahead`,
      detail: projection.next_income_date
        ? `Next income ${new Date(projection.next_income_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : 'In the next 30 days',
      to: '/reports',
    });
  }
  return items;
}
