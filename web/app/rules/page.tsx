'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import { createBrowserSupabaseClient } from '../../lib/supabase';

type RuleRow = {
  id: string;
  name: string;
  rule_type: string;
  pattern: string;
  priority: number;
  is_active: boolean;
  categories?: { name?: string } | null;
};

export default function RulesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('id,name,rule_type,pattern,priority,is_active,categories(name)')
        .order('priority', { ascending: false })
        .limit(200);
      if (error) {
        setMessage(`Failed to load rules: ${error.message}`);
        setRules([]);
        return;
      }
      setRules((data ?? []) as RuleRow[]);
    })();
  }, [supabase]);

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Rules
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage categorization rules used to auto-classify transactions.
        </Typography>
      </Box>

      {message ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        {rules.map((r) => (
          <Grid key={r.id} item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {r.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {r.rule_type} • Priority: {r.priority} • {r.is_active ? 'Active' : 'Inactive'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <b>Pattern:</b> {r.pattern}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                  Category: {r.categories?.name ?? '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

