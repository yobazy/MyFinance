import { alpha, createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

/**
 * Design tokens.
 *
 * The palette keeps the "quiet wealth" idea (deep emerald + ink) but leans on
 * neutral surfaces, hairline borders and restrained shadows so the product
 * reads like a modern finance tool rather than a Material demo.
 */
const brand = {
  emerald: '#0F8A63',
  emeraldLight: '#2FAE88',
  emeraldDark: '#0A6B4C',
  ink: '#1B2A41',
  inkLight: '#3A4E6B',
  gold: '#C9A24E',
  red: '#E5484D',
  blue: '#3B82F6',
} as const;

const light = {
  bg: '#F6F7F9',
  paper: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#5B6B7F',
  textDisabled: '#9AA5B4',
  border: alpha('#0F172A', 0.08),
  borderStrong: alpha('#0F172A', 0.14),
} as const;

const dark = {
  bg: '#0B0F14',
  paper: '#121821',
  elevated: '#161E29',
  text: '#E7ECF3',
  textSecondary: '#9FAEC1',
  textDisabled: '#66768A',
  border: alpha('#E7ECF3', 0.08),
  borderStrong: alpha('#E7ECF3', 0.14),
} as const;

export const fontStack =
  'var(--font-inter), "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export const monoStack =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** Chart series palette, tuned to work on both light and dark surfaces. */
export const chartPalette = [
  '#0F8A63',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#E5484D',
] as const;

export function getTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';
  const t = isDark ? dark : light;

  const focusRing = `0 0 0 3px ${alpha(brand.emerald, isDark ? 0.35 : 0.22)}`;

  return createTheme({
    shape: { borderRadius: 12 },
    spacing: 8,
    palette: {
      mode,
      primary: {
        main: brand.emerald,
        light: brand.emeraldLight,
        dark: brand.emeraldDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: brand.ink,
        light: brand.inkLight,
        dark: '#101B2C',
        contrastText: '#FFFFFF',
      },
      background: { default: t.bg, paper: t.paper },
      text: { primary: t.text, secondary: t.textSecondary, disabled: t.textDisabled },
      error: { main: brand.red },
      warning: { main: brand.gold, contrastText: '#1B1B1B' },
      success: { main: brand.emerald },
      info: { main: brand.blue },
      divider: t.border,
      action: {
        hover: alpha(t.text, isDark ? 0.06 : 0.04),
        selected: alpha(brand.emerald, isDark ? 0.16 : 0.1),
        focus: alpha(brand.emerald, 0.18),
        disabledBackground: alpha(t.text, 0.06),
      },
    },
    typography: {
      fontFamily: fontStack,
      fontSize: 14,
      h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1 },
      h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 },
      h3: { fontSize: '1.625rem', fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.2 },
      h4: { fontSize: '1.375rem', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.25 },
      h5: { fontSize: '1.125rem', fontWeight: 620, letterSpacing: '-0.015em', lineHeight: 1.3 },
      h6: { fontSize: '1rem', fontWeight: 620, letterSpacing: '-0.01em', lineHeight: 1.35 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.01em' },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 650,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
      },
      button: { fontWeight: 600, letterSpacing: '-0.005em', textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { height: '100%', colorScheme: mode },
          body: {
            height: '100%',
            backgroundColor: t.bg,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
          },
          '::selection': { backgroundColor: alpha(brand.emerald, isDark ? 0.35 : 0.22) },
          a: { color: 'inherit', textDecoration: 'none' },
          '*:focus-visible': { outline: 'none', boxShadow: focusRing, borderRadius: 8 },
          '.tabular-nums': { fontVariantNumeric: 'tabular-nums' },
          '@keyframes mf-fade-up': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
            },
          },
          '::-webkit-scrollbar': { width: 10, height: 10 },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(t.text, 0.16),
            borderRadius: 999,
            border: `2px solid ${t.bg}`,
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            paddingInline: 14,
            minHeight: 36,
            transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease',
            '&:focus-visible': { boxShadow: focusRing },
          },
          sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: '0.8125rem' },
          sizeLarge: { minHeight: 44, paddingInline: 18, fontSize: '0.9375rem' },
          contained: {
            boxShadow: isDark ? 'none' : `inset 0 -1px 0 ${alpha('#000', 0.12)}`,
            '&:hover': { boxShadow: 'none' },
          },
          outlined: {
            borderColor: t.borderStrong,
            backgroundColor: isDark ? alpha(t.paper, 0.5) : t.paper,
            '&:hover': { borderColor: alpha(t.text, 0.28), backgroundColor: alpha(t.text, 0.03) },
          },
          outlinedInherit: { color: t.text },
          text: { '&:hover': { backgroundColor: alpha(t.text, 0.05) } },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'background-color 120ms ease, color 120ms ease',
            '&:focus-visible': { boxShadow: focusRing },
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.border },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${t.border}`,
            backgroundColor: t.paper,
            boxShadow: isDark ? 'none' : `0 1px 2px ${alpha('#0F172A', 0.04)}`,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundColor: alpha(t.bg, 0.8),
            backdropFilter: 'saturate(180%) blur(12px)',
            color: t.text,
            borderBottom: `1px solid ${t.border}`,
          },
        },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: 56 } } },

      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundImage: 'none', borderRight: `1px solid ${t.border}` },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? alpha(t.elevated, 0.7) : t.paper,
            transition: 'box-shadow 120ms ease, border-color 120ms ease',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.borderStrong },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(t.text, 0.28) },
            '&.Mui-focused': { boxShadow: focusRing },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brand.emerald,
              borderWidth: 1,
            },
          },
          input: { paddingBlock: 11 },
          inputSizeSmall: { paddingBlock: 7.5 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '0.9rem', '&.Mui-focused': { color: brand.emerald } },
        },
      },
      MuiSelect: { styleOverrides: { icon: { color: t.textSecondary } } },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 560,
            height: 26,
            fontSize: '0.78rem',
          },
          sizeSmall: { height: 22, fontSize: '0.72rem' },
          label: { paddingInline: 10 },
          labelSmall: { paddingInline: 8 },
          outlined: { borderColor: t.borderStrong },
          filled: { '&.MuiChip-colorDefault': { backgroundColor: alpha(t.text, isDark ? 0.1 : 0.06) } },
        },
      },

      MuiTableContainer: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: isDark ? alpha(t.elevated, 0.9) : '#FAFBFC',
              color: t.textSecondary,
              fontSize: '0.72rem',
              fontWeight: 650,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${t.border}`,
              whiteSpace: 'nowrap',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${t.border}`, paddingBlock: 12, paddingInline: 16 },
          sizeSmall: { paddingBlock: 9, paddingInline: 12 },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child .MuiTableCell-root': { borderBottom: 0 },
            '&.MuiTableRow-hover:hover': { backgroundColor: alpha(t.text, isDark ? 0.05 : 0.03) },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            '&.Mui-active': { color: t.text },
            '& .MuiTableSortLabel-icon': { fontSize: 14 },
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            boxShadow: isDark
              ? '0 16px 40px rgba(0,0,0,0.5)'
              : '0 12px 32px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)',
            marginTop: 6,
          },
          list: { padding: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.875rem',
            minHeight: 36,
            paddingInline: 10,
            '&.Mui-selected': { backgroundColor: alpha(brand.emerald, isDark ? 0.18 : 0.1) },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 32, color: t.textSecondary } } },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(15,23,42,0.18)',
            backgroundImage: 'none',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: '1.0625rem', fontWeight: 650, padding: '20px 24px 8px' } },
      },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '8px 24px 20px', gap: 8 } } },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(isDark ? '#000' : '#0F172A', isDark ? 0.6 : 0.4),
            backdropFilter: 'blur(2px)',
            '&.MuiBackdrop-invisible': { backgroundColor: 'transparent', backdropFilter: 'none' },
          },
        },
      },

      MuiAlert: {
        defaultProps: { variant: 'standard' },
        styleOverrides: {
          root: { borderRadius: 12, fontSize: '0.875rem', alignItems: 'flex-start' },
          standardInfo: {
            backgroundColor: alpha(brand.blue, isDark ? 0.14 : 0.08),
            color: t.text,
            border: `1px solid ${alpha(brand.blue, 0.24)}`,
          },
          standardSuccess: {
            backgroundColor: alpha(brand.emerald, isDark ? 0.14 : 0.08),
            color: t.text,
            border: `1px solid ${alpha(brand.emerald, 0.24)}`,
          },
          standardWarning: {
            backgroundColor: alpha(brand.gold, isDark ? 0.14 : 0.1),
            color: t.text,
            border: `1px solid ${alpha(brand.gold, 0.32)}`,
          },
          standardError: {
            backgroundColor: alpha(brand.red, isDark ? 0.14 : 0.08),
            color: t.text,
            border: `1px solid ${alpha(brand.red, 0.24)}`,
          },
          icon: { paddingTop: 9 },
        },
      },

      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 300 },
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#E7ECF3' : '#0F172A',
            color: isDark ? '#0F172A' : '#FFFFFF',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 8,
            padding: '6px 10px',
          },
          arrow: { color: isDark ? '#E7ECF3' : '#0F172A' },
        },
      },

      MuiSkeleton: {
        styleOverrides: { root: { borderRadius: 8, backgroundColor: alpha(t.text, isDark ? 0.08 : 0.06) } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 999, backgroundColor: alpha(t.text, 0.08) },
          bar: { borderRadius: 999 },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
      MuiPagination: { defaultProps: { shape: 'rounded' } },
      MuiPaginationItem: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(t.text, isDark ? 0.06 : 0.04),
            borderRadius: 10,
            padding: 3,
            gap: 2,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 0,
            borderRadius: '8px !important',
            paddingBlock: 4,
            paddingInline: 12,
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: t.textSecondary,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: t.paper,
              color: t.text,
              boxShadow: isDark ? `0 0 0 1px ${t.border}` : '0 1px 2px rgba(15,23,42,0.12)',
              '&:hover': { backgroundColor: t.paper },
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { borderRadius: 999, opacity: 1, backgroundColor: alpha(t.text, 0.2) },
          thumb: { boxShadow: '0 1px 2px rgba(0,0,0,0.2)' },
          switchBase: {
            '&.Mui-checked + .MuiSwitch-track': { opacity: 1, backgroundColor: brand.emerald },
            '&.Mui-checked .MuiSwitch-thumb': { backgroundColor: '#fff' },
          },
        },
      },
      MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 650, fontSize: '0.8rem' } } },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 10, '&.Mui-selected': { backgroundColor: alpha(brand.emerald, isDark ? 0.18 : 0.1) } },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, minHeight: 40, paddingInline: 12 },
        },
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 40 }, indicator: { height: 2, borderRadius: 2 } } },
    },
  });
}
