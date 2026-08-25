import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { accents } from '../../theme/tokens';

// Icon per copilot card kind, tone per severity. Kept in one place so the
// dashboard rail and the Inbox render copilot cards identically.
const KIND_ICON = {
  bill_overdraw: AccountBalanceWalletRoundedIcon,
  category_spike: TrendingUpRoundedIcon,
  subscription_renewed: AutorenewRoundedIcon,
  split_stale: HandshakeRoundedIcon,
  low_runway: BoltRoundedIcon,
};

const SEVERITY_TONE = {
  urgent: accents.red,
  watch: accents.amber,
  info: accents.cyan,
};

export function copilotIcon(card) {
  return KIND_ICON[card.kind] || InsightsRoundedIcon;
}

export function copilotTone(card) {
  return SEVERITY_TONE[card.severity] || accents.blue;
}

/**
 * Map a copilot card into the shape AttentionLayer / inbox rows expect.
 * `navigate` wires the card's suggested action; `onDismiss` (optional) adds the
 * dismiss affordance.
 */
export function copilotToItem(card, { navigate, onDismiss } = {}) {
  return {
    id: `copilot-${card.id}`,
    cardId: card.id,
    icon: copilotIcon(card),
    tone: copilotTone(card),
    title: card.title,
    detail: card.body,
    onClick: () => { if (card.action_route && navigate) navigate(card.action_route); },
    onDismiss: onDismiss ? () => onDismiss(card.id) : undefined,
  };
}
