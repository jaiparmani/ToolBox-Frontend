import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack, Typography } from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InboxIcon from '@mui/icons-material/AllInbox';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useAuth } from '../../contexts/AuthContext';
import { useMoney } from '../../contexts/MoneyContext';
import { getSplitBalances } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import { BalanceSkeleton } from '../ui/Skeletons';
import { money } from '../ui/money';
import {
  PageHeader, SectionHeader, EmptyState, FinancialWeather, deriveProjectionAttention,
} from '../ui';
import { accents } from '../../theme/tokens';

/**
 * Money Inbox — the review queue. Everything the app can see that might need a
 * decision, as intelligent *events* rather than table rows: projection-derived
 * concerns (short runway, unusual spend, bills ahead) up top, then unsettled
 * balances in both directions. Each event is a real condition with its number
 * and a way to act. Reuses the same attention derivation as the dashboard.
 */
export default function InboxPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { projection, pulse, loading: loadingMoney } = useMoney();
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [b] = await Promise.allSettled([getSplitBalances()]);
    const next = [];
    if (b.status === 'fulfilled') {
      (b.value.balances || []).filter(p => p.owed > 0).forEach(p => next.push({
        id: `owed-${p.personId}`, icon: CallSplitIcon, tone: accents.blue,
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
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  if (isLoading || !isAuthenticated) return null;

  const concerns = deriveProjectionAttention({ projection, pulse });
  const busy = loading || loadingMoney;
  const nothing = !busy && concerns.length === 0 && settlements.length === 0;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
      <Reveal>
        <PageHeader
          icon={InboxIcon}
          gradient={`linear-gradient(135deg, ${accents.violet}, ${accents.blue})`}
          glow={`${accents.violet}55`}
          title="Inbox"
          subtitle="What needs your attention"
        />
        <Box sx={{ mb: 2.5 }}>
          <FinancialWeather projection={projection} pulse={pulse} loading={loadingMoney} onClick={() => navigate('/reports')} />
        </Box>
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
          {concerns.length > 0 && (
            <Reveal index={1}>
              <SectionHeader title="Concerns" count={concerns.length} />
              <Stack spacing={1.25} sx={{ mb: 3 }}>
                {concerns.map((c) => (
                  <EventRow key={c.id} icon={c.icon} tone={c.tone} title={c.title} detail={c.detail}
                    onClick={() => navigate(c.to)} />
                ))}
              </Stack>
            </Reveal>
          )}

          {settlements.length > 0 && (
            <Reveal index={2}>
              <SectionHeader title="Settlements" count={settlements.length} />
              <Stack spacing={1.25}>
                {settlements.map((item) => (
                  <EventRow key={item.id} icon={item.icon} tone={item.tone} title={item.title} detail={item.detail}
                    onClick={() => navigate(item.to)}
                    right={
                      <Typography sx={{ fontWeight: 700, color: item.amount >= 0 ? accents.blue : accents.red, fontVariantNumeric: 'tabular-nums' }}>
                        {item.amount >= 0 ? '+' : '−'}{money(Math.abs(item.amount))}
                      </Typography>
                    } />
                ))}
              </Stack>
            </Reveal>
          )}
        </>
      )}
    </Container>
  );
}

/** One inbox event — an intelligent row with tone, title, supporting line and action. */
function EventRow({ icon: Icon, tone, title, detail, right, onClick }) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`${title}. ${detail}`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.75, p: 2, borderRadius: 3.5, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider', backgroundColor: 'transparent',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: `${tone}88` },
        '&:focus-visible': { outline: `2px solid ${tone}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, backgroundColor: `${tone}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ color: tone, fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{detail}</Typography>
      </Box>
      {right}
      <ChevronRightIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
    </Box>
  );
}
