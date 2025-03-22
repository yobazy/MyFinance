import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FormControlLabel, 
  Switch,
  Typography,
  Box,
  Divider,
  Paper
} from "@mui/material";

const UserSettings = () => {
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load theme preference on component mount
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme === 'dark');
  }, []);

  const handleThemeToggle = () => {
    const newTheme = !darkMode ? 'dark' : 'light';
    setDarkMode(!darkMode);
    localStorage.setItem('theme', newTheme);
    // Emit theme change event
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));
  };

  const handleResetDatabase = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/reset-database/");
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Failed to reset database.");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Settings
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={handleThemeToggle}
            />
          }
          label="Dark Mode"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Database Management
        </Typography>
        <button 
          onClick={handleResetDatabase} 
          style={{ backgroundColor: "red", color: "white" }}
        >
          Reset Database
        </button>
        <p>{message}</p>
      </Paper>
    </Box>
  );
};

export default UserSettings;
