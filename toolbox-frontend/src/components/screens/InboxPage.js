import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack, Typography } from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InboxIcon from '@mui/icons-material/AllInbox';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { useAuth } from '../../contexts/AuthContext';
import { useMoney } from '../../contexts/MoneyContext';
import { getSplitBalances, getCopilotCards, dismissCopilotCard } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import { BalanceSkeleton } from '../ui/Skeletons';
import { PageHeader, SectionHeader, EmptyState, Panel, AmountDisplay, copilotIcon, copilotTone } from '../ui';
import { accents } from '../../theme/tokens';

/**
 * Money Inbox — the review queue. The copilot's proactive cards up top (each a
 * real condition with the figure behind it, dismissable or actionable), then
 * unsettled balances in both directions.
 */
export default function InboxPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { loading: loadingMoney } = useMoney();
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);
  const [copilot, setCopilot] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.allSettled([getSplitBalances(), getCopilotCards()]);
    const next = [];
    if (b.status === 'fulfilled') {
      (b.value.balances || []).filter(p => p.owed > 0).forEach(p => next.push({
        id: `owed-${p.personId}`, icon: CallSplitIcon, tone: accents.mint,
        title: `${p.name} owes you`, amount: p.owed,
        detail: `${p.unsettledCount} unsettled`, to: '/splits',
      }));
      (b.value.youOwe || []).forEach(d => next.push({
        id: `owe-${d.userId}`, icon: CallSplitIcon, tone: accents.red,
        title: `You owe ${d.name}`, amount: -d.owed,
        detail: `${d.unsettledCount} shared ${d.unsettledCount === 1 ? 'bill' : 'bills'}`, to: '/splits',
      }));
      next.sort((a, b2) => Math.abs(b2.amount) - Math.abs(a.amount));
    }
    setSettlements(next);
    if (c.status === 'fulfilled') setCopilot(c.value);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const handleDismiss = (id) => {
    setCopilot(prev => prev.filter(c => c.id !== id));
    dismissCopilotCard(id).catch(() => {});
  };

  if (isLoading || !isAuthenticated) return null;

  const busy = loading || loadingMoney;
  const nothing = !busy && copilot.length === 0 && settlements.length === 0;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
      <Reveal>
        <PageHeader
          icon={InboxIcon}
          title="Inbox"
          subtitle="What needs your attention"
        />
        {/* Financial weather now lives once in the app top bar, not per-screen. */}
      </Reveal>

      {busy ? (
        <BalanceSkeleton />
      ) : nothing ? (
        <Reveal index={1}>
          <EmptyState
            icon={CheckCircleIcon}
            title="You're all caught up"
            description="Nothing needs you right now. New concerns show up here as they arise."
            tone={accents.mint}
          />
        </Reveal>
      ) : (
        <>
          {copilot.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Reveal index={1}><SectionHeader title="Needs attention" count={copilot.length} /></Reveal>
              <Stack spacing={1.25}>
                {copilot.map((card, i) => (
                  <Reveal key={card.id} index={2 + i}>
                    <EventRow
                      icon={copilotIcon(card)}
                      tone={copilotTone(card)}
                      title={card.title}
                      detail={card.body}
                      onClick={() => card.action_route && navigate(card.action_route)}
                      onDismiss={() => handleDismiss(card.id)}
                    />
                  </Reveal>
                ))}
              </Stack>
            </Box>
          )}

          {settlements.length > 0 && (
            <Box>
              <Reveal index={2}><SectionHeader title="Settlements" count={settlements.length} /></Reveal>
              <Stack spacing={1.25}>
                {settlements.map((item, i) => (
                  <Reveal key={item.id} index={3 + i}>
                    <EventRow icon={item.icon} tone={item.tone} title={item.title} detail={item.detail}
                      onClick={() => navigate(item.to)}
                      right={<AmountDisplay value={item.amount} tone="auto" showSign size="md" />} />
                  </Reveal>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}

/** One inbox event — an intelligent row with tone, title, supporting line, an
 *  action, and an optional dismiss. */
function EventRow({ icon: Icon, tone, title, detail, right, onClick, onDismiss }) {
  return (
    <Panel
      interactive
      tint={tone}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`${title}. ${detail}`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75,
        '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, backgroundColor: `${tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ color: tone, fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{detail}</Typography>
      </Box>
      {right}
      {onDismiss ? (
        <Box role="button" aria-label="Dismiss" tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDismiss(); } }}
          sx={{ flexShrink: 0, display: 'flex', p: 0.5, borderRadius: 1, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
      ) : (
        <ChevronRightIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
      )}
    </Panel>
  );
}
