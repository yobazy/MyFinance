'use client';

import React from 'react';
import NextLink from 'next/link';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceRounded';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongRounded';
import UploadFileIcon from '@mui/icons-material/UploadFileRounded';
import CategoryIcon from '@mui/icons-material/CategoryRounded';
import RuleIcon from '@mui/icons-material/RuleRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { PageHeader, SectionCard } from '../components/ui';

const STEPS = [
  { title: 'Add an account', body: 'Create one account per bank card or chequing account. Everything else attaches to it.' },
  { title: 'Bring in transactions', body: 'Connect Plaid from the account card, or upload an Amex statement.' },
  { title: 'Load categories', body: 'Apply a preset under Categories so suggestions have something to match.' },
  { title: 'Review suggestions', body: 'Generate suggestions from Transactions, then accept or adjust them in Review.' },
];

const PLACES = [
  { href: '/accounts', icon: <AccountBalanceIcon />, label: 'Accounts', hint: 'Add, edit, and connect banks' },
  { href: '/transactions', icon: <ReceiptLongIcon />, label: 'Transactions', hint: 'Search, filter, export' },
  { href: '/upload', icon: <UploadFileIcon />, label: 'Upload statement', hint: 'Manual Amex imports' },
  { href: '/uploads', icon: <HistoryIcon />, label: 'Upload history', hint: 'Undo an import' },
  { href: '/categorization', icon: <CategoryIcon />, label: 'Categories', hint: 'Presets and custom labels' },
  { href: '/rules', icon: <RuleIcon />, label: 'Rules', hint: 'How auto-categorization decides' },
  { href: '/insights', icon: <AutoAwesomeIcon />, label: 'Insights', hint: 'Summaries, charts, assistant' },
  { href: '/user-settings', icon: <SettingsIcon />, label: 'Settings', hint: 'Theme and API key' },
];

const TROUBLESHOOTING = [
  'Signed-in but pages are empty? Sign out and back in from Settings to refresh your session.',
  'AI features need an Anthropic API key. Add one under Settings → AI integration.',
  'Imports that look wrong can be reversed from Upload history without touching other data.',
  'Plaid only imports into an existing account. Create the account first, then connect.',
];

export default function HelpPage() {
  const theme = useTheme();
  return (
    <Box>
      <PageHeader title="Help" description="Quick answers for setup and everyday use." />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <SectionCard title="Getting started">
          <Stack spacing={2}>
            {STEPS.map((step, i) => (
              <Stack key={step.title} direction="row" gap={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                  }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Typography variant="subtitle2">{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.body}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </SectionCard>

        <Stack spacing={3}>
          <SectionCard title="Where things live" disablePadding divider>
            <Stack divider={<Divider />}>
              {PLACES.map((p) => (
                <Box
                  key={p.href}
                  component={NextLink}
                  href={p.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.25,
                    color: 'text.primary',
                    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                    '& .arrow': { opacity: 0, transition: 'opacity 120ms ease, transform 120ms ease' },
                    '&:hover .arrow': { opacity: 1, transform: 'translateX(2px)' },
                  }}
                >
                  <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 20 } }}>{p.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.hint}
                    </Typography>
                  </Box>
                  <ArrowForwardIcon className="arrow" sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Box>
              ))}
            </Stack>
          </SectionCard>

          <SectionCard title="Troubleshooting">
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
              {TROUBLESHOOTING.map((line) => (
                <Typography key={line} component="li" variant="body2">
                  {line}
                </Typography>
              ))}
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
    </Box>
  );
}
