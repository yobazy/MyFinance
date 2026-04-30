'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../lib/auth/AuthContext';
import { getSafeNextPath } from '../../lib/auth/redirect';
import { useThemeMode } from '../../lib/themeMode';

export default function PublicLanding(props: { redirectIfAuthenticated?: boolean }) {
  const { signInWithOAuth, signInWithPassword, signUpWithPassword, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const [loggingIn, setLoggingIn] = React.useState<'google' | 'github' | null>(null);
  const defaultEmailMode = props.redirectIfAuthenticated ? 'signin' : 'signup';
  const [emailMode, setEmailMode] = React.useState<'signin' | 'signup'>(defaultEmailMode);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [emailSubmitting, setEmailSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ severity: 'error' | 'success' | 'info'; text: string } | null>(
    null
  );

  React.useEffect(() => {
    if (!props.redirectIfAuthenticated || !isAuthenticated) return;
    const sp = new URLSearchParams(window.location.search);
    const next = getSafeNextPath(sp.get('next'));
    router.push(next);
  }, [isAuthenticated, props.redirectIfAuthenticated, router]);

  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const next = getSafeNextPath(sp.get('next'));
      setLoggingIn(provider);
      await signInWithOAuth(provider, next);
      // Supabase OAuth redirects; if it doesn't, clear spinner.
      setLoggingIn(null);
    } catch (e) {
      console.error(e);
      setLoggingIn(null);
    }
  };

  const handleEmailAuth = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMessage(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage({ severity: 'error', text: 'Please enter your email.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ severity: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (emailMode === 'signup' && password !== confirmPassword) {
      setMessage({ severity: 'error', text: "Passwords don't match." });
      return;
    }

    try {
      setEmailSubmitting(true);
      const sp = new URLSearchParams(window.location.search);
      const next = getSafeNextPath(sp.get('next'));
      if (emailMode === 'signin') {
        await signInWithPassword(normalizedEmail, password);
      } else {
        const { needsEmailConfirmation } = await signUpWithPassword(normalizedEmail, password, next);
        setPassword('');
        setConfirmPassword('');
        setMessage({
          severity: needsEmailConfirmation ? 'info' : 'success',
          text: needsEmailConfirmation
            ? 'Check your email to confirm your address. Once that is done, sign in here.'
            : 'Account created. Signing you in…',
        });
        if (needsEmailConfirmation) {
          setEmailMode('signin');
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({ severity: 'error', text });
    } finally {
      setEmailSubmitting(false);
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
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            mode === 'dark'
              ? `radial-gradient(900px 600px at 12% 8%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 60%),
                 radial-gradient(700px 500px at 82% 20%, ${alpha(theme.palette.secondary.main, 0.10)} 0%, transparent 60%)`
              : `radial-gradient(900px 600px at 12% 8%, ${alpha(theme.palette.primary.main, 0.10)} 0%, transparent 60%),
                 radial-gradient(700px 500px at 82% 20%, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 60%)`,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 4, md: 6 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/logo_dark.svg' : '/logo_light.svg'}
              alt="MyFinance"
              sx={{
                height: 72,
                width: 'auto',
              }}
            />
          </Box>

          <IconButton
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleMode}
              sx={{
                border: `1px solid ${alpha(theme.palette.divider, mode === 'dark' ? 0.9 : 0.7)}`,
                bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.35 : 0.6),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.45 : 0.75),
                },
              }}
            >
              {mode === 'dark' ? (
                <LightModeOutlinedIcon fontSize="small" />
              ) : (
                <DarkModeOutlinedIcon fontSize="small" />
              )}
            </IconButton>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            gap: { xs: 5, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Chip
              size="small"
              label="Private beta"
              sx={{
                mb: 2,
                fontWeight: 650,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.18 : 0.10),
                color: 'text.primary',
                border: `1px solid ${alpha(theme.palette.primary.main, mode === 'dark' ? 0.30 : 0.18)}`,
              }}
            />
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontSize: { xs: 40, sm: 50, md: 56 },
                lineHeight: 1.02,
                mb: 2,
                maxWidth: 620,
              }}
            >
              A calmer home for your money.
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, mb: 4, fontWeight: 500 }}>
              Track spending, import transactions, and keep everything tidy without turning the app into a spreadsheet.
            </Typography>

            <Stack spacing={2} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.22 : 0.12),
                    border: `1px solid ${alpha(theme.palette.primary.main, mode === 'dark' ? 0.35 : 0.22)}`,
                  }}
                >
                  <LockOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.2 }}>
                    Private by default
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                    Your data stays in your workspace with Supabase auth and row-level security behind the scenes.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(theme.palette.success.main, mode === 'dark' ? 0.18 : 0.10),
                    border: `1px solid ${alpha(theme.palette.success.main, mode === 'dark' ? 0.32 : 0.18)}`,
                  }}
                >
                  <CategoryOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.2 }}>
                    Less cleanup work
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                    Rules help keep categories consistent, so you spend less time fixing transaction history by hand.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, mode === 'dark' ? 0.18 : 0.10),
                    border: `1px solid ${alpha(theme.palette.secondary.main, mode === 'dark' ? 0.32 : 0.18)}`,
                  }}
                >
                  <AutoGraphOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.2 }}>
                    Clean reporting
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                    See spending, balances, and recent activity in one place, without a crowded dashboard.
                  </Typography>
                </Box>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              Plaid handles bank connections. Manual uploads are available for Amex statements today.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 3.5 },
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, mode === 'dark' ? 0.9 : 0.7)}`,
              bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.52 : 0.82),
              backdropFilter: 'blur(12px)',
              boxShadow:
                mode === 'dark'
                  ? '0 20px 60px rgba(0,0,0,0.45)'
                  : '0 18px 50px rgba(15,23,42,0.10)',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant={emailMode === 'signup' ? 'contained' : 'text'}
                onClick={() => {
                  setMessage(null);
                  setPassword('');
                  setConfirmPassword('');
                  setEmailMode('signup');
                }}
                disabled={emailSubmitting || !!loggingIn}
                sx={{ textTransform: 'none' }}
              >
                Create account
              </Button>
              <Button
                fullWidth
                variant={emailMode === 'signin' ? 'contained' : 'text'}
                onClick={() => {
                  setMessage(null);
                  setPassword('');
                  setConfirmPassword('');
                  setEmailMode('signin');
                }}
                disabled={emailSubmitting || !!loggingIn}
                sx={{ textTransform: 'none' }}
              >
                Sign in
              </Button>
            </Stack>
            <Typography variant="h5" component="h2" sx={{ mb: 0.75 }}>
              {emailMode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {emailMode === 'signin'
                ? 'Use a provider or email to get back to your dashboard.'
                : 'Start with Google, GitHub, or email. Setup takes about a minute.'}
            </Typography>

            <Stack spacing={1.5}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={
                  loggingIn === 'google' ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />
                }
                onClick={() => handleLogin('google')}
                disabled={!!loggingIn || emailSubmitting}
                sx={{
                  justifyContent: 'center',
                  py: 1.25,
                }}
              >
                {loggingIn === 'google' ? 'Signing in…' : emailMode === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
              </Button>

              <Button
                fullWidth
                size="large"
                variant="outlined"
                startIcon={
                  loggingIn === 'github' ? <CircularProgress size={18} color="inherit" /> : <GitHubIcon />
                }
                onClick={() => handleLogin('github')}
                disabled={!!loggingIn || emailSubmitting}
                sx={{
                  py: 1.25,
                  borderColor: alpha(theme.palette.text.primary, mode === 'dark' ? 0.28 : 0.18),
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.18 : 0.35),
                  '&:hover': {
                    borderColor: alpha(theme.palette.text.primary, mode === 'dark' ? 0.40 : 0.26),
                    bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.24 : 0.48),
                  },
                }}
              >
                {loggingIn === 'github' ? 'Signing in…' : emailMode === 'signup' ? 'Continue with GitHub' : 'Sign in with GitHub'}
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }}>or</Divider>

            <Box component="form" onSubmit={handleEmailAuth}>
              <Stack spacing={1.5}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (message) setMessage(null);
                  }}
                  autoComplete="email"
                  fullWidth
                  size="medium"
                  disabled={emailSubmitting || !!loggingIn}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (message) setMessage(null);
                  }}
                  autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                  fullWidth
                  size="medium"
                  disabled={emailSubmitting || !!loggingIn}
                />
                {emailMode === 'signup' ? (
                  <TextField
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (message) setMessage(null);
                    }}
                    autoComplete="new-password"
                    fullWidth
                    size="medium"
                    disabled={emailSubmitting || !!loggingIn}
                  />
                ) : null}

                {message ? <Alert severity={message.severity}>{message.text}</Alert> : null}

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  type="submit"
                  disabled={emailSubmitting || !!loggingIn}
                  startIcon={emailSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.25 }}
                >
                  {emailSubmitting
                    ? emailMode === 'signin'
                      ? 'Signing in…'
                      : 'Creating account…'
                    : emailMode === 'signin'
                      ? 'Sign in with email'
                      : 'Create account'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Imported data stays in your own workspace.
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mt: { xs: 8, md: 12 }, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Built for clarity. Designed to feel calm.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} MyFinance
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

