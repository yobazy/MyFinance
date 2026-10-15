'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RuleIcon from '@mui/icons-material/RuleRounded';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { monoStack } from '../../lib/theme';
import { humanize, plural } from '../../lib/format';
import { PageHeader, SectionCard, EmptyState, CategoryChip, StatusChip, PageSkeleton } from '../components/ui';

type RuleRow = {
  id: string;
  name: string;
  rule_type: string;
  pattern: string;
  priority: number;
  is_active: boolean;
  categories?: { name?: string; color?: string } | null;
};

export default function RulesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('categorization_rules')
        .select('id,name,rule_type,pattern,priority,is_active,categories(name,color)')
        .order('priority', { ascending: false })
        .limit(200);
      if (err) {
        setError(`Failed to load rules: ${err.message}`);
        setRules([]);
      } else {
        setRules((data ?? []) as unknown as RuleRow[]);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const header = (
    <PageHeader
      title="Rules"
      description="Rules match transaction descriptions and assign a category automatically. Higher priority runs first."
    />
  );

  if (loading) {
    return (
      <Box>
        {header}
        <PageSkeleton stats={0} rows={5} />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {rules.length === 0 ? (
        <EmptyState
          icon={<RuleIcon />}
          title="No rules yet"
          description="Rules are created as you accept category suggestions. Generate suggestions from Transactions to get started."
          actions={
            <Button variant="contained" onClick={() => router.push('/transactions')}>
              Go to transactions
            </Button>
          }
        />
      ) : (
        <SectionCard title="All rules" description={plural(rules.length, 'rule')} disablePadding divider>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Pattern</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Priority</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {r.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={humanize(r.rule_type)} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontFamily: monoStack, fontSize: '0.8rem', color: 'text.secondary' }}
                        title={r.pattern}
                      >
                        {r.pattern}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CategoryChip name={r.categories?.name ?? null} color={r.categories?.color ?? null} />
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {r.priority}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.is_active ? 'active' : 'inactive'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}
    </Box>
  );
}
