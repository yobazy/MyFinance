import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  Wifi, 
  WifiOff, 
  CloudSync, 
  CloudSyncOutlined,
  Security,
  SecurityOutlined 
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const StatusBar = () => {
  const theme = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate periodic sync
    const syncInterval = setInterval(() => {
      setLastSync(new Date());
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 24,
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        zIndex: 1000,
        fontSize: '0.75rem',
      }}
    >
      {/* Left side - App info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          MyFinance Desktop
        </Typography>
      </Box>

      {/* Center - Status indicators */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isOnline ? 'Connected' : 'Offline'}>
          <IconButton size="small" sx={{ p: 0.5 }}>
            {isOnline ? (
              <Wifi sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <WifiOff sx={{ fontSize: 16, color: 'error.main' }} />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Data synchronized">
          <IconButton size="small" sx={{ p: 0.5 }}>
            <CloudSync sx={{ fontSize: 16, color: 'success.main' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Secure connection">
          <IconButton size="small" sx={{ p: 0.5 }}>
            <Security sx={{ fontSize: 16, color: 'success.main' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Right side - Time and sync info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Last sync: {formatTime(lastSync)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatTime(new Date())}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatusBar;
