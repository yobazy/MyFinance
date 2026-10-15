'use client';

import React from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceRounded';

const LOGOS: Record<string, { src: string; alt: string; label: string }> = {
  AMEX: { src: '/bank_amex_icon.svg', alt: 'American Express', label: 'American Express' },
  'AMERICAN EXPRESS': { src: '/bank_amex_icon.svg', alt: 'American Express', label: 'American Express' },
  TD: { src: '/bank_td_icon.svg', alt: 'TD Bank', label: 'TD Bank' },
  SCOTIA: { src: '/bank_scotia_icon.svg', alt: 'Scotiabank', label: 'Scotiabank' },
  SCOTIABANK: { src: '/bank_scotia_icon.svg', alt: 'Scotiabank', label: 'Scotiabank' },
};

export function bankDisplayName(bank: string | null | undefined): string {
  if (!bank) return 'Bank';
  return LOGOS[bank.toUpperCase()]?.label ?? bank;
}

/** Bank mark in a rounded tile; falls back to a generic bank icon. */
export default function BankLogo(props: { bank: string | null | undefined; size?: number; sx?: object }) {
  const { bank, size = 36, sx } = props;
  const theme = useTheme();
  const logo = bank ? LOGOS[bank.toUpperCase()] : undefined;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: size / 4,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.06) : '#F1F3F6',
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {logo ? (
        <Box component="img" src={logo.src} alt={logo.alt} sx={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} />
      ) : (
        <AccountBalanceIcon sx={{ fontSize: size * 0.5, color: 'text.secondary' }} />
      )}
    </Box>
  );
}
