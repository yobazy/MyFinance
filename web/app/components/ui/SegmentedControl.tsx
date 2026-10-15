'use client';

import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

type Option<T extends string> = { value: T; label: React.ReactNode; disabled?: boolean };

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  size?: 'small' | 'medium';
  'aria-label'?: string;
  sx?: object;
};

/** Pill-style single-select control (period pickers, view toggles). */
export default function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { value, onChange, options, size = 'small', sx } = props;
  return (
    <ToggleButtonGroup
      exclusive
      size={size}
      value={value}
      onChange={(_, next: T | null) => {
        if (next != null) onChange(next);
      }}
      aria-label={props['aria-label']}
      sx={sx}
    >
      {options.map((opt) => (
        <ToggleButton key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
