'use client';

import React from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary + optional secondary action buttons. */
  actions?: React.ReactNode;
  /** Render inside a Card (default) or bare. */
  variant?: 'card' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  sx?: object;
};

export default function EmptyState(props: EmptyStateProps) {
  const { icon, title, description, actions, variant = 'card', size = 'md', sx } = props;
  const theme = useTheme();
  const py = size === 'lg' ? 10 : size === 'sm' ? 4 : 7;

  const body = (
    <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ py, px: 3 }}>
      {icon ? (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
            mb: 0.5,
            '& svg': { fontSize: 28 },
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Typography variant="h5" component="h3">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {description}
        </Typography>
      ) : null}
      {actions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap sx={{ pt: 1 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );

  if (variant === 'plain') return <Box sx={sx}>{body}</Box>;
  return <Card sx={{ borderStyle: 'dashed', ...sx }}>{body}</Card>;
}
