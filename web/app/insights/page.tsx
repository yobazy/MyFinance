'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';

type Insight = {
  id: string;
  period_start: string;
  period_end: string;
  narrative: string;
  created_at: string;
};

function formatPeriod(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return `${s.toLocaleString('default', { month: 'long', year: 'numeric' })} (${s.toLocaleDateString()} – ${e.toLocaleDateString()})`;
}

export default function InsightsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to queue insight');
      setSuccessMsg('Insight generation queued — refresh in a few seconds to see it.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoAwesomeIcon color="primary" />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Insights
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Narrative summaries live here, with charts and the assistant one step away.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchInsights}
              disabled={loading}
              variant="outlined"
              size="small"
            >
              Refresh
            </Button>
            <Button
              startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              disabled={generating}
              variant="contained"
              size="small"
            >
              Generate summary
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Read AI-generated monthly summaries and queue a fresh one when you need it.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BarChartIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Charts
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Open the detailed charts view for spending trends, top categories, and balances.
                </Typography>
                <Button size="small" onClick={() => router.push('/visualizations')}>
                  Open charts
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SmartToyIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Ask
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ask the finance assistant about recent spending, accounts, or transactions.
                </Typography>
                <Button size="small" onClick={() => router.push('/chat')}>
                  Open assistant
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
                <Skeleton width="100%" />
                <Skeleton width="95%" />
                <Skeleton width="80%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : insights.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" gutterBottom>
              No insights yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate your first narrative summary, then use charts or the assistant for follow-up.
            </Typography>
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              disabled={generating}
            >
              Generate summary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {insights.map((insight, idx) => (
            <Card key={insight.id} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>
                    {formatPeriod(insight.period_start, insight.period_end)}
                  </Typography>
                  {idx === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                      }}
                    >
                      Latest
                    </Typography>
                  )}
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body1" sx={{ lineHeight: 1.75 }}>
                  {insight.narrative}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5, display: 'block' }}>
                  Generated {new Date(insight.created_at).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
