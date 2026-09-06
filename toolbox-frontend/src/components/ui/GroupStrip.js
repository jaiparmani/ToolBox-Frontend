import React from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { motion } from '../../theme/tokens';

/**
 * The groups you split within, as a swipeable row.
 *
 * A group is a place you keep going back to - the flat, the trip - so it
 * belongs at the top as a way in, not buried in a menu. Tapping one opens
 * that group's own view.
 *
 * A group can also reach you from the other side: somebody splits a flat's
 * rent with you and their group appears here. Those are marked "shared with
 * you", because you can read them but not rename them or add people.
 */
export default function GroupStrip({ groups, activeId, onOpen, onCreate }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        overflowX: 'auto', pb: 1, scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
      }}
    >
      {groups.map((group, i) => {
        const active = activeId === group.id;
        return (
          <Card
            key={group.id}
            elevation={0}
            onClick={() => onOpen(group)}
            sx={{
              flex: '0 0 auto', minWidth: 132, p: 1.5, cursor: 'pointer',
              borderRadius: 3, scrollSnapAlign: 'start',
              border: '1.5px solid',
              borderColor: active ? 'primary.main' : 'divider',
              backgroundColor: active ? 'action.selected' : 'transparent',
              animation: `groupIn ${motion.normal}ms ${motion.ease} both`,
              animationDelay: `${i * 45}ms`,
              '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
              '@keyframes groupIn': {
                from: { opacity: 0, transform: 'translateX(10px)' },
                to: { opacity: 1, transform: 'none' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            <Box display="flex" alignItems="center" gap={0.75}>
              <Typography sx={{ fontSize: 22, lineHeight: 1.1 }}>
                {group.emoji || '👥'}
              </Typography>
              {group.isOwner === false && (
                <PeopleAltIcon
                  titleAccess={`Shared with you by ${group.ownerUsername || 'someone else'}`}
                  sx={{ fontSize: 15, color: 'text.disabled' }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }} noWrap>
              {group.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {group.isOwner === false
                ? `shared by ${group.ownerUsername || 'someone else'}`
                : `${group.memberCount} ${group.memberCount === 1 ? 'person' : 'people'}`}
            </Typography>
          </Card>
        );
      })}

      <Card
        elevation={0}
        onClick={onCreate}
        sx={{
          flex: '0 0 auto', minWidth: 132, p: 1.5, cursor: 'pointer',
          borderRadius: 3, scrollSnapAlign: 'start',
          border: '1.5px dashed', borderColor: 'divider',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', gap: 0.5,
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        {groups.length === 0
          ? <GroupsIcon sx={{ color: 'text.disabled' }} />
          : <AddIcon sx={{ color: 'text.disabled' }} />}
        <Typography variant="caption" color="text.secondary">
          {groups.length === 0 ? 'Make a group' : 'New group'}
        </Typography>
      </Card>
    </Stack>
  );
}
