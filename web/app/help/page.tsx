'use client';

import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export default function HelpPage() {
  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Help
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quick answers for common setup and support questions.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Common tasks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Where to go next:
          </Typography>
          <Box
            component="ul"
            sx={{
              marginTop: 0,
              marginBottom: 2,
              paddingLeft: 3,
              color: 'text.secondary',
              '& li': { marginBottom: 0.5 },
            }}
          >
            <li>Add or edit accounts in "Accounts".</li>
            <li>Connect Plaid from an account card for ongoing imports.</li>
            <li>Use "Upload statement" for manual Amex imports.</li>
            <li>Review and clean up activity in "Transactions".</li>
          </Box>

          <Typography variant="body2" color="text.secondary">
            If auth or AI features stop working, visit "Settings" and sign out/in again.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

