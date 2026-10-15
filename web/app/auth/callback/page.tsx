'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CircularProgress, Stack, Typography } from '@mui/material';
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
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Stack spacing={2.5} alignItems="center" textAlign="center">
          <Box component="img" src="/logo_mini.svg" alt="MyFinance" sx={{ width: 40, height: 40 }} />
          {error ? (
            <>
              <Typography variant="h5">Sign-in didn’t complete</Typography>
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                {error}
              </Alert>
              <Button variant="contained" fullWidth onClick={() => router.replace('/login')}>
                Back to login
              </Button>
            </>
          ) : (
            <>
              <CircularProgress size={28} />
              <Box>
                <Typography variant="h6">Finishing sign-in…</Typography>
                <Typography variant="body2" color="text.secondary">
                  You’ll be redirected in a moment.
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
