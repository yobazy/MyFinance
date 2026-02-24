'use client';

import React from 'react';
import { Box, Card, CardContent, Container, Typography } from '@mui/material';

export default function VisualizationsPage() {
  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualizations are coming back next—this page is scaffolded to match the legacy nav/layout.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We’ll reintroduce charts once we finalize the Supabase-backed rollups and the data model for budgets/trends.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

