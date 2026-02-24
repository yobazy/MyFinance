'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { useThemeMode } from '../../lib/themeMode';

export default function UserSettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Theme and account settings.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
            label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Signed in as <b>{user?.email ?? 'Unknown'}</b>
          </Typography>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<LogoutIcon />}
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

