import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { API_BASE_URL, apiGet } from './config/api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Testing API connection...');
      console.log('API Base URL:', API_BASE_URL);
      
      const response = await apiGet('/api/accounts/');
      const data = await response.json();
      
      setApiStatus('success');
      setAccounts(data);
      console.log('✅ API connection successful:', data);
      
    } catch (err) {
      console.error('❌ API connection failed:', err);
      setError(err.message);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = () => {
    testApiConnection();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              backgroundColor: 'white',
              padding: 4,
              borderRadius: 2,
              boxShadow: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              🚀 MyFinance Dashboard
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Electron Version - API Test
            </Typography>

            {loading && (
              <Box sx={{ mt: 3 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Testing API connection...
                </Typography>
              </Box>
            )}

            {error && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="h6">API Connection Failed</Typography>
                  <Typography variant="body2">{error}</Typography>
                </Alert>
                <Button variant="contained" onClick={retryConnection}>
                  Retry Connection
                </Button>
              </Box>
            )}

            {apiStatus === 'success' && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="h6">✅ API Connection Successful!</Typography>
                  <Typography variant="body2">
                    Connected to: {API_BASE_URL}
                  </Typography>
                </Alert>
                
                <Typography variant="h6" gutterBottom>
                  Accounts ({accounts.length})
                </Typography>
                
                {accounts.length > 0 ? (
                  <Box sx={{ textAlign: 'left', mt: 2 }}>
                    {accounts.map((account, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          mb: 1,
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                          backgroundColor: '#f9f9f9',
                        }}
                      >
                        <Typography variant="subtitle2">
                          {account.name} - {account.bank}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Balance: ${account.balance?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No accounts found
                  </Typography>
                )}
                
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => window.location.href = './index.html'}
                >
                  Load Full App
                </Button>
              </Box>
            )}

            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="text.secondary">
                Environment: {process.env.NODE_ENV} | 
                API URL: {API_BASE_URL} | 
                Electron: {window.electronAPI ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
