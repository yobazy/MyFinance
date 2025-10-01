import React from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  IconButton,
  useMediaQuery,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse
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
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Dashboard from "./pages/Dashboard.tsx";
import AccountsPage from "./pages/AccountsPage.tsx";
import FileUploader from "./pages/FileUploader";
import Categorization from "./pages/Categorization";
import RuleManagement from "./pages/RuleManagement";
import Visualizations from "./pages/Visualizations";
import Transactions from "./pages/Transactions.tsx";
import UserSettings from "./pages/UserSettings";
import HelpPage from "./pages/HelpPage.tsx";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "./theme";
import { CssBaseline } from "@mui/material";
import StatusBar from "./components/StatusBar";

// Backup check function
const checkAndCreateAutoBackup = async () => {
  try {
    // Try multiple ports in case backend starts on different port
    const ports = ['8000', '8001'];
    let response = null;
    
    for (const port of ports) {
      try {
        response = await fetch(`http://localhost:${port}/api/backup/check-auto/`);
        if (response.ok) break;
      } catch (e) {
        console.log(`Backend not available on port ${port}`);
      }
    }
    
    if (response && response.ok) {
      const data = await response.json();
      if (data.backup_created) {
        console.log('Auto backup created:', data.backup);
      }
    }
  } catch (error) {
    console.log('Backup check failed:', error);
  }
};

const App = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [mode, setMode] = React.useState(localStorage.getItem('theme') || 'dark');
  const theme = React.useMemo(() => getTheme(mode), [mode]);
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  
  React.useEffect(() => {
    const handleThemeChange = (event) => {
      setMode(event.detail);
    };

    const handleMenuAction = (event, action, data) => {
      switch (action) {
        case 'menu-navigate':
          window.location.hash = data;
          break;
        case 'menu-toggle-sidebar':
          setMobileOpen(!mobileOpen);
          break;
        case 'menu-preferences':
          window.location.hash = '/user-settings';
          break;
        default:
          break;
      }
    };

    window.addEventListener('themeChange', handleThemeChange);
    
    // Listen for Electron menu actions
    if (window.electronAPI) {
      window.electronAPI.onMenuAction(handleMenuAction);
    }
    
    // Check for auto backup when app loads
    checkAndCreateAutoBackup();
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, [mobileOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleManageToggle = () => {
    setManageOpen(!manageOpen);
  };

  const drawerWidth = 280;

  const mainNavItems = [
    { to: "/", icon: <DashboardIcon />, label: "Dashboard" },
    { to: "/accounts", icon: <AccountBalanceIcon />, label: "Accounts" },
    { to: "/upload", icon: <UploadFileIcon />, label: "Upload" },
    { to: "/transactions", icon: <ReceiptIcon />, label: "Transactions" },
    { to: "/visualizations", icon: <BarChartIcon />, label: "Analytics" },
  ];

  const manageNavItems = [
    { to: "/categorization", icon: <CategoryIcon />, label: "Categories" },
    { to: "/rules", icon: <RuleIcon />, label: "Rules" },
  ];

  const bottomNavItems = [
    { to: "/help", icon: <HelpIcon />, label: "Help" },
    { to: "/user-settings", icon: <SettingsIcon />, label: "Settings" },
  ];

  const DrawerContent = () => {
    const location = useLocation();
    
    return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box sx={{ p: 3, textAlign: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <img 
          src={mode === 'dark' ? './logo_dark.svg' : './logo_light.svg'} 
          alt="MyFinance" 
          style={{ 
            height: '40px', 
            width: 'auto',
            cursor: 'pointer',
            objectFit: 'contain'
          }}
          onClick={() => window.location.href = '/'}
        />
        <Typography variant="h6" sx={{ mt: 1, fontWeight: 600, color: 'text.primary' }}>
          MyFinance
        </Typography>
      </Box>

      {/* Main Navigation */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {mainNavItems.map((item) => (
          <ListItem key={item.to} disablePadding sx={{ px: 2, mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.to ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Manage Section */}
        <ListItem disablePadding sx={{ px: 2, mt: 2 }}>
          <ListItemButton onClick={handleManageToggle} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ManageAccountsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Manage"
              primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
            />
            {manageOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={manageOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {manageNavItems.map((item) => (
              <ListItem key={item.to} disablePadding sx={{ px: 2, pl: 6 }}>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={location.pathname === item.to}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: location.pathname === item.to ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>

      {/* Bottom Navigation */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
        <List>
          {bottomNavItems.map((item) => (
            <ListItem key={item.to} disablePadding sx={{ px: 2, mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.to}
                selected={location.pathname === item.to}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: location.pathname === item.to ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  borderRight: 1,
                  borderColor: 'divider',
                },
              }}
            >
              <DrawerContent />
            </Drawer>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: drawerWidth,
                },
              }}
            >
              <DrawerContent />
            </Drawer>
          )}

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Top App Bar for Mobile */}
            {isMobile && (
              <AppBar position="static" elevation={1}>
                <Toolbar>
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2 }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    MyFinance
                  </Typography>
                </Toolbar>
              </AppBar>
            )}

            {/* Page Content */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, pb: 5 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<FileUploader />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/categorization" element={<Categorization />} />
                <Route path="/rules" element={<RuleManagement />} />
                <Route path="/visualizations" element={<Visualizations />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/user-settings" element={<UserSettings />} />
              </Routes>
            </Box>
          </Box>
          
          {/* Desktop Status Bar */}
          {!isMobile && <StatusBar />}
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
