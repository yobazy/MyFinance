'use client';

import React from 'react';
import { Box, Card, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownIcon from '@mui/icons-material/TrendingDownRounded';

export type StatTone = 'default' | 'positive' | 'negative' | 'warning' | 'info';

type StatCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Secondary line under the value. */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  /** Percent or absolute delta; positive renders green, negative red. */
  delta?: { value: number; label?: string; invert?: boolean };
  loading?: boolean;
  onClick?: () => void;
  sx?: object;
};

export function toneColor(tone: StatTone | undefined, theme: Theme) {
  switch (tone) {
    case 'positive':
      return theme.palette.success.main;
    case 'negative':
      return theme.palette.error.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'info':
      return theme.palette.info.main;
    default:
      return theme.palette.text.primary;
  }
}

export default function StatCard(props: StatCardProps) {
  const { label, value, hint, icon, tone = 'default', delta, loading, onClick, sx } = props;
  const theme = useTheme();
  const color = toneColor(tone, theme);
  const accent = tone === 'default' ? theme.palette.primary.main : color;

  const deltaGood = delta ? (delta.invert ? delta.value <= 0 : delta.value >= 0) : true;
  const deltaColor = deltaGood ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2.25,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease, transform 120ms ease',
        ...(onClick
          ? { '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.2), transform: 'translateY(-1px)' } }
          : null),
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {label}
        </Typography>
        {icon ? (
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: accent,
              bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.1),
              '& svg': { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        ) : null}
      </Stack>

      {loading ? (
        <Skeleton width="60%" height={34} />
      ) : (
        <Typography
          variant="h3"
          component="div"
          className="tabular-nums"
          sx={{ color, lineHeight: 1.1, letterSpacing: '-0.03em', fontWeight: 650 }}
        >
          {value}
        </Typography>
      )}

      {delta || hint ? (
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ minHeight: 20 }}>
          {delta ? (
            <Stack
              direction="row"
              alignItems="center"
              gap={0.25}
              sx={{
                color: deltaColor,
                fontSize: '0.78rem',
                fontWeight: 650,
                px: 0.75,
                py: 0.1,
                borderRadius: 1,
                bgcolor: alpha(deltaColor, theme.palette.mode === 'dark' ? 0.16 : 0.1),
              }}
            >
              {delta.value >= 0 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
              {`${delta.value > 0 ? '+' : ''}${delta.value.toFixed(delta.value % 1 === 0 ? 0 : 1)}%`}
            </Stack>
          ) : null}
          {hint ? (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              {delta?.label ?? hint}
            </Typography>
          ) : delta?.label ? (
            <Typography variant="caption" color="text.secondary">
              {delta.label}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Card>
  );
}
