import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Chip, Container, Stack, Typography } from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InboxIcon from '@mui/icons-material/AllInbox';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useAuth } from '../../contexts/AuthContext';
import { getSplitBalances } from '../rest/expenseTrackerApis';
import Reveal from '../ui/Reveal';
import { BalanceSkeleton } from '../ui/Skeletons';
import { money } from '../ui/money';
import { accents } from '../../theme/tokens';

/**
 * Inbox - "what needs my attention". The first surface a money command center
 * owes the user: everything actionable, in one place, newest concern first.
 *
 * v1 aggregates the things the app can already see - unsettled balances in both
 * directions. It's built to grow: predicted bills, low-runway warnings and
 * automatable chores drop in as attention items once the projection backend
 * lands, without changing this surface's shape.
 */
export default function InboxPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await getSplitBalances();
      const next = [];
      (b.balances || []).filter(p => p.owed > 0).forEach(p => next.push({
        id: `owed-${p.personId}`, kind: 'owed', icon: CallSplitIcon, color: accents.blue,
        title: `${p.name} owes you`, amount: p.owed,
        note: `${p.unsettledCount} unsettled`, to: '/splits',
      }));
      (b.youOwe || []).forEach(d => next.push({
        id: `owe-${d.userId}`, kind: 'owe', icon: CallSplitIcon, color: accents.red,
        title: `You owe ${d.name}`, amount: -d.owed,
        note: `${d.unsettledCount} shared ${d.unsettledCount === 1 ? 'bill' : 'bills'}`, to: '/splits',
      }));
      next.sort((a, b2) => Math.abs(b2.amount) - Math.abs(a.amount));
      setItems(next);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pb: 6 }}>
      <Reveal>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 2.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '13px', background: `linear-gradient(135deg, ${accents.violet}, ${accents.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${accents.violet}55` }}>
            <InboxIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 650, lineHeight: 1.1 }}>Inbox</Typography>
            <Typography variant="caption" color="text.secondary">What needs your attention</Typography>
          </Box>
        </Box>
      </Reveal>

      {loading ? (
        <BalanceSkeleton />
      ) : items.length === 0 ? (
        <Reveal index={1}>
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 52, color: accents.mint, mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 650 }}>You're all caught up</Typography>
            <Typography variant="body2" color="text.secondary">
              Nothing needs you right now. New concerns show up here as they arise.
            </Typography>
          </Box>
        </Reveal>
      ) : (
        <Stack spacing={1.25}>
          {items.map((item, i) => (
            <Reveal key={item.id} index={i + 1}>
              <Card elevation={0} sx={{ borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
                <CardActionArea onClick={() => navigate(item.to)} sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={1.75}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, backgroundColor: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon sx={{ color: item.color, fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                    </Box>
                    <Box textAlign="right" sx={{ flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: item.amount >= 0 ? '#3987e5' : '#d94f3d', fontVariantNumeric: 'tabular-nums' }}>
                        {item.amount >= 0 ? '+' : '−'}{money(Math.abs(item.amount))}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
                  </Box>
                </CardActionArea>
              </Card>
            </Reveal>
          ))}
        </Stack>
      )}
    </Container>
  );
}
