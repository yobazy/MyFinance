'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/MenuRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HomeIcon from '@mui/icons-material/HomeRounded';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceRounded';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import UploadFileIcon from '@mui/icons-material/UploadFileRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import CategoryIcon from '@mui/icons-material/CategoryRounded';
import RuleIcon from '@mui/icons-material/RuleRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import HelpIcon from '@mui/icons-material/HelpOutlineRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import DesktopIcon from '@mui/icons-material/DesktopWindowsRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeMode, type ThemePreference } from '../../lib/themeMode';
import { initials } from '../../lib/format';

type NavItem = { href: string; icon: React.ReactNode; label: string; match?: (pathname: string) => boolean };
type NavGroup = { title?: string; items: NavItem[] };

const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_KEY = 'mf.sidebar.collapsed';

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/', icon: <HomeIcon />, label: 'Home', match: (p) => p === '/' },
      { href: '/accounts', icon: <AccountBalanceIcon />, label: 'Accounts' },
      {
        href: '/transactions',
        icon: <ReceiptLongIcon />,
        label: 'Transactions',
        match: (p) => p.startsWith('/transactions'),
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/insights', icon: <AutoAwesomeIcon />, label: 'Summaries' },
      { href: '/visualizations', icon: <BarChartIcon />, label: 'Charts' },
      { href: '/chat', icon: <ChatBubbleIcon />, label: 'Assistant' },
    ],
  },
  {
    title: 'Data',
    items: [
      { href: '/upload', icon: <UploadFileIcon />, label: 'Upload statement' },
      { href: '/uploads', icon: <HistoryIcon />, label: 'Upload history' },
      { href: '/categorization', icon: <CategoryIcon />, label: 'Categories' },
      { href: '/rules', icon: <RuleIcon />, label: 'Rules' },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { href: '/help', icon: <HelpIcon />, label: 'Help' },
  { href: '/user-settings', icon: <SettingsIcon />, label: 'Settings' },
];

function RequireAuth(props: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || isAuthenticated) return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!isAuthenticated) return null;
  return <>{props.children}</>;
}

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink(props: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const { item, active, collapsed, onNavigate } = props;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const link = (
    <Box
      component={NextLink}
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: 36,
        px: collapsed ? 0 : 1.25,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 2.5,
        color: active ? 'text.primary' : 'text.secondary',
        bgcolor: active ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1) : 'transparent',
        fontWeight: active ? 620 : 520,
        fontSize: '0.875rem',
        position: 'relative',
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': {
          bgcolor: active ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14) : alpha(theme.palette.text.primary, 0.05),
          color: 'text.primary',
        },
        '& svg': { fontSize: 20, color: active ? theme.palette.primary.main : 'inherit', flexShrink: 0 },
        ...(active && !collapsed
          ? {
              '&::before': {
                content: '""',
                position: 'absolute',
                left: -12,
                top: 8,
                bottom: 8,
                width: 3,
                borderRadius: 999,
                bgcolor: 'primary.main',
              },
            }
          : null),
      }}
    >
      {item.icon}
      {!collapsed ? <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span> : null}
    </Box>
  );
  if (!collapsed) return link;
  return (
    <Tooltip title={item.label} placement="right">
      {link}
    </Tooltip>
  );
}

function Brand(props: { collapsed: boolean }) {
  const { mode } = useThemeMode();
  return (
    <Box
      component={NextLink}
      href="/"
      aria-label="MyFinance home"
      sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: 40, px: props.collapsed ? 0 : 0.5, justifyContent: props.collapsed ? 'center' : 'flex-start' }}
    >
      <Box component="img" src="/logo_mini.svg" alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
      {!props.collapsed ? (
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: mode === 'dark' ? '#E7ECF3' : '#0F172A' }}>
          MyFinance
        </Typography>
      ) : null}
    </Box>
  );
}

function ThemeMenuItems(props: { onDone?: () => void }) {
  const { preference, setPreference } = useThemeMode();
  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <LightModeIcon fontSize="small" /> },
    { value: 'dark', label: 'Dark', icon: <DarkModeIcon fontSize="small" /> },
    { value: 'system', label: 'System', icon: <DesktopIcon fontSize="small" /> },
  ];
  return (
    <>
      {options.map((opt) => (
        <MenuItem
          key={opt.value}
          onClick={() => {
            setPreference(opt.value);
            props.onDone?.();
          }}
          selected={preference === opt.value}
        >
          <ListItemIcon>{opt.icon}</ListItemIcon>
          <ListItemText>{opt.label}</ListItemText>
          {preference === opt.value ? <CheckIcon fontSize="small" color="primary" /> : null}
        </MenuItem>
      ))}
    </>
  );
}

function UserCard(props: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const email = user?.email ?? '';
  const name = (user?.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'Account';

  const handleLogout = async () => {
    setAnchor(null);
    await signOut();
    router.push('/login');
  };

  const trigger = (
    <Box
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      onClick={(e) => setAnchor(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setAnchor(e.currentTarget as HTMLElement);
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: props.collapsed ? 0.5 : 1,
        borderRadius: 2.5,
        cursor: 'pointer',
        justifyContent: props.collapsed ? 'center' : 'flex-start',
        '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) },
      }}
    >
      <Avatar
        src={(user?.user_metadata?.avatar_url as string | undefined) ?? undefined}
        sx={{ width: 32, height: 32, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
      >
        {initials((user?.user_metadata?.full_name as string | undefined) || email || name)}
      </Avatar>
      {!props.collapsed ? (
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 620, lineHeight: 1.2 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
            {email}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );

  return (
    <>
      {props.collapsed ? (
        <Tooltip title={email || 'Account'} placement="right">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 220, mb: 1 } } }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 620 }} noWrap>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {email}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <Typography variant="overline" color="text.secondary" sx={{ px: 1.5, pt: 0.5, display: 'block' }}>
          Appearance
        </Typography>
        <ThemeMenuItems />
        <Divider sx={{ my: 0.5 }} />
        <MenuItem component={NextLink} href="/user-settings" onClick={() => setAnchor(null)}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

function SidebarContent(props: { collapsed: boolean; onNavigate?: () => void; onToggleCollapse?: () => void; showClose?: boolean; onClose?: () => void }) {
  const { collapsed, onNavigate, onToggleCollapse, showClose, onClose } = props;
  const pathname = usePathname() ?? '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 1.5, py: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 0.5 }}>
        <Brand collapsed={collapsed} />
        {showClose ? (
          <IconButton size="small" onClick={onClose} aria-label="Close menu">
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>

      <Box component="nav" aria-label="Main" sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', mx: -0.5, px: 0.5 }}>
        {NAV_GROUPS.map((group, gi) => (
          <Box key={group.title ?? gi} sx={{ mb: 2 }}>
            {group.title && !collapsed ? (
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 1.25, mb: 0.5 }}>
                {group.title}
              </Typography>
            ) : group.title && collapsed ? (
              <Divider sx={{ my: 1 }} />
            ) : null}
            <Stack spacing={0.25}>
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item, pathname)} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </Stack>
          </Box>
        ))}
      </Box>

      <Stack spacing={0.25} sx={{ mt: 1 }}>
        {FOOTER_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item, pathname)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />
      <UserCard collapsed={collapsed} />

      {onToggleCollapse ? (
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            sx={{ alignSelf: collapsed ? 'center' : 'flex-end', mt: 0.5, color: 'text.secondary' }}
          >
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}

export default function AppShell(props: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const { isAuthenticated, loading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isPublicRoute = useMemo(
    () => pathname === '/login' || pathname.startsWith('/auth/'),
    [pathname]
  );
  if (isPublicRoute) return <>{props.children}</>;

  // Root shows the public landing when signed out; let the page handle it.
  if (pathname === '/' && (loading || !isAuthenticated)) return <>{props.children}</>;

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <RequireAuth>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Desktop sidebar */}
        {isDesktop ? (
          <Box
            component="aside"
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              height: '100vh',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: theme.palette.mode === 'dark' ? alpha('#0E131A', 1) : '#FBFBFC',
              transition: 'width 160ms ease',
            }}
          >
            <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
          </Box>
        ) : (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH } } }}
          >
            <SidebarContent collapsed={false} showClose onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile top bar */}
          {!isDesktop ? (
            <Box
              component="header"
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: theme.zIndex.appBar,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                height: 56,
                px: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.background.default, 0.85),
                backdropFilter: 'saturate(180%) blur(12px)',
              }}
            >
              <IconButton onClick={() => setMobileOpen(true)} aria-label="Open menu" edge="start">
                <MenuIcon />
              </IconButton>
              <Brand collapsed={false} />
            </Box>
          ) : null}

          <Box
            component="main"
            sx={{
              flex: 1,
              width: '100%',
              maxWidth: 1240,
              mx: 'auto',
              px: { xs: 2, sm: 3, lg: 4 },
              py: { xs: 2.5, md: 4 },
              animation: 'mf-fade-up 220ms ease',
            }}
          >
            {props.children}
          </Box>
        </Box>
      </Box>
    </RequireAuth>
  );
}
