'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
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
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/SearchRounded';
import FilterListIcon from '@mui/icons-material/FilterListRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongRounded';
import ArrowDownwardIcon from '@mui/icons-material/SouthRounded';
import ArrowUpwardIcon from '@mui/icons-material/NorthRounded';
import CategoryIcon from '@mui/icons-material/CategoryRounded';
import RateReviewIcon from '@mui/icons-material/RateReviewRounded';
import UploadFileIcon from '@mui/icons-material/UploadFileRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import RuleIcon from '@mui/icons-material/RuleRounded';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { formatUnknownError } from '../../lib/errors';
import { formatCount, formatDate, formatMoney, formatRelative, plural } from '../../lib/format';
import { CategoryChip, EmptyState, Money, PageHeader, PageSkeleton, SectionCard, SegmentedControl, StatCard } from '../components/ui';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: string;
  account_name: string;
  category_name: string | null;
  category_color: string | null;
  auto_categorized: boolean;
  suggested_category_name: string | null;
  suggested_category_color: string | null;
  confidence_score: number | null;
  suggested_category_id: string | null;
};

type Filters = {
  search: string;
  source: string;
  account: string;
  category: string;
  amountMin: string;
  amountMax: string;
  dateFrom: string;
  dateTo: string;
};

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';
type QuickFilter = 'uncategorized' | 'last30days' | 'expenses' | 'income';

const EMPTY_FILTERS: Filters = {
  search: '',
  source: '',
  account: '',
  category: '',
  amountMin: '',
  amountMax: '',
  dateFrom: '',
  dateTo: '',
};

function last30DaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatTxDate(date: string): string {
  const year = new Date().getFullYear();
  const isCurrentYear = date.startsWith(String(year));
  return formatDate(date, isCurrentYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('plaid')) return 'Plaid';
  if (s.includes('amex')) return 'Amex upload';
  if (s.includes('upload')) return 'Upload';
  return source;
}

export default function TransactionsPage() {
  const router = useRouter();
  const theme = useTheme();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [autoCatMode, setAutoCatMode] = useState<'auto' | 'suggestions_only'>('suggestions_only');
  const [autoCatBusy, setAutoCatBusy] = useState(false);
  const [autoCatMessage, setAutoCatMessage] = useState<string | null>(null);
  const [autoCatProgress, setAutoCatProgress] = useState<number>(0);
  const [autoCatLogs, setAutoCatLogs] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);

        // Supabase PostgREST has a default max limit of 1000 rows per query.
        // We need to fetch in batches to get all transactions.
        const batchSize = 1000;
        let allData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('transactions')
            // `transactions` has two FKs to `categories` (category_id + suggested_category_id),
            // so we must disambiguate which relationship to embed.
            .select(
              'id,date,description,amount,source,auto_categorized,confidence_score,suggested_category_id,accounts(name),categories:categories!transactions_category_id_fkey(name,color),suggested:categories!transactions_suggested_category_id_fkey(name,color)'
            )
            .order('date', { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (error) throw error;

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allData = allData.concat(data);
            // If we got fewer rows than the batch size, we've reached the end
            if (data.length < batchSize) {
              hasMore = false;
            } else {
              offset += batchSize;
            }
          }
        }

        const mapped: Transaction[] = allData.map((r: any) => {
          const account = (r.accounts ?? null) as null | { name?: string };
          const category = (r.categories ?? null) as null | { name?: string; color?: string };
          const suggested = (r.suggested ?? null) as null | { name?: string; color?: string };
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return {
            id: String(r.id),
            date: String(r.date),
            description: String(r.description ?? ''),
            amount: amt,
            source: String(r.source ?? ''),
            account_name: String(account?.name ?? 'Unknown'),
            category_name: category?.name ?? null,
            category_color: category?.color ?? null,
            auto_categorized: Boolean(r.auto_categorized),
            suggested_category_name: suggested?.name ?? null,
            suggested_category_color: suggested?.color ?? null,
            confidence_score:
              typeof r.confidence_score === 'number'
                ? r.confidence_score
                : r.confidence_score != null
                  ? parseFloat(String(r.confidence_score))
                  : null,
            suggested_category_id: r.suggested_category_id
              ? String(r.suggested_category_id)
              : null,
          };
        });
        setAllTransactions(mapped);
      } catch (e) {
        const msg = formatUnknownError(e);
        console.error('Error fetching transactions:', e);
        setLoadError(msg);
        setAllTransactions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const uniqueSources = useMemo(
    () => [...new Set(allTransactions.map((t) => t.source).filter(Boolean))].sort(),
    [allTransactions]
  );
  const uniqueAccounts = useMemo(
    () => [...new Set(allTransactions.map((t) => t.account_name).filter(Boolean))].sort(),
    [allTransactions]
  );
  const uniqueCategories = useMemo(
    () =>
      [...new Set(allTransactions.map((t) => t.category_name).filter(Boolean) as string[])].sort(),
    [allTransactions]
  );

  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = allTransactions.filter((t) => {
      if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase()))
        return false;
      if (filters.source && t.source !== filters.source) return false;
      if (filters.account && t.account_name !== filters.account) return false;
      if (filters.category) {
        if (filters.category === 'uncategorized' && t.category_name) return false;
        if (filters.category !== 'uncategorized' && t.category_name !== filters.category)
          return false;
      }
      if (filters.amountMin && t.amount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && t.amount > parseFloat(filters.amountMax)) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = String(a.category_name ?? 'zzz_uncategorized').toLowerCase();
          bValue = String(b.category_name ?? 'zzz_uncategorized').toLowerCase();
          break;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTransactions, filters, sortDirection, sortField]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedTransactions, page]);

  const summaryStats = useMemo(() => {
    const totalTransactions = filteredAndSortedTransactions.length;
    const totalIncome = filteredAndSortedTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = filteredAndSortedTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const netAmount = totalIncome - totalExpenses;
    const uncategorized = filteredAndSortedTransactions.filter((t) => !t.category_name).length;
    return { totalTransactions, totalIncome, totalExpenses, netAmount, uncategorized };
  }, [filteredAndSortedTransactions]);

  const pendingSuggestionCount = useMemo(
    () => allTransactions.filter((t) => !t.category_name && t.suggested_category_id).length,
    [allTransactions]
  );

  const latestDate = useMemo(() => {
    let latest: string | null = null;
    for (const t of allTransactions) if (!latest || t.date > latest) latest = t.date;
    return latest;
  }, [allTransactions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Source', 'Account', 'Category'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedTransactions.map((t) =>
        [
          t.date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.amount,
          t.source,
          t.account_name,
          t.category_name || 'Uncategorized',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const runAutoCategorization = async () => {
    setAutoCatMessage(null);
    setAutoCatBusy(true);
    setAutoCatProgress(0);
    setAutoCatLogs([]);

    let success = false;

    const addLog = (message: string) => {
      setAutoCatLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const updateProgress = (progress: number) => {
      setAutoCatProgress(Math.min(100, Math.max(0, progress)));
    };

    try {
      addLog('Starting auto-categorization...');
      updateProgress(5);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        throw new Error('Missing user session');
      }

      addLog('Fetching uncategorized transactions...');
      updateProgress(15);

      // Get count of uncategorized transactions for progress estimation
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .is('category_id', null);

      const totalUncategorized = count ?? 0;
      addLog(`Found ${totalUncategorized} uncategorized transaction${totalUncategorized !== 1 ? 's' : ''} to process`);
      updateProgress(25);

      if (totalUncategorized === 0) {
        addLog('No uncategorized transactions found. Nothing to process.');
        setAutoCatMessage('No uncategorized transactions found.');
        setAutoCatBusy(false);
        return;
      }

      addLog('Processing transactions and applying categorization rules...');
      updateProgress(30);

      // Use streaming API for real-time progress updates
      const res = await fetch('/api/auto-categorization/apply', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: autoCatMode }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalTransactions = totalUncategorized;
      let processed = 0;
      let matched = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'progress') {
                  totalTransactions = data.total;
                  processed = data.current;
                  matched = data.matched;
                  const progressPercent = 30 + data.progress * 0.6; // 30% to 90% for processing
                  updateProgress(progressPercent);
                  addLog(data.message || `Processing transaction ${data.current} of ${data.total}${data.matched > 0 ? ` (${data.matched} matched)` : ''}`);
                } else if (data.type === 'status') {
                  addLog(data.message);
                  updateProgress(90);
                } else if (data.type === 'complete') {
                  processed = data.rowsProcessed ?? 0;
                  matched = data.matched ?? 0;
                  updateProgress(100);
                  addLog(`Successfully processed ${processed} transaction${processed !== 1 ? 's' : ''}${matched > 0 ? ` (${matched} with suggestions)` : ''}`);
                  success = true;
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Unknown error');
                }
              } catch (parseError) {
                // Ignore JSON parse errors for malformed lines
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      void totalTransactions;

      if (!success) {
        throw new Error('Stream completed without success message');
      }

      setAutoCatMessage(
        `Suggestions updated for ${processed} transaction${processed !== 1 ? 's' : ''}. Review and apply them on the review page.`,
      );
    } catch (e) {
      const msg = formatUnknownError(e);
      addLog(`Error: ${msg}`);
      setAutoCatMessage(`Failed to run auto-categorization: ${msg}`);
      updateProgress(0);
    } finally {
      setAutoCatBusy(false);
      // Keep progress at 100% for a moment before resetting (only on success)
      if (success) {
        setTimeout(() => {
          setAutoCatProgress(0);
        }, 2000);
      }
    }
  };

  const quickFilterActive: Record<QuickFilter, boolean> = {
    uncategorized: filters.category === 'uncategorized',
    last30days: filters.dateFrom === last30DaysISO() && !filters.dateTo,
    expenses: filters.amountMin === '0.01',
    income: filters.amountMax === '-0.01',
  };

  const setQuickFilter = (filterType: QuickFilter) => {
    if (quickFilterActive[filterType]) {
      clearFilters();
      return;
    }
    clearFilters();
    if (filterType === 'uncategorized') {
      setFilters((prev) => ({ ...prev, category: 'uncategorized' }));
    } else if (filterType === 'last30days') {
      setFilters((prev) => ({ ...prev, dateFrom: last30DaysISO() }));
    } else if (filterType === 'expenses') {
      setFilters((prev) => ({ ...prev, amountMin: '0.01' }));
    } else if (filterType === 'income') {
      setFilters((prev) => ({ ...prev, amountMax: '-0.01' }));
    }
  };

  const advancedFilterCount = (['source', 'account', 'category', 'amountMin', 'amountMax', 'dateFrom', 'dateTo'] as const).filter(
    (k) => filters[k] !== ''
  ).length;
  const anyFilterActive = Object.values(filters).some((f) => f !== '');

  if (loading) {
    return <PageSkeleton stats={5} rows={8} />;
  }

  if (loadError) {
    return (
      <Box>
        <PageHeader title="Transactions" />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          Failed to load transactions: {loadError}
        </Alert>
      </Box>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Box>
        <PageHeader title="Transactions" description="Every transaction across your accounts, in one searchable list." />
        <EmptyState
          size="lg"
          icon={<ReceiptLongIcon />}
          title="No transactions yet"
          description="Connect a bank through Plaid or upload an Amex statement to start tracking where your money goes."
          actions={
            <>
              <Button variant="contained" startIcon={<LinkIcon />} onClick={() => router.push('/accounts')}>
                Connect bank
              </Button>
              <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => router.push('/upload')}>
                Upload statement
              </Button>
            </>
          }
        />
      </Box>
    );
  }

  const pageStart = (page - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(page * rowsPerPage, filteredAndSortedTransactions.length);
  const isDark = theme.palette.mode === 'dark';

  const sortLabel = (field: SortField, label: string) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortDirection : 'desc'}
      onClick={() => handleSort(field)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <Box>
      <PageHeader
        title="Transactions"
        description={
          <>
            {plural(allTransactions.length, 'transaction')}
            {latestDate ? ` · updated ${formatRelative(latestDate)}` : ''}
          </>
        }
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={filteredAndSortedTransactions.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setShowAutomation((v) => !v)}
            >
              Generate suggestions
            </Button>
          </>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard label="Transactions" value={formatCount(summaryStats.totalTransactions)} icon={<ReceiptLongIcon />} />
        <StatCard label="Income" value={formatMoney(summaryStats.totalIncome)} tone="positive" icon={<ArrowDownwardIcon />} />
        <StatCard label="Spending" value={formatMoney(summaryStats.totalExpenses)} tone="negative" icon={<ArrowUpwardIcon />} />
        <StatCard
          label="Net"
          value={`${summaryStats.netAmount < 0 ? '−' : ''}${formatMoney(Math.abs(summaryStats.netAmount))}`}
          tone={summaryStats.netAmount >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Uncategorized"
          value={formatCount(summaryStats.uncategorized)}
          tone="warning"
          icon={<CategoryIcon />}
          hint={quickFilterActive.uncategorized ? 'Showing only these' : 'Click to filter'}
          onClick={() => setQuickFilter('uncategorized')}
        />
      </Box>

      <Collapse in={showAutomation} unmountOnExit>
        <SectionCard
          title="Auto-categorization"
          description="Match uncategorized transactions against your rules and presets."
          icon={<AutoAwesomeIcon />}
          action={
            <Button size="small" startIcon={<RuleIcon />} onClick={() => router.push('/rules')}>
              Manage rules
            </Button>
          }
          sx={{ mb: 3 }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5} flexWrap="wrap">
              <SegmentedControl
                aria-label="Categorization mode"
                value={autoCatMode}
                onChange={(v) => setAutoCatMode(v)}
                options={[
                  { value: 'suggestions_only', label: 'Suggestions only' },
                  { value: 'auto', label: 'Auto-apply' },
                ]}
              />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {autoCatMode === 'auto'
                  ? 'Confident matches are applied immediately.'
                  : 'Matches become suggestions you review before applying.'}
              </Typography>
              <Button
                variant="contained"
                disabled={autoCatBusy || allTransactions.length === 0}
                onClick={runAutoCategorization}
                startIcon={autoCatBusy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              >
                {autoCatBusy ? 'Running…' : 'Run now'}
              </Button>
            </Stack>

            {autoCatBusy || autoCatProgress > 0 ? (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary">
                    {autoCatBusy ? 'Processing transactions…' : 'Done'}
                  </Typography>
                  <Typography variant="caption" className="tabular-nums" sx={{ fontWeight: 600 }}>
                    {Math.round(autoCatProgress)}%
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={autoCatProgress} />
              </Box>
            ) : null}

            {autoCatLogs.length > 0 ? (
              <Box
                sx={{
                  maxHeight: 180,
                  overflow: 'auto',
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#000', 0.25) : alpha(theme.palette.text.primary, 0.03),
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: '0.74rem',
                  lineHeight: 1.6,
                  color: 'text.secondary',
                }}
              >
                {autoCatLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </Box>
            ) : null}

            {autoCatMessage && !autoCatBusy ? (
              <Alert severity={autoCatMessage.toLowerCase().startsWith('failed') ? 'error' : 'success'}>
                {autoCatMessage}
              </Alert>
            ) : null}
          </Stack>
        </SectionCard>
      </Collapse>

      {pendingSuggestionCount > 0 ? (
        <SectionCard
          sx={{
            mb: 3,
            bgcolor: alpha(theme.palette.primary.main, isDark ? 0.1 : 0.05),
            borderColor: alpha(theme.palette.primary.main, isDark ? 0.3 : 0.2),
          }}
          bodySx={{ py: 2 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
            <Stack direction="row" gap={1.5} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                }}
              >
                <RateReviewIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1">Suggestions ready for review</Typography>
                <Typography variant="body2" color="text.secondary">
                  {plural(pendingSuggestionCount, 'transaction')} have a suggested category waiting for your approval.
                </Typography>
              </Box>
            </Stack>
            <Button variant="contained" onClick={() => router.push('/transactions/review')} sx={{ flexShrink: 0 }}>
              Review {formatCount(pendingSuggestionCount)} suggestion{pendingSuggestionCount === 1 ? '' : 's'}
            </Button>
          </Stack>
        </SectionCard>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search descriptions…"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: { md: 260 } }}
        />
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap alignItems="center">
          {(
            [
              ['uncategorized', 'Uncategorized'],
              ['last30days', 'Last 30 days'],
              ['expenses', 'Expenses'],
              ['income', 'Income'],
            ] as [QuickFilter, string][]
          ).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              size="small"
              clickable
              color={quickFilterActive[key] ? 'primary' : 'default'}
              variant={quickFilterActive[key] ? 'filled' : 'outlined'}
              onClick={() => setQuickFilter(key)}
            />
          ))}
          <Badge badgeContent={advancedFilterCount} color="primary" overlap="rectangular">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters((v) => !v)}
              sx={showFilters ? { borderColor: 'primary.main', color: 'primary.main' } : undefined}
            >
              Filters
            </Button>
          </Badge>
          {anyFilterActive ? (
            <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Collapse in={showFilters} unmountOnExit>
        <SectionCard sx={{ mb: 2 }} bodySx={{ pt: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 1.5,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select value={filters.source} label="Source" onChange={(e) => handleFilterChange('source', e.target.value)}>
                <MenuItem value="">All sources</MenuItem>
                {uniqueSources.map((s) => (
                  <MenuItem key={s} value={s}>
                    {sourceLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Account</InputLabel>
              <Select value={filters.account} label="Account" onChange={(e) => handleFilterChange('account', e.target.value)}>
                <MenuItem value="">All accounts</MenuItem>
                {uniqueAccounts.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={filters.category} label="Category" onChange={(e) => handleFilterChange('category', e.target.value)}>
                <MenuItem value="">All categories</MenuItem>
                <MenuItem value="uncategorized">Uncategorized</MenuItem>
                {uniqueCategories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                fullWidth
                label="Min amount"
                size="small"
                type="number"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
              />
              <TextField
                fullWidth
                label="Max amount"
                size="small"
                type="number"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
              />
            </Box>
            <TextField
              fullWidth
              label="From date"
              size="small"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="To date"
              size="small"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </SectionCard>
      </Collapse>

      {filteredAndSortedTransactions.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No transactions match"
          description="Try a different search or clear the active filters."
          actions={
            <Button variant="outlined" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <SectionCard
          disablePadding
          footer={
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={1}>
              <Typography variant="caption" color="text.secondary">
                Showing {formatCount(pageStart)}–{formatCount(pageEnd)} of {formatCount(filteredAndSortedTransactions.length)}
                {filteredAndSortedTransactions.length !== allTransactions.length
                  ? ` (filtered from ${formatCount(allTransactions.length)})`
                  : ''}
              </Typography>
              {filteredAndSortedTransactions.length > rowsPerPage ? (
                <Pagination
                  count={Math.ceil(filteredAndSortedTransactions.length / rowsPerPage)}
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
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 110 }}>{sortLabel('date', 'Date')}</TableCell>
                  <TableCell>{sortLabel('description', 'Description')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Account</TableCell>
                  <TableCell>{sortLabel('category', 'Category')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Source</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    {sortLabel('amount', 'Amount')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }} className="tabular-nums">
                      {formatTxDate(t.date)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" sx={{ fontWeight: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: { xs: 'block', md: 'none' } }}
                        noWrap
                      >
                        {t.account_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t.account_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        {t.category_name ? (
                          <CategoryChip name={t.category_name} color={t.category_color} />
                        ) : t.suggested_category_name ? (
                          <CategoryChip
                            name={t.suggested_category_name}
                            color={t.suggested_category_color}
                            suggested
                            confidence={t.confidence_score}
                          />
                        ) : (
                          <CategoryChip name={null} />
                        )}
                        {t.category_name && t.auto_categorized ? (
                          <Chip
                            label="Auto"
                            size="small"
                            sx={{ height: 18, fontSize: '0.64rem', '& .MuiChip-label': { px: 0.75 } }}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {sourceLabel(t.source)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Money stored={t.amount} colored />
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
