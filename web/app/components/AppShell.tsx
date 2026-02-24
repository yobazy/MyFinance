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
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
    if (!loading && !isAuthenticated) router.replace('/login');
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

  const appBar = (
    <>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: '56px', py: 0, overflow: 'visible' }}>
          <Box sx={{ flexGrow: isMobile ? 0 : 1, display: 'flex', alignItems: 'center' }}>
            <img
              src={mode === 'dark' ? '/logo_dark.svg' : '/logo_light.svg'}
              alt="MyFinance"
              style={{
                height: '120px',
                width: 'auto',
                cursor: 'pointer',
                objectFit: 'cover',
                objectPosition: 'center',
                clipPath: 'inset(40% 0 40% 0)',
                marginTop: '-30px',
                marginBottom: '-30px',
              }}
              onClick={() => router.push('/')}
            />
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
                >
                  <MenuIcon />
                </IconButton>
              </Box>

              <Menu
                anchorEl={mobileAnchorEl}
                open={Boolean(mobileAnchorEl)}
                onClose={() => setMobileAnchorEl(null)}
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
                  sx={{ ml: 1 }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                color="inherit"
                startIcon={<ManageAccountsIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setManageAnchorEl(e.currentTarget)}
                sx={{ ml: 1 }}
              >
                Manage
              </Button>
              <Button
                color="inherit"
                component={NextLink}
                href={navItems[navItems.length - 1].href}
                startIcon={navItems[navItems.length - 1].icon}
                sx={{ ml: 1 }}
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
            marginTop: '0px',
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
      <Container sx={{ mt: 4 }}>{props.children}</Container>
    </RequireAuth>
  );
}

