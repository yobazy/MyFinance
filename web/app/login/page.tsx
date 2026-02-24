'use client';

import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useAuth } from '../../lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signInWithOAuth, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = React.useState<'google' | 'github' | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      setLoggingIn(provider);
      await signInWithOAuth(provider);
      // Supabase OAuth redirects; if it doesn't, clear spinner.
      setLoggingIn(null);
    } catch (e) {
      console.error(e);
      setLoggingIn(null);
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          MyFinance Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign in to manage your finances
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              loggingIn === 'google' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GoogleIcon />
              )
            }
            onClick={() => handleLogin('google')}
            disabled={!!loggingIn}
            sx={{
              backgroundColor: '#4285F4',
              '&:hover': { backgroundColor: '#357AE8' },
            }}
          >
            {loggingIn === 'google' ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={
              loggingIn === 'github' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GitHubIcon />
              )
            }
            onClick={() => handleLogin('github')}
            disabled={!!loggingIn}
            sx={{
              backgroundColor: '#24292e',
              '&:hover': { backgroundColor: '#1a1e22' },
            }}
          >
            {loggingIn === 'github' ? 'Signing in...' : 'Sign in with GitHub'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

