'use client';

import React from 'react';
import { Box, Card, Divider, Stack, Typography } from '@mui/material';

type SectionCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header content (buttons, chips, toggles). */
  action?: React.ReactNode;
  /** Icon rendered before the title. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Remove body padding (for tables / lists that go edge-to-edge). */
  disablePadding?: boolean;
  /** Draw a divider between header and body. */
  divider?: boolean;
  footer?: React.ReactNode;
  sx?: object;
  bodySx?: object;
};

export default function SectionCard(props: SectionCardProps) {
  const { title, description, action, icon, children, disablePadding, divider, footer, sx, bodySx } = props;
  const hasHeader = Boolean(title || description || action);
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', ...sx }}>
      {hasHeader ? (
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={2}
          sx={{ px: 2.5, pt: 2.25, pb: divider ? 1.75 : disablePadding ? 1.5 : 0.5 }}
        >
          <Stack direction="row" gap={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
            {icon ? (
              <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px', '& svg': { fontSize: 20 } }}>{icon}</Box>
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              {title ? (
                <Typography variant="h6" component="h2">
                  {title}
                </Typography>
              ) : null}
              {description ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {description}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {action ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              {action}
            </Stack>
          ) : null}
        </Stack>
      ) : null}
      {divider && hasHeader ? <Divider /> : null}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ...(disablePadding ? null : { px: 2.5, pb: 2.5, pt: hasHeader ? 1.5 : 2.5 }),
          ...bodySx,
        }}
      >
        {children}
      </Box>
      {footer ? (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.5 }}>{footer}</Box>
        </>
      ) : null}
    </Card>
  );
}
