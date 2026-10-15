'use client';

import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type CategoryChipProps = Omit<ChipProps, 'label' | 'color'> & {
  name: string | null | undefined;
  color?: string | null;
  /** Dashed style for a suggestion that hasn't been applied yet. */
  suggested?: boolean;
  confidence?: number | null;
};

const FALLBACK = '#3B82F6';

function safeHex(color: string | null | undefined): string {
  if (!color) return FALLBACK;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : FALLBACK;
}

/** Category pill tinted with the category colour; handles uncategorized + suggested states. */
export default function CategoryChip(props: CategoryChipProps) {
  const { name, color, suggested, confidence, sx, size = 'small', ...rest } = props;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!name) {
    return (
      <Chip
        size={size}
        label="Uncategorized"
        variant="outlined"
        sx={{
          color: 'text.secondary',
          borderStyle: 'dashed',
          borderColor: alpha(theme.palette.text.primary, 0.24),
          bgcolor: 'transparent',
          ...sx,
        }}
        {...rest}
      />
    );
  }

  const hex = safeHex(color);
  const label = suggested && confidence != null ? `${name} · ${Math.round(confidence * 100)}%` : name;

  return (
    <Chip
      size={size}
      label={label}
      variant="outlined"
      sx={{
        color: isDark ? alpha(hex, 0.95) : hex,
        bgcolor: alpha(hex, isDark ? 0.14 : 0.09),
        borderColor: alpha(hex, suggested ? 0.5 : 0.28),
        borderStyle: suggested ? 'dashed' : 'solid',
        fontWeight: 600,
        '& .MuiChip-label': { px: 1 },
        ...sx,
      }}
      {...rest}
    />
  );
}
