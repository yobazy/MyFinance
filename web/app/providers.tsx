'use client';

import React, { useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { getTheme } from '../lib/theme';
import { ThemeModeProvider, useThemeMode } from '../lib/themeMode';
import { AuthProvider } from '../lib/auth/AuthContext';
import AppShell from './components/AppShell';

function InnerProviders(props: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell>{props.children}</AppShell>
    </ThemeProvider>
  );
}

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeModeProvider>
        <InnerProviders>{props.children}</InnerProviders>
      </ThemeModeProvider>
    </AuthProvider>
  );
}

