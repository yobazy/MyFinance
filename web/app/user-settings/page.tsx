'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeMode } from '../../lib/themeMode';
import { createBrowserSupabaseClient } from '../../lib/supabase';

export default function UserSettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setKeyLoading(false); return; }

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
    setKeySuccess(false);

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
      setKeySuccess(true);
      setTimeout(() => setKeySuccess(false), 3000);
    }
    setKeySaving(false);
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Theme and account settings.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
            label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Signed in as <b>{user?.email ?? 'Unknown'}</b>
          </Typography>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<LogoutIcon />}
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Integration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your Anthropic API key powers AI categorization, spending insights, and the finance
            assistant. Get a key at{' '}
            <b>console.anthropic.com</b>. It is stored securely and never shared.
          </Typography>

          {keyLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              {hasKey && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main">
                    Key saved: <b>{maskedKey}</b>
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    title="Remove key"
                    onClick={() => saveKey(null)}
                    disabled={keySaving}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              <Box
                component="form"
                onSubmit={(e) => { e.preventDefault(); if (keyInput) saveKey(keyInput); }}
                sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}
              >
                <TextField
                  size="small"
                  label={hasKey ? 'Replace key' : 'Anthropic API key'}
                  placeholder="sk-ant-..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  type={showKey ? 'text' : 'password'}
                  sx={{ minWidth: 320 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowKey((v) => !v)}>
                          {showKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={!keyInput.trim() || keySaving}
                  startIcon={keySaving ? <CircularProgress size={14} /> : <SaveIcon />}
                  sx={{ height: 40 }}
                >
                  Save
                </Button>
              </Box>

              {keyError && (
                <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setKeyError(null)}>
                  {keyError}
                </Alert>
              )}
              {keySuccess && (
                <Alert severity="success" sx={{ mt: 1.5 }}>
                  API key saved successfully.
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
