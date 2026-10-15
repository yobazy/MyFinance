'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { formatDate, formatRelative } from '../../lib/format';
import { EmptyState, PageHeader, SectionCard, StatusChip } from '../components/ui';
import { useToast } from '../components/ToastProvider';

type Insight = {
  id: string;
  period_start: string;
  period_end: string;
  narrative: string;
  created_at: string;
};

function formatPeriod(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  return s.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatPeriodRange(start: string, end: string) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function LinkCard(props: { href: string; icon: React.ReactNode; title: string; description: string }) {
  const theme = useTheme();
  return (
    <Card
      component={NextLink}
      href={props.href}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        transition: 'border-color 120ms ease, transform 120ms ease',
        '&:hover': {
          borderColor: alpha(theme.palette.text.primary, 0.2),
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
          '& svg': { fontSize: 20 },
        }}
      >
        {props.icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2">{props.title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {props.description}
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Card>
  );
}

export default function InsightsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const toast = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to fetch insights');
      setInsights(body.insights ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to queue insight');
      toast.success('Summary queued. Refresh in a few seconds to see it.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const generateButton = (
    <Button
      startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
      onClick={handleGenerate}
      disabled={generating}
      variant="contained"
    >
      Generate summary
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      <PageHeader
        eyebrow="Insights"
        title="Summaries"
        description="AI-written monthly narratives about where your money went, with charts and the assistant one step away."
        actions={
          <>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={fetchInsights} disabled={loading} aria-label="Refresh summaries" color="inherit">
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            {generateButton}
          </>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <LinkCard
          href="/visualizations"
          icon={<BarChartIcon />}
          title="Charts"
          description="Spending trends, top categories and balances"
        />
        <LinkCard
          href="/chat"
          icon={<ChatBubbleIcon />}
          title="Assistant"
          description="Ask questions about your accounts and spending"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={2}>
          {[1, 2].map((i) => (
            <Card key={i} sx={{ p: 2.5 }}>
              <Skeleton width="30%" height={22} sx={{ mb: 1.5 }} />
              <Skeleton width="100%" />
              <Skeleton width="95%" />
              <Skeleton width="80%" />
            </Card>
          ))}
        </Stack>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<AutoAwesomeIcon />}
          title="No summaries yet"
          description="Generate your first narrative summary, then use charts or the assistant to dig deeper."
          actions={generateButton}
        />
      ) : (
        <Stack spacing={2}>
          {insights.map((insight, idx) => (
            <SectionCard
              key={insight.id}
              title={formatPeriod(insight.period_start, insight.period_end)}
              description={formatPeriodRange(insight.period_start, insight.period_end)}
              action={idx === 0 ? <StatusChip status="latest" tone="success" label="Latest" /> : undefined}
              divider
            >
              <Typography variant="body1" sx={{ lineHeight: 1.75, whiteSpace: 'pre-wrap', maxWidth: 760 }}>
                {insight.narrative}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                Generated {formatRelative(insight.created_at)}
              </Typography>
            </SectionCard>
          ))}
        </Stack>
      )}
    </Box>
  );
}
