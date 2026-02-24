import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Container,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  Box,
  Typography,
  Avatar
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CategoryIcon from '@mui/icons-material/Category';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import RuleIcon from '@mui/icons-material/Rule';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HelpIcon from '@mui/icons-material/Help';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LogoutIcon from '@mui/icons-material/Logout';
import Dashboard from "./pages/Dashboard.tsx";
import AccountsPage from "./pages/AccountsPage.tsx";
import FileUploader from "./pages/FileUploader";
import Categorization from "./pages/Categorization";
import RuleManagement from "./pages/RuleManagement";
import Visualizations from "./pages/Visualizations";
import Transactions from "./pages/Transactions.tsx";
import UserSettings from "./pages/UserSettings";
import HelpPage from "./pages/HelpPage.tsx";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "./theme";
import { CssBaseline } from "@mui/material";

// Backup check function
const checkAndCreateAutoBackup = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/backup/check-auto/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.backup_created) {
        console.log('Auto backup created:', data.backup);
      }
    }
  } catch (error) {
    console.log('Backup check failed:', error);
  }
};

const AppContent = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [manageAnchorEl, setManageAnchorEl] = React.useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState(null);
  const [mode, setMode] = React.useState(localStorage.getItem('theme') || 'dark');
  const theme = React.useMemo(() => getTheme(mode), [mode]);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  React.useEffect(() => {
    const handleThemeChange = (event) => {
      setMode(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange);
    
    // Check for auto backup when app loads (only if authenticated)
    if (isAuthenticated) {
      checkAndCreateAutoBackup();
    }
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, [isAuthenticated]);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setUserMenuAnchor(null);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleManageMenu = (event) => {
    setManageAnchorEl(event.currentTarget);
  };

  const handleManageClose = () => {
    setManageAnchorEl(null);
  };

  const NavButton = ({ to, icon, label }) => (
    <Button
      color="inherit"
      component={Link}
      to={to}
      startIcon={icon}
      sx={{ ml: 1 }}
    >
      {label}
    </Button>
  );

const navItems = [
    { to: "/", icon: <DashboardIcon />, label: "Dashboard" },
    { to: "/accounts", icon: <AccountBalanceIcon />, label: "Accounts" },
    { to: "/upload", icon: <UploadFileIcon />, label: "Upload" },
    { to: "/transactions", icon: <ReceiptIcon />, label: "Transactions" },
    { to: "/visualizations", icon: <BarChartIcon />, label: "Analytics" },
    { to: "/help", icon: <HelpIcon />, label: "Help" },
    { to: "/user-settings", icon: <SettingsIcon />, label: "Settings" },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                  // border: '2px solid white', // for debugging
                  marginTop: '-30px',
                  marginBottom: '-30px'
                }}
                onClick={() => window.location.href = '/'}
              />
            </Box>

            {isMobile ? (
              <>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {user && (
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {user.first_name || user.email}
                    </Typography>
                  )}
                  <IconButton
                    size="large"
                    edge="end"
                    color="inherit"
                    aria-label="menu"
                    onClick={handleMenu}
                  >
                    <MenuIcon />
                  </IconButton>
                </Box>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  {navItems.slice(0, -1).map((item) => (
                    <MenuItem 
                      key={item.to} 
                      component={Link} 
                      to={item.to}
                      onClick={handleClose}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      {item.icon}
                      {item.label}
                    </MenuItem>
                  ))}
                  <MenuItem 
                    onClick={handleManageMenu}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <ManageAccountsIcon />
                    Manage
                    <ArrowDropDownIcon />
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to={navItems[navItems.length - 1].to}
                    onClick={handleClose}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    {navItems[navItems.length - 1].icon}
                    {navItems[navItems.length - 1].label}
                  </MenuItem>
                </Menu>
                <Menu
                  anchorEl={manageAnchorEl}
                  open={Boolean(manageAnchorEl)}
                  onClose={handleManageClose}
                >
                  <MenuItem 
                    component={Link} 
                    to="/categorization"
                    onClick={handleManageClose}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CategoryIcon />
                    Categories
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/rules"
                    onClick={handleManageClose}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <RuleIcon />
                    Rules
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {navItems.slice(0, -1).map((item) => (
                  <NavButton
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
                <Button
                  color="inherit"
                  startIcon={<ManageAccountsIcon />}
                  endIcon={<ArrowDropDownIcon />}
                  onClick={handleManageMenu}
                  sx={{ ml: 1 }}
                >
                  Manage
                </Button>
                <NavButton
                  to={navItems[navItems.length - 1].to}
                  icon={navItems[navItems.length - 1].icon}
                  label={navItems[navItems.length - 1].label}
                />
                {user && (
                  <>
                    <IconButton
                      onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                      sx={{ ml: 1 }}
                    >
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                        {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </Avatar>
                    </IconButton>
                    <Menu
                      anchorEl={userMenuAnchor}
                      open={Boolean(userMenuAnchor)}
                      onClose={() => setUserMenuAnchor(null)}
                    >
                      <MenuItem disabled>
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </MenuItem>
                      <MenuItem onClick={handleLogout}>
                        <LogoutIcon sx={{ mr: 1 }} />
                        Logout
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {/* Manage Dropdown Menu for Desktop */}
        <Menu
          anchorEl={manageAnchorEl}
          open={Boolean(manageAnchorEl)}
          onClose={handleManageClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          disableAutoFocusItem
          disableRestoreFocus
          sx={{
            '& .MuiPaper-root': {
              marginTop: '0px', // No gap to prevent flickering
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
          }}
        >
          <MenuItem 
            component={Link} 
            to="/categorization"
            onClick={handleManageClose}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CategoryIcon />
            Categories
          </MenuItem>
          <MenuItem 
            component={Link} 
            to="/rules"
            onClick={handleManageClose}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <RuleIcon />
            Rules
          </MenuItem>
        </Menu>

        <Container sx={{ mt: 4 }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <FileUploader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categorization"
              element={
                <ProtectedRoute>
                  <Categorization />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rules"
              element={
                <ProtectedRoute>
                  <RuleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visualizations"
              element={
                <ProtectedRoute>
                  <Visualizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-settings"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Container>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider theme={getTheme(localStorage.getItem('theme') || 'dark')}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
