'use client';

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { formatMoney } from '../../../lib/format';

type Entry = { name?: string; value?: number; color?: string; fill?: string; payload?: Record<string, unknown> };

type ChartTooltipProps = {
  active?: boolean;
  payload?: Entry[];
  label?: React.ReactNode;
  /** Custom value formatter (defaults to money). */
  format?: (value: number, entry: Entry) => string;
  /** Hide the series name (single-series charts). */
  hideName?: boolean;
};

/** Themed Recharts tooltip. Pass as `<ReTooltip content={<ChartTooltip />} />`. */
export default function ChartTooltip(props: ChartTooltipProps) {
  const { active, payload, label, format, hideName } = props;
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        px: 1.5,
        py: 1.25,
        minWidth: 140,
        boxShadow: (t) => (t.palette.mode === 'dark' ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 32px rgba(15,23,42,0.12)'),
      }}
    >
      {label != null && label !== '' ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
          {label}
        </Typography>
      ) : null}
      <Stack spacing={0.5}>
        {payload.map((entry, i) => {
          const value = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
          const text = format ? format(value, entry) : formatMoney(Math.abs(value));
          return (
            <Stack key={`${entry.name}-${i}`} direction="row" alignItems="center" justifyContent="space-between" gap={2}>
              <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color ?? entry.fill ?? 'primary.main', flexShrink: 0 }} />
                {!hideName ? (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {entry.name}
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 650 }}>
                {text}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
