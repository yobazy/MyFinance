import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Box
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CategoryIcon from '@mui/icons-material/Category';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import Dashboard from "./pages/Dashboard.tsx";
import AccountsPage from "./pages/AccountsPage.tsx";
import FileUploader from "./pages/FileUploader";
import Categorization from "./pages/Categorization";
import Visualizations from "./pages/Visualizations";
import Transactions from "./pages/Transactions.tsx";
import UserSettings from "./pages/UserSettings";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "./theme";
import { CssBaseline } from "@mui/material";

const App = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mode, setMode] = React.useState(localStorage.getItem('theme') || 'light');
  const theme = React.useMemo(() => getTheme(mode), [mode]);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  React.useEffect(() => {
    const handleThemeChange = (event) => {
      setMode(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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
    { to: "/categorization", icon: <CategoryIcon />, label: "Categories" },
    { to: "/visualizations", icon: <BarChartIcon />, label: "Analytics" },
    { to: "/user-settings", icon: <SettingsIcon />, label: "Settings" },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: isMobile ? 0 : 1 }}>
              MyFinance
            </Typography>

            {isMobile ? (
              <>
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  aria-label="menu"
                  onClick={handleMenu}
                  sx={{ ml: 'auto' }}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  {navItems.map((item) => (
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
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex' }}>
                {navItems.map((item) => (
                  <NavButton
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<FileUploader />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/categorization" element={<Categorization />} />
            <Route path="/visualizations" element={<Visualizations />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/user-settings" element={<UserSettings />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
