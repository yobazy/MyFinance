'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { createBrowserSupabaseClient } from '../../../lib/supabase';
import { getSafeNextPath } from '../../../lib/auth/redirect';

type OtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change';

function isOtpType(v: string): v is OtpType {
  return v === 'signup' || v === 'invite' || v === 'magiclink' || v === 'recovery' || v === 'email_change';
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const next = getSafeNextPath(sp.get('next'));

        const errorDescription = sp.get('error_description') || sp.get('error');
        if (errorDescription) throw new Error(errorDescription);

        const code = sp.get('code');
        const tokenHash = sp.get('token_hash');
        const type = sp.get('type');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          if (!isOtpType(type)) throw new Error(`Unsupported auth callback type: ${type}`);
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        }

        if (!cancelled) router.replace(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%' }}>
        {error ? (
          <Stack spacing={2}>
            <Alert severity="error">{error}</Alert>
            <Button variant="contained" onClick={() => router.replace('/login')}>
              Back to login
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2} alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Finishing sign-in…
            </Typography>
          </Stack>
        )}
      </Box>
    </Container>
  );
}

