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
  const [emailMode, setEmailMode] = React.useState<'signin' | 'signup'>('signin');
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
        setMessage({
          severity: 'success',
          text: needsEmailConfirmation
            ? 'Account created. Check your email to confirm your address, then sign in.'
            : 'Account created. Signing you in…',
        });
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
              ? `radial-gradient(1200px 800px at 15% 10%, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 60%),
                 radial-gradient(900px 700px at 85% 30%, ${alpha(theme.palette.warning.main, 0.12)} 0%, transparent 55%),
                 radial-gradient(1000px 800px at 50% 100%, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 60%)`
              : `radial-gradient(1200px 800px at 15% 10%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 60%),
                 radial-gradient(900px 700px at 85% 30%, ${alpha(theme.palette.warning.main, 0.10)} 0%, transparent 55%),
                 radial-gradient(1000px 800px at 50% 100%, ${alpha(theme.palette.secondary.main, 0.10)} 0%, transparent 60%)`,
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: mode === 'dark' ? 0.18 : 0.12,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 7px)',
          mixBlendMode: mode === 'dark' ? 'overlay' : 'multiply',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 4, md: 7 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 6, md: 10 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/logo_dark.svg' : '/logo_light.svg'}
              alt="MyFinance"
              sx={{
                height: 28,
                width: 'auto',
              }}
            />
            <Chip
              size="small"
              label="Beta"
              sx={{
                fontWeight: 650,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.22 : 0.12),
                color: 'text.primary',
                border: `1px solid ${alpha(theme.palette.primary.main, mode === 'dark' ? 0.35 : 0.22)}`,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Personal finance, without the mess
            </Typography>
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
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
            gap: { xs: 6, md: 10 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontSize: { xs: 42, sm: 52, md: 58 },
                lineHeight: 1.03,
                mb: 2,
              }}
            >
              Your money,
              <Box component="span" sx={{ color: 'primary.main' }}>
                {' '}
                beautifully organized.
              </Box>
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 620, mb: 4, fontWeight: 500 }}>
              Upload statements, categorize automatically, and get a clear view of spending across accounts — with a
              clean dashboard you’ll actually enjoy using.
            </Typography>

            <Stack spacing={2.25} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 36,
                    height: 36,
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.25 }}>
                    Private by default
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                    Your data stays in your account. Sign in with OAuth or email/password and manage access with
                    Supabase auth + RLS.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 36,
                    height: 36,
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.25 }}>
                    Faster categorization
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                    Tag transactions consistently and keep your budgets clean — with rules you control.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 36,
                    height: 36,
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 0.25 }}>
                    Clear insights
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                    Understand trends at a glance — monthly spending, balances, and recent activity in one place.
                  </Typography>
                </Box>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Works with statement exports from:
              </Typography>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src="/bank_td_icon.svg"
                  alt="TD"
                  sx={{
                    height: 22,
                    width: 'auto',
                    filter: mode === 'dark' ? 'grayscale(100%) brightness(1.2)' : 'grayscale(100%) opacity(0.8)',
                  }}
                />
                <Box
                  component="img"
                  src="/bank_scotia_icon.svg"
                  alt="Scotiabank"
                  sx={{
                    height: 22,
                    width: 'auto',
                    filter: mode === 'dark' ? 'grayscale(100%) brightness(1.2)' : 'grayscale(100%) opacity(0.8)',
                  }}
                />
                <Box
                  component="img"
                  src="/bank_amex_icon.svg"
                  alt="American Express"
                  sx={{
                    height: 22,
                    width: 'auto',
                    filter: mode === 'dark' ? 'grayscale(100%) brightness(1.2)' : 'grayscale(100%) opacity(0.8)',
                  }}
                />
              </Stack>
            </Stack>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 3.5 },
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, mode === 'dark' ? 0.9 : 0.7)}`,
              bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.35 : 0.7),
              backdropFilter: 'blur(12px)',
              boxShadow:
                mode === 'dark'
                  ? '0 20px 60px rgba(0,0,0,0.55)'
                  : '0 20px 60px rgba(15,23,42,0.14)',
            }}
          >
            <Typography variant="h5" component="h2" sx={{ mb: 0.75 }}>
              {emailMode === 'signin' ? 'Sign in' : 'Create account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {emailMode === 'signin'
                ? 'Continue with a provider or email/password to access your dashboard.'
                : 'Create an account with email/password, or continue with a provider.'}
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
                {loggingIn === 'google' ? 'Signing in…' : 'Continue with Google'}
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
                {loggingIn === 'github' ? 'Signing in…' : 'Continue with GitHub'}
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }}>or</Divider>

            <Box component="form" onSubmit={handleEmailAuth}>
              <Stack spacing={1.5}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  fullWidth
                  size="medium"
                  disabled={emailSubmitting || !!loggingIn}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
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

                <Button
                  variant="text"
                  onClick={() => {
                    setMessage(null);
                    setEmailMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                  }}
                  disabled={emailSubmitting || !!loggingIn}
                  sx={{ textTransform: 'none' }}
                >
                  {emailMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary">
              By continuing, you agree to store your imported statements in your own workspace.
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

