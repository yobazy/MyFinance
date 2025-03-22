import { createTheme } from "@mui/material/styles";

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: "#1976d2", // Blue
    },
    secondary: {
      main: "#ff4081", // Pink
    },
    // Add dark mode specific colors
    background: {
      default: mode === 'dark' ? '#121212' : '#fff',
      paper: mode === 'dark' ? '#1e1e1e' : '#fff',
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
});

export default getTheme('light');
