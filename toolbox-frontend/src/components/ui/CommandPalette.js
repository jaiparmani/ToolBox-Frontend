import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Dialog, InputBase, Typography, useTheme } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import MoveToInboxRoundedIcon from '@mui/icons-material/MoveToInboxRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import { accents, motion } from '../../theme/tokens';

/**
 * Command Palette — the keyboard-first spine of the app. ⌘K / Ctrl-K anywhere
 * opens it; type to filter; ↑↓ to move, ↵ to run, Esc to close. Every command
 * is a plain navigation or action, so it is fully useful with no AI configured
 * at all. (An assistant row can be layered in later as one more command.)
 *
 * Mount once, globally (in the app shell). It owns its own open state and the
 * global hotkey, so nothing else needs wiring.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef(null);

  const commands = React.useMemo(() => [
    { id: 'add', group: 'Actions', label: 'Add an expense', hint: 'Quick capture', icon: AddCircleRoundedIcon, color: accents.blue, run: () => navigate('/expense-tracker?add=1') },
    { id: 'split', group: 'Actions', label: 'New split', hint: 'Share a bill', icon: CallSplitRoundedIcon, color: accents.amber, run: () => navigate('/splits') },
    { id: 'home', group: 'Go to', label: 'Dashboard', hint: 'Money OS', icon: SpaceDashboardRoundedIcon, color: accents.violet, run: () => navigate('/dashboard') },
    { id: 'activity', group: 'Go to', label: 'Activity', hint: 'All transactions', icon: ReceiptLongRoundedIcon, color: accents.blue, run: () => navigate('/expense-tracker') },
    { id: 'inbox', group: 'Go to', label: 'Inbox', hint: 'Review queue', icon: MoveToInboxRoundedIcon, color: accents.cyan, run: () => navigate('/inbox') },
    { id: 'recurring', group: 'Go to', label: 'Recurring', hint: 'Income & bills', icon: AutorenewRoundedIcon, color: accents.violet, run: () => navigate('/recurring') },
    { id: 'insights', group: 'Go to', label: 'Insights', hint: 'Trends & breakdowns', icon: InsightsRoundedIcon, color: accents.purple, run: () => navigate('/reports') },
    { id: 'splits', group: 'Go to', label: 'Shared', hint: 'Who owes whom', icon: CallSplitRoundedIcon, color: accents.amber, run: () => navigate('/splits') },
    { id: 'health', group: 'Go to', label: 'Health', hint: 'Weight, water, sleep', icon: FavoriteRoundedIcon, color: accents.red, run: () => navigate('/health-tracker') },
    { id: 'profile', group: 'Go to', label: 'Settings', hint: 'Your account', icon: PersonRoundedIcon, color: accents.mint, run: () => navigate('/profile') },
  ], [navigate]);

  const results = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter(c => (c.label + ' ' + c.hint + ' ' + c.group).toLowerCase().includes(s));
  }, [q, commands]);

  // Global hotkey (⌘K / Ctrl-K) plus a decoupled event so a toolbar button or
  // any other surface can open the palette without a prop drill.
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('toolbox:command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('toolbox:command-palette', onOpen);
    };
  }, []);

  React.useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);
  React.useEffect(() => { setActive(0); }, [q]);

  const run = (cmd) => { if (!cmd) return; setOpen(false); cmd.run(); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  // keep the active row in view
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = null;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute', top: { xs: 24, sm: 88 }, m: 0, width: '100%',
          borderRadius: 4, overflow: 'hidden',
          border: '1px solid', borderColor: 'divider',
          backgroundImage: `radial-gradient(120% 140% at 0% 0%, ${accents.violet}18, transparent 55%)`,
          backdropFilter: 'blur(30px) saturate(1.4)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        },
      }}
    >
      {/* search row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search actions and screens…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          sx={{ fontSize: '1.05rem', fontWeight: 500 }}
        />
        <Box sx={{ px: 0.75, py: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>ESC</Box>
      </Box>

      {/* results */}
      <Box ref={listRef} role="listbox" aria-label="Commands" sx={{ maxHeight: 380, overflowY: 'auto', py: 1 }}>
        {results.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            No matches for “{q}”.
          </Typography>
        )}
        {results.map((c, i) => {
          const showGroup = c.group !== lastGroup; lastGroup = c.group;
          const isActive = i === active;
          const Icon = c.icon;
          return (
            <React.Fragment key={c.id}>
              {showGroup && (
                <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1, pb: 0.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.disabled' }}>
                  {c.group}
                </Typography>
              )}
              <Box
                data-idx={i}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, mx: 1, px: 1.5, py: 1.1, borderRadius: 2, cursor: 'pointer',
                  backgroundColor: isActive ? `${c.color}1f` : 'transparent',
                  transition: `background-color ${motion.fast}ms ${motion.ease}`,
                }}
              >
                <Box sx={{ width: 30, height: 30, borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${c.color}22` }}>
                  <Icon sx={{ fontSize: 17, color: c.color }} />
                </Box>
                <Typography sx={{ flex: 1, fontWeight: 600 }} noWrap>{c.label}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{c.hint}</Typography>
                {isActive && (
                  <Box aria-hidden sx={{ px: 0.75, py: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>↵</Box>
                )}
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Dialog>
  );
}
