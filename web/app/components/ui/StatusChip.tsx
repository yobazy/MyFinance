'use client';

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { humanize } from '../../../lib/format';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const TONE_FOR_STATUS: Record<string, StatusTone> = {
  succeeded: 'success',
  success: 'success',
  active: 'success',
  processing: 'info',
  uploaded: 'info',
  pending: 'info',
  reversing: 'warning',
  reversed: 'neutral',
  inactive: 'neutral',
  failed: 'error',
  reverse_failed: 'error',
  error: 'error',
};

type StatusChipProps = Omit<ChipProps, 'color' | 'label'> & {
  status: string;
  tone?: StatusTone;
  label?: React.ReactNode;
  dot?: boolean;
};

/** Soft-tinted status pill with a leading dot. */
export default function StatusChip(props: StatusChipProps) {
  const { status, tone, label, dot = true, sx, size = 'small', ...rest } = props;
  const theme = useTheme();
  const resolved = tone ?? TONE_FOR_STATUS[status] ?? 'neutral';
  const color =
    resolved === 'success'
      ? theme.palette.success.main
      : resolved === 'warning'
        ? theme.palette.warning.main
        : resolved === 'error'
          ? theme.palette.error.main
          : resolved === 'info'
            ? theme.palette.info.main
            : theme.palette.text.secondary;
  return (
    <Chip
      size={size}
      label={label ?? humanize(status)}
      sx={{
        color,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
        border: 'none',
        fontWeight: 600,
        ...(dot
          ? {
              '& .MuiChip-label': { pl: 1.5, position: 'relative' },
              '& .MuiChip-label::before': {
                content: '""',
                position: 'absolute',
                left: 2,
                top: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: color,
                transform: 'translateY(-50%)',
              },
            }
          : null),
        ...sx,
      }}
      {...rest}
    />
  );
}
