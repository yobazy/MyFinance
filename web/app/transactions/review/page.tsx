'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import DoneAllIcon from '@mui/icons-material/DoneAllRounded';
import RateReviewIcon from '@mui/icons-material/RateReviewRounded';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../../lib/supabase';
import { formatUnknownError } from '../../../lib/errors';
import { formatCount, formatDate, plural } from '../../../lib/format';
import { EmptyState, Money, PageHeader, PageSkeleton, SectionCard, StatusChip } from '../../components/ui';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

type SuggestionTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: string;
  account_name: string;
  suggested_category_id: string;
  suggested_category_name: string;
  confidence_score: number | null;
};

type Category = {
  id: string;
  name: string;
};

function confidenceTone(score: number): 'success' | 'info' | 'warning' {
  if (score >= 0.8) return 'success';
  if (score >= 0.6) return 'info';
  return 'warning';
}

function formatTxDate(date: string): string {
  const year = new Date().getFullYear();
  const isCurrentYear = date.startsWith(String(year));
  return formatDate(date, isCurrentYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReviewSuggestionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const toast = useToast();
  const confirm = useConfirm();

  const [transactions, setTransactions] = useState<SuggestionTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [applyingAllOnPage, setApplyingAllOnPage] = useState(false);

  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        // Fetch transactions with suggestions only
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select(
            'id,date,description,amount,source,suggested_category_id,confidence_score,accounts(name),suggested:categories!transactions_suggested_category_id_fkey(name)'
          )
          .is('category_id', null)
          .not('suggested_category_id', 'is', null)
          .order('date', { ascending: false })
          .limit(1000);

        if (txErr) throw txErr;

        const mapped: SuggestionTransaction[] = (txData ?? [])
          .map((r: any) => {
            const account = (r.accounts ?? null) as null | { name?: string };
            const suggested = (r.suggested ?? null) as null | { name?: string };
            const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
            return {
              id: String(r.id),
              date: String(r.date),
              description: String(r.description ?? ''),
              amount: amt,
              source: String(r.source ?? ''),
              account_name: String(account?.name ?? 'Unknown'),
              suggested_category_id: String(r.suggested_category_id ?? ''),
              suggested_category_name: suggested?.name ?? 'Unknown',
              confidence_score:
                typeof r.confidence_score === 'number'
                  ? r.confidence_score
                  : r.confidence_score != null
                    ? parseFloat(String(r.confidence_score))
                    : null,
            };
          })
          .filter((t) => t.suggested_category_id);

        setTransactions(mapped);
      } catch (e) {
        const msg = formatUnknownError(e);
        console.error('Error fetching suggestions:', e);
        setError(msg);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data, error: catErr } = await supabase
        .from('categories')
        .select('id,name')
        .order('name', { ascending: true });
      if (catErr) {
        console.error('Failed to load categories:', catErr);
        return;
      }
      setCategories((data ?? []) as Category[]);
    })();
  }, [supabase]);

  const pageCount = Math.max(1, Math.ceil(transactions.length / rowsPerPage));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return transactions.slice(startIndex, startIndex + rowsPerPage);
  }, [transactions, page]);

  const handleApply = async (tx: SuggestionTransaction) => {
    const categoryId = reviewSelections[tx.id] ?? tx.suggested_category_id;
    if (!categoryId) return;

    setApplyingIds((prev) => new Set(prev).add(tx.id));
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Missing user session');

      const res = await fetch('/api/auto-categorization/apply-suggestion', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: tx.id,
          category_id: categoryId,
          description_snapshot: tx.description,
        }),
      });

      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      // Remove from list
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setReviewSelections((prev) => {
        const next = { ...prev };
        delete next[tx.id];
        return next;
      });
    } catch (e) {
      const msg = formatUnknownError(e);
      toast.error(`Failed to apply category: ${msg}`);
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  };

  const handleSkip = async (tx: SuggestionTransaction) => {
    setSkippingIds((prev) => new Set(prev).add(tx.id));
    try {
      const { error: updErr } = await supabase
        .from('transactions')
        .update({ suggested_category_id: null, confidence_score: null })
        .eq('id', tx.id);

      if (updErr) throw updErr;

      // Remove from list
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setReviewSelections((prev) => {
        const next = { ...prev };
        delete next[tx.id];
        return next;
      });
    } catch (e) {
      const msg = formatUnknownError(e);
      toast.error(`Failed to skip suggestion: ${msg}`);
    } finally {
      setSkippingIds((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  };

  const handleApplyAllOnPage = async () => {
    if (paginatedTransactions.length === 0) return;

    const ok = await confirm({
      title: `Apply ${plural(paginatedTransactions.length, 'suggestion')}?`,
      description: 'Each transaction on this page will be categorized with its selected category. You can re-categorize later from Transactions.',
      confirmLabel: 'Apply all',
    });
    if (!ok) return;

    setApplyingAllOnPage(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      toast.error('Missing user session');
      setApplyingAllOnPage(false);
      return;
    }

    const toApply = paginatedTransactions.map((tx) => ({
      tx,
      categoryId: reviewSelections[tx.id] ?? tx.suggested_category_id,
    })).filter((item) => item.categoryId);

    if (toApply.length === 0) {
      toast.warning('No valid suggestions to apply on this page');
      setApplyingAllOnPage(false);
      return;
    }

    try {
      // Apply all in parallel
      const results = await Promise.allSettled(
        toApply.map((item) =>
          fetch('/api/auto-categorization/apply-suggestion', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              transaction_id: item.tx.id,
              category_id: item.categoryId,
              description_snapshot: item.tx.description,
            }),
          }).then((res) => {
            if (!res.ok) {
              return res.json().then((body) => {
                throw new Error(body.error || `HTTP ${res.status}`);
              });
            }
            return res.json();
          })
        )
      );

      const failed: string[] = [];
      const succeeded: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          succeeded.push(toApply[index].tx.id);
        } else {
          failed.push(toApply[index].tx.id);
          console.error(`Failed to apply ${toApply[index].tx.id}:`, result.reason);
        }
      });

      // Remove succeeded transactions from list
      if (succeeded.length > 0) {
        setTransactions((prev) => prev.filter((t) => !succeeded.includes(t.id)));
        setReviewSelections((prev) => {
          const next = { ...prev };
          succeeded.forEach((id) => delete next[id]);
          return next;
        });
      }

      if (failed.length > 0) {
        toast.error(`Failed to apply ${failed.length} suggestion(s). Check console for details.`);
      } else if (succeeded.length > 0) {
        toast.success(`Applied ${plural(succeeded.length, 'suggestion')}.`);
      }
    } catch (e) {
      const msg = formatUnknownError(e);
      toast.error(`Failed to apply suggestions: ${msg}`);
    } finally {
      setApplyingAllOnPage(false);
    }
  };

  if (loading) {
    return <PageSkeleton stats={0} rows={8} />;
  }

  const pageStart = (page - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(page * rowsPerPage, transactions.length);

  return (
    <Box>
      <PageHeader
        backHref="/transactions"
        backLabel="Transactions"
        title="Review suggestions"
        description={
          transactions.length > 0
            ? `${plural(transactions.length, 'transaction')} with a suggested category. Confirm or adjust each one before applying.`
            : 'Suggested categories from your rules and presets show up here for approval.'
        }
        actions={
          transactions.length > 0 ? (
            <Button
              variant="contained"
              color="success"
              startIcon={applyingAllOnPage ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon />}
              onClick={handleApplyAllOnPage}
              disabled={applyingAllOnPage || paginatedTransactions.length === 0}
            >
              {applyingAllOnPage ? 'Applying…' : `Apply all on page (${formatCount(paginatedTransactions.length)})`}
            </Button>
          ) : null
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {transactions.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<RateReviewIcon />}
          title="No suggestions to review"
          description="Generate suggestions from the Transactions page, then come back here to approve them in bulk."
          actions={
            <Button variant="contained" onClick={() => router.push('/transactions')}>
              Go to Transactions
            </Button>
          }
        />
      ) : (
        <SectionCard
          disablePadding
          footer={
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={1}>
              <Typography variant="caption" color="text.secondary">
                Showing {formatCount(pageStart)}–{formatCount(pageEnd)} of {formatCount(transactions.length)}
              </Typography>
              {transactions.length > rowsPerPage ? (
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  size="small"
                  siblingCount={0}
                />
              ) : null}
            </Stack>
          }
        >
          <TableContainer sx={{ borderRadius: 0 }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 110 }}>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ width: 300 }}>Suggested category</TableCell>
                  <TableCell align="right" sx={{ width: 170 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.map((tx) => {
                  const selectedCategoryId = reviewSelections[tx.id] ?? tx.suggested_category_id;
                  const isApplying = applyingIds.has(tx.id);
                  const isSkipping = skippingIds.has(tx.id);
                  const isBusy = isApplying || isSkipping || applyingAllOnPage;
                  const changed = selectedCategoryId !== tx.suggested_category_id;

                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }} className="tabular-nums">
                        {formatTxDate(tx.date)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" sx={{ fontWeight: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {tx.account_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Money stored={tx.amount} colored />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                            <Select
                              value={selectedCategoryId}
                              onChange={(e) =>
                                setReviewSelections((prev) => ({
                                  ...prev,
                                  [tx.id]: String(e.target.value),
                                }))
                              }
                              disabled={isBusy}
                              inputProps={{ 'aria-label': `Category for ${tx.description}` }}
                            >
                              {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {changed ? (
                            <StatusChip status="edited" tone="neutral" label="Edited" dot={false} />
                          ) : tx.confidence_score != null ? (
                            <StatusChip
                              status="confidence"
                              tone={confidenceTone(tx.confidence_score)}
                              label={`${Math.round(tx.confidence_score * 100)}%`}
                              dot={false}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={isApplying ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                            onClick={() => handleApply(tx)}
                            disabled={isBusy || !selectedCategoryId}
                          >
                            Apply
                          </Button>
                          <Button
                            size="small"
                            color="inherit"
                            startIcon={isSkipping ? <CircularProgress size={14} color="inherit" /> : <CloseIcon />}
                            onClick={() => handleSkip(tx)}
                            disabled={isBusy}
                            sx={{ color: 'text.secondary' }}
                          >
                            Skip
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}
    </Box>
  );
}
