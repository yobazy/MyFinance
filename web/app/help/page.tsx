'use client';

import React from 'react';
import { Box, Card, CardContent, Container, Typography } from '@mui/material';

export default function HelpPage() {
  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Help
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quick guidance for getting started.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Getting started
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Typical flow:
          </Typography>
          <ul style={{ marginTop: 0 }}>
            <li>Create an account in “Accounts”.</li>
            <li>Upload a statement in “Upload”.</li>
            <li>Review transactions in “Transactions”.</li>
            <li>Define categories and rules in “Manage”.</li>
          </ul>

          <Typography variant="body2" color="text.secondary">
            If you hit an auth issue, visit “Settings” and sign out/in again.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

