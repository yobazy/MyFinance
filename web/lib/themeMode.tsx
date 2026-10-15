'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export const THEME_STORAGE_KEY = 'theme';

type ThemeModeContextValue = {
  /** Resolved mode actually applied to the UI. */
  mode: ThemeMode;
  /** What the user picked: light, dark, or follow the OS. */
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

function systemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): ThemeMode {
  return pref === 'system' ? systemMode() : pref;
}

/**
 * Inline script that runs before hydration so the first paint already uses the
 * right color scheme (no light flash on dark mode). Mirrors `resolve()` above.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var m=(p==='light'||p==='dark')?p:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',m);document.documentElement.style.colorScheme=m;}catch(e){}})();`;

export function ThemeModeProvider(props: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Hydrate from storage / OS on mount.
  useEffect(() => {
    const pref = readStoredPreference();
    setPreferenceState(pref);
    setModeState(resolve(pref));
  }, []);

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setModeState(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  // Reflect the resolved mode on <html> for CSS + native controls.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    setModeState(resolve(pref));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('themeChange', { detail: pref }));
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      preference,
      setPreference,
      setMode: (next) => setPreference(next),
      toggleMode: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, preference, setPreference]
  );

  return <ThemeModeContext.Provider value={value}>{props.children}</ThemeModeContext.Provider>;
}
