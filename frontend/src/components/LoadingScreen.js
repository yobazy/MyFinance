import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Paper,
  Fade,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
}));

const LoadingCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  minWidth: 400,
  maxWidth: 500,
  textAlign: 'center',
  boxShadow: theme.shadows[8],
}));

const LoadingScreen = ({ onComplete }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing MyFinance Dashboard...');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const loadingSteps = [
      { text: 'Initializing MyFinance Dashboard...', progress: 10 },
      { text: 'Starting backend server...', progress: 30 },
      { text: 'Connecting to database...', progress: 50 },
      { text: 'Loading application data...', progress: 70 },
      { text: 'Preparing interface...', progress: 85 },
      { text: 'Almost ready...', progress: 95 },
      { text: 'Welcome to MyFinance Dashboard!', progress: 100 },
    ];

    let currentStep = 0;
    
    const updateProgress = () => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingText(step.text);
        setProgress(step.progress);
        currentStep++;
        
        // Vary the timing for more realistic loading
        const delay = currentStep === 1 ? 2000 : // Longer delay for backend startup
                     currentStep === 2 ? 1500 : // Database connection
                     currentStep === 3 ? 1000 : // Loading data
                     currentStep === 4 ? 800 :  // Preparing interface
                     currentStep === 5 ? 600 :  // Almost ready
                     currentStep === 6 ? 500 :  // Final step
                     300; // Default delay
        
        setTimeout(updateProgress, delay);
      } else {
        // Loading complete
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            onComplete && onComplete();
          }, 300);
        }, 1000);
      }
    };

    // Start the loading sequence
    setTimeout(updateProgress, 500);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <Fade in={isVisible} timeout={300}>
      <LoadingContainer>
        <LoadingCard elevation={8}>
          {/* Logo */}
          <Box sx={{ mb: 3 }}>
            <img 
              src={theme.palette.mode === 'dark' ? './logo_dark.svg' : './logo_light.svg'} 
              alt="MyFinance" 
              style={{ 
                height: '60px', 
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </Box>

          {/* App Name */}
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              mb: 1, 
              fontWeight: 600,
              color: 'primary.main',
              letterSpacing: '-0.02em'
            }}
          >
            MyFinance Dashboard
          </Typography>

          {/* Loading Text */}
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 3, 
              color: 'text.secondary',
              minHeight: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {loadingText}
          </Typography>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }}
            />
          </Box>

          {/* Progress Percentage */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500
            }}
          >
            {Math.round(progress)}%
          </Typography>

          {/* Spinning Icon */}
          <Box sx={{ mt: 2 }}>
            <CircularProgress 
              size={24} 
              thickness={4}
              sx={{ 
                color: 'primary.main',
                opacity: progress < 100 ? 1 : 0
              }}
            />
          </Box>
        </LoadingCard>
      </LoadingContainer>
    </Fade>
  );
};

export default LoadingScreen;
