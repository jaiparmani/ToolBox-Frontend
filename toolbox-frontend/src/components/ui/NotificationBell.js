import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Popover, Typography, Tooltip, useTheme } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getNotifications, markNotificationsRead } from '../rest/expenseTrackerApis';
import { accents } from '../../theme/tokens';
import TelegramConnect from './TelegramConnect';
import { feedback } from './feedback';

const POLL_MS = 25000;

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * The notification presence — a bell that rings and glows the moment money
 * moves. Polls the feed, badges the unread count, and on a genuinely new item
 * raises a real browser notification (once permission is granted by tapping the
 * bell) plus a soft in-app pulse. Opening it reveals a glass feed; each item
 * deep-links and marks itself read. Reduced motion stills the ring.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const reduce = useReducedMotion();

  const [items, setItems] = React.useState([]);
  const [unread, setUnread] = React.useState(0);
  const [anchor, setAnchor] = React.useState(null);
  const [ringing, setRinging] = React.useState(false);
  const seenIds = React.useRef(new Set());
  const primed = React.useRef(false); // first load shouldn't fire OS notifications

  const raiseOS = React.useCallback((n) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    try { new Notification(n.title, { body: n.body, tag: `toolbox-${n.id}`, icon: '/logo192.png' }); } catch { /* ignore */ }
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const data = await getNotifications();
      const results = data.results || [];
      setItems(results);
      setUnread(data.unread_count || 0);

      // Detect items we haven't seen before → ring + OS notification.
      const fresh = results.filter(n => !seenIds.current.has(n.id));
      results.forEach(n => seenIds.current.add(n.id));
      if (primed.current && fresh.some(n => !n.is_read)) {
        setRinging(true);
        feedback('open');
        setTimeout(() => setRinging(false), 1400);
        const newest = fresh.find(n => !n.is_read);
        if (newest) raiseOS(newest);
      }
      primed.current = true;
    } catch { /* stay quiet on transient failures */ }
  }, [raiseOS]);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onFocus = () => { if (!document.hidden) refresh(); };
    // Actions that create notifications (e.g. adding a split) fire this so the
    // bell updates instantly instead of waiting for the next poll.
    const onPoke = () => refresh();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('toolbox:notify-refresh', onPoke);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus); window.removeEventListener('toolbox:notify-refresh', onPoke); };
  }, [refresh]);

  const openPanel = (e) => {
    setAnchor(e.currentTarget);
    // Ask for OS-notification permission the first time they engage (a gesture).
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };
  const closePanel = () => setAnchor(null);

  const markAll = async () => {
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await markNotificationsRead(); } catch { /* optimistic */ }
  };

  const openItem = async (n) => {
    closePanel();
    if (!n.is_read) {
      setUnread(u => Math.max(0, u - 1));
      markNotificationsRead([n.id]).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const hasUnread = unread > 0;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={openPanel} aria-label={`Notifications${hasUnread ? `, ${unread} unread` : ''}`}
          sx={{
            position: 'relative', color: hasUnread ? accents.violet : 'text.secondary',
            '@keyframes bellRing': { '0%,100%': { transform: 'rotate(0)' }, '20%': { transform: 'rotate(16deg)' }, '40%': { transform: 'rotate(-13deg)' }, '60%': { transform: 'rotate(8deg)' }, '80%': { transform: 'rotate(-5deg)' } },
            '@keyframes bellGlow': { '0%,100%': { opacity: 0.35, transform: 'scale(1)' }, '50%': { opacity: 0.7, transform: 'scale(1.25)' } },
          }}>
          {/* Glow halo when there's something unread */}
          {hasUnread && (
            <Box aria-hidden sx={{ position: 'absolute', inset: 2, borderRadius: '50%',
              background: `radial-gradient(circle, ${accents.violet}66, transparent 70%)`,
              animation: reduce ? 'none' : 'bellGlow 2.2s ease-in-out infinite' }} />
          )}
          <NotificationsRoundedIcon sx={{ position: 'relative',
            animation: (ringing && !reduce) ? 'bellRing 0.9s ease-in-out' : 'none', transformOrigin: '50% 10%' }} />
          {/* Unread badge */}
          {hasUnread && (
            <Box sx={{ position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, px: 0.4,
              borderRadius: 999, bgcolor: accents.red, color: '#fff', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid',
              borderColor: dark ? '#0b0c12' : '#fff', lineHeight: 1 }}>
              {unread > 9 ? '9+' : unread}
            </Box>
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={closePanel}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: {
          mt: 1, width: { xs: 340, sm: 380 }, maxWidth: '94vw', borderRadius: 4, overflow: 'hidden',
          border: '1px solid', borderColor: 'divider',
          backgroundImage: `radial-gradient(120% 120% at 100% 0%, ${accents.violet}1f, transparent 55%)`,
          backdropFilter: 'blur(24px) saturate(1.3)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.5)',
        } } }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 750, fontSize: '1rem', flex: 1 }}>Notifications</Typography>
          {hasUnread && (
            <Box role="button" onClick={markAll}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: accents.violet, fontSize: '0.8rem', fontWeight: 650 }}>
              <DoneAllRoundedIcon sx={{ fontSize: 16 }} /> Mark all read
            </Box>
          )}
        </Box>

        {/* Feed */}
        <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">You're all caught up.</Typography>
              <Typography variant="caption" color="text.disabled">Split a bill and it'll show up here.</Typography>
            </Box>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((n, i) => (
                <motion.div key={n.id}
                  initial={reduce ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.2) }}>
                  <Box onClick={() => openItem(n)}
                    sx={{ display: 'flex', gap: 1.25, px: 2, py: 1.5, cursor: 'pointer',
                      borderBottom: '1px solid', borderColor: 'divider',
                      bgcolor: n.is_read ? 'transparent' : `${accents.violet}12`,
                      transition: 'background-color 160ms ease', '&:hover': { bgcolor: `${accents.violet}1f` } }}>
                    <Box sx={{ flexShrink: 0, width: 34, height: 34, borderRadius: '10px',
                      bgcolor: `${accents.amber}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CallSplitRoundedIcon sx={{ color: accents.amber, fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>{n.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</Typography>
                      <Typography variant="caption" color="text.disabled">{timeAgo(n.created_at)}</Typography>
                    </Box>
                    {!n.is_read && <Box sx={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: accents.violet, mt: 0.75 }} />}
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Box>

        {/* Telegram channel promo */}
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <TelegramConnect compact />
        </Box>
      </Popover>
    </>
  );
}
