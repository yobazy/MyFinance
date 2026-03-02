'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
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
import {
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../../lib/supabase';
import { formatUnknownError } from '../../../lib/errors';

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

export default function ReviewSuggestionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [transactions, setTransactions] = useState<SuggestionTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());

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

  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return transactions.slice(startIndex, startIndex + rowsPerPage);
  }, [transactions, page]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount
    );

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
      alert(`Failed to apply category: ${msg}`);
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
      alert(`Failed to skip suggestion: ${msg}`);
    } finally {
      setSkippingIds((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/transactions')}>
          Back to Transactions
        </Button>
        <Typography variant="h4">Review Suggestions</Typography>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      {transactions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No suggestions to review
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generate suggestions from the Transactions page, then return here to review them.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/transactions')}>
              Go to Transactions
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {transactions.length} suggestion{transactions.length !== 1 ? 's' : ''} to review.
                Confirm or adjust suggested categories before applying them.
              </Typography>
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Suggested category</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.map((tx) => {
                  const selectedCategoryId = reviewSelections[tx.id] ?? tx.suggested_category_id;
                  const confidencePct =
                    tx.confidence_score != null
                      ? `${Math.round(tx.confidence_score * 100)}%`
                      : null;
                  const isApplying = applyingIds.has(tx.id);
                  const isSkipping = skippingIds.has(tx.id);
                  const isBusy = isApplying || isSkipping;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, wordWrap: 'break-word' }}>
                          {tx.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color={tx.amount > 0 ? 'error.main' : 'success.main'}
                        >
                          {tx.amount > 0 ? '-' : ''}${formatCurrency(Math.abs(tx.amount))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.source} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tx.account_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id={`review-cat-${tx.id}`}>Category</InputLabel>
                            <Select
                              labelId={`review-cat-${tx.id}`}
                              label="Category"
                              value={selectedCategoryId}
                              onChange={(e) =>
                                setReviewSelections((prev) => ({
                                  ...prev,
                                  [tx.id]: String(e.target.value),
                                }))
                              }
                              disabled={isBusy}
                            >
                              {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                  {c.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {confidencePct ? (
                            <Chip
                              label={confidencePct}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={isApplying ? <CircularProgress size={16} /> : <CheckIcon />}
                            onClick={() => handleApply(tx)}
                            disabled={isBusy || !selectedCategoryId}
                          >
                            Apply
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={isSkipping ? <CircularProgress size={16} /> : <CloseIcon />}
                            onClick={() => handleSkip(tx)}
                            disabled={isBusy}
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

          {transactions.length > rowsPerPage ? (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(transactions.length / rowsPerPage)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
