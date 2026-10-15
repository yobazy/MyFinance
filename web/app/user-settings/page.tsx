'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import Visibility from '@mui/icons-material/VisibilityRounded';
import VisibilityOff from '@mui/icons-material/VisibilityOffRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import DesktopIcon from '@mui/icons-material/DesktopWindowsRounded';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeMode, type ThemePreference } from '../../lib/themeMode';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { initials } from '../../lib/format';
import { monoStack } from '../../lib/theme';
import { PageHeader, SectionCard, SegmentedControl, StatusChip } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

export default function UserSettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const toast = useToast();
  const confirm = useConfirm();

  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setKeyLoading(false);
        return;
      }

      const res = await fetch('/api/user-settings/anthropic-key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setHasKey(body.hasKey);
        setMaskedKey(body.maskedKey);
      }
      setKeyLoading(false);
    }
    load();
  }, [supabase]);

  const saveKey = async (value: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    setKeySaving(true);
    setKeyError(null);

    const res = await fetch('/api/user-settings/anthropic-key', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ apiKey: value }),
    });
    const body = await res.json();

    if (!res.ok) {
      setKeyError(body.error ?? 'Failed to save');
    } else {
      setHasKey(!!value);
      setMaskedKey(value ? `sk-ant-...${value.slice(-4)}` : null);
      setKeyInput('');
      toast.success(value ? 'API key saved.' : 'API key removed.');
    }
    setKeySaving(false);
  };

  const handleRemoveKey = async () => {
    const ok = await confirm({
      title: 'Remove API key?',
      description: 'AI categorization, insights and the assistant will stop working until you add a new key.',
      confirmLabel: 'Remove key',
      destructive: true,
    });
    if (ok) await saveKey(null);
  };

  const email = user?.email ?? 'Unknown';
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? email.split('@')[0];

  const themeOptions: { value: ThemePreference; label: React.ReactNode }[] = [
    {
      value: 'light',
      label: (
        <Stack direction="row" alignItems="center" gap={0.75}>
          <LightModeIcon sx={{ fontSize: 16 }} /> Light
        </Stack>
      ),
    },
    {
      value: 'dark',
      label: (
        <Stack direction="row" alignItems="center" gap={0.75}>
          <DarkModeIcon sx={{ fontSize: 16 }} /> Dark
        </Stack>
      ),
    },
    {
      value: 'system',
      label: (
        <Stack direction="row" alignItems="center" gap={0.75}>
          <DesktopIcon sx={{ fontSize: 16 }} /> System
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 760 }}>
      <PageHeader title="Settings" description="Appearance, account, and integrations." />

      <Stack spacing={3}>
        <SectionCard title="Appearance" description="Choose a theme or follow your system setting.">
          <SegmentedControl value={preference} onChange={setPreference} options={themeOptions} aria-label="Theme" />
        </SectionCard>

        <SectionCard title="Account">
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Avatar
                src={(user?.user_metadata?.avatar_url as string | undefined) ?? undefined}
                sx={{ width: 44, height: 44, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
              >
                {initials((user?.user_metadata?.full_name as string | undefined) || email)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {email}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
            >
              Sign out
            </Button>
          </Stack>
        </SectionCard>

        <SectionCard
          title="AI integration"
          description="Your Anthropic API key powers AI categorization, spending insights, and the assistant. It is stored encrypted and never shared."
          action={keyLoading ? <Skeleton width={96} height={24} /> : <StatusChip status={hasKey ? 'succeeded' : 'inactive'} label={hasKey ? 'Connected' : 'Not connected'} />}
        >
          {keyLoading ? (
            <Stack spacing={1.5}>
              <Skeleton width="40%" height={20} />
              <Skeleton width="100%" height={40} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {hasKey ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                  sx={{ px: 1.5, py: 1, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Current key
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: monoStack, fontSize: '0.8rem' }} noWrap>
                      {maskedKey}
                    </Typography>
                  </Box>
                  <Button size="small" color="inherit" startIcon={<DeleteIcon />} onClick={() => void handleRemoveKey()} disabled={keySaving} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    Remove
                  </Button>
                </Stack>
              ) : null}

              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (keyInput) void saveKey(keyInput);
                }}
                sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}
              >
                <TextField
                  size="small"
                  label={hasKey ? 'Replace key' : 'Anthropic API key'}
                  placeholder="sk-ant-…"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  sx={{ flex: 1, minWidth: 260 }}
                  InputProps={{
                    sx: { fontFamily: monoStack, fontSize: '0.85rem' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide key' : 'Show key'}>
                          {showKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!keyInput.trim() || keySaving}
                  startIcon={keySaving ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ height: 40 }}
                >
                  {hasKey ? 'Replace' : 'Save key'}
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Create a key at console.anthropic.com. Keys start with <Box component="span" sx={{ fontFamily: monoStack }}>sk-ant-</Box>.
              </Typography>

              {keyError ? (
                <Alert severity="error" onClose={() => setKeyError(null)}>
                  {keyError}
                </Alert>
              ) : null}
            </Stack>
          )}
        </SectionCard>
      </Stack>
    </Box>
  );
}
