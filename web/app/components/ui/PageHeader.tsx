'use client';

import React from 'react';
import NextLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small uppercase label above the title, e.g. a section name. */
  eyebrow?: React.ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode;
  /** Renders a "Back" link above the title. */
  backHref?: string;
  backLabel?: string;
  /** Extra content under the header (tabs, filters). */
  children?: React.ReactNode;
  sx?: object;
};

export default function PageHeader(props: PageHeaderProps) {
  const { title, description, eyebrow, actions, backHref, backLabel, children, sx } = props;
  return (
    <Box sx={{ mb: 3, ...sx }}>
      {backHref ? (
        <Button
          component={NextLink}
          href={backHref}
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          sx={{ mb: 1, ml: -1, color: 'text.secondary' }}
        >
          {backLabel ?? 'Back'}
        </Button>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant="h3" component="h1" sx={{ mb: description ? 0.5 : 0 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
      {children ? <Box sx={{ mt: 2 }}>{children}</Box> : null}
    </Box>
  );
}
