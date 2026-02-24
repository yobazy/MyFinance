'use client';

import React, { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import RuleIcon from '@mui/icons-material/Rule';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HelpIcon from '@mui/icons-material/Help';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LogoutIcon from '@mui/icons-material/Logout';
import CategoryIcon from '@mui/icons-material/Category';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeMode } from '../../lib/themeMode';

type NavItem = { href: string; icon: React.ReactNode; label: string };

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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return null;
  return <>{props.children}</>;
}

export default function AppShell(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode } = useThemeMode();
  const { user, signOut, isAuthenticated, loading } = useAuth();

  const [mobileAnchorEl, setMobileAnchorEl] = useState<HTMLElement | null>(null);
  const [manageAnchorEl, setManageAnchorEl] = useState<HTMLElement | null>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: '/', icon: <DashboardIcon />, label: 'Dashboard' },
      { href: '/accounts', icon: <AccountBalanceIcon />, label: 'Accounts' },
      { href: '/upload', icon: <UploadFileIcon />, label: 'Upload' },
      { href: '/transactions', icon: <ReceiptIcon />, label: 'Transactions' },
      { href: '/visualizations', icon: <BarChartIcon />, label: 'Analytics' },
      { href: '/help', icon: <HelpIcon />, label: 'Help' },
      { href: '/user-settings', icon: <SettingsIcon />, label: 'Settings' },
    ],
    []
  );

  const isLoginRoute = pathname === '/login';
  if (isLoginRoute) return <>{props.children}</>;

  const isRootRoute = pathname === '/';
  if (isRootRoute && (loading || !isAuthenticated)) return <>{props.children}</>;

  const handleLogout = async () => {
    await signOut();
    setUserMenuAnchorEl(null);
    router.push('/login');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  const navButtonSx = (active: boolean) => ({
    borderRadius: 999,
    px: 1.25,
    py: 0.85,
    color: active ? 'text.primary' : 'text.secondary',
    backgroundColor: active ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12) : 'transparent',
    '&:hover': {
      backgroundColor: alpha(
        theme.palette.primary.main,
        active ? (theme.palette.mode === 'dark' ? 0.22 : 0.16) : theme.palette.mode === 'dark' ? 0.10 : 0.08
      ),
      transform: 'translateY(-1px)',
    },
  });

  const appBar = (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ py: 0, overflow: 'visible' }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/logo_dark.svg' : '/logo_light.svg'}
              alt="MyFinance"
              onClick={() => router.push('/')}
              sx={{
                height: 26,
                width: 'auto',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            />
            {!isMobile ? (
              <Typography variant="body2" color="text.secondary">
                Clear money, calm mind
              </Typography>
            ) : null}
          </Box>

          {isMobile ? (
            <>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                {user?.email ? (
                  <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {user.email}
                  </Typography>
                ) : null}
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  aria-label="menu"
                  onClick={(e) => setMobileAnchorEl(e.currentTarget)}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.9 : 0.7)}`,
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.65),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.45 : 0.8),
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>

              <Menu
                anchorEl={mobileAnchorEl}
                open={Boolean(mobileAnchorEl)}
                onClose={() => setMobileAnchorEl(null)}
                PaperProps={{
                  sx: {
                    mt: 1,
                    borderRadius: 3,
                    minWidth: 220,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 24px 70px rgba(0,0,0,0.55)'
                        : '0 24px 70px rgba(15,23,42,0.14)',
                  },
                }}
              >
                {navItems.slice(0, -1).map((item) => (
                  <MenuItem
                    key={item.href}
                    component={NextLink}
                    href={item.href}
                    onClick={() => setMobileAnchorEl(null)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    {item.icon}
                    {item.label}
                  </MenuItem>
                ))}
                <MenuItem
                  onClick={(e) => setManageAnchorEl(e.currentTarget as HTMLElement)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <ManageAccountsIcon />
                  Manage
                  <ArrowDropDownIcon />
                </MenuItem>
                <MenuItem
                  component={NextLink}
                  href={navItems[navItems.length - 1].href}
                  onClick={() => setMobileAnchorEl(null)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {navItems[navItems.length - 1].icon}
                  {navItems[navItems.length - 1].label}
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LogoutIcon />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {navItems.slice(0, -1).map((item) => (
                <Button
                  key={item.href}
                  color="inherit"
                  component={NextLink}
                  href={item.href}
                  startIcon={item.icon}
                  sx={{ ...navButtonSx(isActive(item.href)), ml: 0.5 }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                color="inherit"
                startIcon={<ManageAccountsIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setManageAnchorEl(e.currentTarget)}
                sx={{ ...navButtonSx(Boolean(manageAnchorEl)), ml: 0.5 }}
              >
                Manage
              </Button>
              <Button
                color="inherit"
                component={NextLink}
                href={navItems[navItems.length - 1].href}
                startIcon={navItems[navItems.length - 1].icon}
                sx={{ ...navButtonSx(isActive(navItems[navItems.length - 1].href)), ml: 0.5 }}
              >
                {navItems[navItems.length - 1].label}
              </Button>
              {user ? (
                <>
                  <IconButton onClick={(e) => setUserMenuAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {(user.email?.[0] || 'U').toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={userMenuAnchorEl}
                    open={Boolean(userMenuAnchorEl)}
                    onClose={() => setUserMenuAnchorEl(null)}
                  >
                    <MenuItem disabled>
                      <Typography variant="body2">{user.email}</Typography>
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : null}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={manageAnchorEl}
        open={Boolean(manageAnchorEl)}
        onClose={() => setManageAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocusItem
        disableRestoreFocus
        sx={{
          '& .MuiPaper-root': {
            marginTop: '8px',
            borderRadius: 3,
            minWidth: 220,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 24px 70px rgba(0,0,0,0.55)'
                : '0 24px 70px rgba(15,23,42,0.14)',
          },
        }}
      >
        <MenuItem
          component={NextLink}
          href="/categorization"
          onClick={() => setManageAnchorEl(null)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <CategoryIcon />
          Categories
        </MenuItem>
        <MenuItem
          component={NextLink}
          href="/rules"
          onClick={() => setManageAnchorEl(null)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <RuleIcon />
          Rules
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <RequireAuth>
      {appBar}
      <Box
        component="main"
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 4 },
          maxWidth: 1280,
          mx: 'auto',
        }}
      >
        {props.children}
      </Box>
    </RequireAuth>
  );
}

