'use client';

import React from 'react';
import { Box, Card, Skeleton, Stack } from '@mui/material';

/** Generic page-level loading placeholder: header + stat row + a content block. */
export default function PageSkeleton(props: { stats?: number; rows?: number; chart?: boolean }) {
  const { stats = 4, rows = 6, chart = false } = props;
  return (
    <Box sx={{ animation: 'mf-fade-up 240ms ease' }}>
      <Skeleton width={220} height={36} sx={{ mb: 1 }} />
      <Skeleton width={360} height={20} sx={{ mb: 3 }} />
      {stats > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${stats}, 1fr)` }, gap: 2, mb: 3 }}>
          {Array.from({ length: stats }).map((_, i) => (
            <Card key={i} sx={{ p: 2.25 }}>
              <Skeleton width="50%" height={14} sx={{ mb: 1.5 }} />
              <Skeleton width="70%" height={32} />
            </Card>
          ))}
        </Box>
      ) : null}
      {chart ? (
        <Card sx={{ p: 2.5, mb: 3 }}>
          <Skeleton width={160} height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
        </Card>
      ) : null}
      <Card sx={{ p: 0 }}>
        <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
          {Array.from({ length: rows }).map((_, i) => (
            <Stack key={i} direction="row" alignItems="center" gap={2} sx={{ px: 2.5, py: 1.75 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="40%" height={16} />
                <Skeleton width="25%" height={12} />
              </Box>
              <Skeleton width={80} height={18} />
            </Stack>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}
