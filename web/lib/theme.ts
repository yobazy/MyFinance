import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

export function getTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const brand = {
    // Quiet-wealth palette: deep emerald + ink navy, warm neutrals, muted gold.
    primary: {
      main: '#0B7A5A', // emerald
      light: '#2FAE88',
      dark: '#065741',
    },
    secondary: {
      main: '#1F3A5F', // ink navy
      light: '#335C88',
      dark: '#132741',
    },
  } as const;

  return createTheme({
    shape: {
      borderRadius: 16,
    },
    palette: {
      mode,
      primary: brand.primary,
      secondary: brand.secondary,
      background: {
        default: isDark ? '#070B0A' : '#F5F1E8',
        paper: isDark ? '#0C1512' : '#FFFEFC',
      },
      text: {
        primary: isDark ? '#ECE7DC' : '#0B1220',
        secondary: isDark ? '#B8B2A4' : '#4B5563',
      },
      error: { main: '#ef4444' },
      warning: { main: '#C6A15B' }, // muted gold
      success: { main: '#0B7A5A' },
      info: { main: '#2B5D9A' },
      divider: isDark ? alpha('#ECE7DC', 0.10) : alpha('#0B1220', 0.10),
      action: {
        hover: isDark ? alpha('#ECE7DC', 0.06) : alpha('#0B1220', 0.04),
        selected: isDark ? alpha(brand.primary.main, 0.14) : alpha(brand.primary.main, 0.10),
      },
    },
    typography: {
      // `next/font` injects the actual font; this keeps fallbacks sane.
      fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      h1: { fontWeight: 720, letterSpacing: '-0.04em', lineHeight: 1.08 },
      h2: { fontWeight: 720, letterSpacing: '-0.035em', lineHeight: 1.10 },
      h3: { fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.12 },
      h4: { fontWeight: 680, letterSpacing: '-0.02em', lineHeight: 1.18 },
      h5: { fontWeight: 660, letterSpacing: '-0.015em', lineHeight: 1.22 },
      h6: { fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.25 },
      subtitle1: { fontWeight: 620 },
      subtitle2: { fontWeight: 620 },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.5 },
      button: { fontWeight: 650, letterSpacing: '-0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            height: '100%',
          },
          body: {
            height: '100%',
            backgroundColor: isDark ? '#070B0A' : '#F5F1E8',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::selection': {
            backgroundColor: alpha(brand.primary.main, isDark ? 0.30 : 0.22),
          },
          a: {
            color: 'inherit',
            textDecoration: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 650,
            transition: 'transform 140ms ease, background-color 140ms ease, border-color 140ms ease',
            '&:active': {
              transform: 'translateY(0px)',
            },
          },
        },
        defaultProps: {
          disableElevation: true,
          disableRipple: true,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${isDark ? alpha('#ECE7DC', 0.12) : alpha('#0B1220', 0.10)}`,
            boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.45)' : '0 16px 40px rgba(11,18,32,0.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(isDark ? '#0C1512' : '#FFFEFC', isDark ? 0.72 : 0.82),
            backdropFilter: 'blur(12px)',
            color: isDark ? '#ECE7DC' : '#0B1220',
            boxShadow: 'none',
            borderBottom: `1px solid ${isDark ? alpha('#ECE7DC', 0.10) : alpha('#0B1220', 0.08)}`,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 64,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? alpha('#ECE7DC', 0.10) : alpha('#0B1220', 0.08)}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: alpha(isDark ? '#0C1512' : '#FFFEFC', isDark ? 0.70 : 0.92),
            transition: 'box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha('#ECE7DC', 0.14) : alpha('#0B1220', 0.12),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? alpha('#ECE7DC', 0.22) : alpha('#0B1220', 0.18),
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${alpha(brand.primary.main, isDark ? 0.22 : 0.18)}`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(brand.primary.main, 0.8),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 650,
          },
        },
      },
    },
  });
}

