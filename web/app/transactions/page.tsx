'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  Grid,
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
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import {
  Clear as ClearIcon,
  DateRange as DateIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Search as SearchIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  AccountBalance as AccountIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: string;
  account_name: string;
  category_name: string | null;
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

export default function TransactionsPage() {
  const router = useRouter();
  const theme = useTheme();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const rowsPerPage = 25;

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [filters, setFilters] = useState<Filters>({
    search: '',
    source: '',
    account: '',
    category: '',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id,date,description,amount,source,accounts(name),categories(name)')
          .order('date', { ascending: false })
          .limit(2000);
        if (error) throw error;
        const mapped: Transaction[] = (data ?? []).map((r: any) => {
          const account = (r.accounts ?? null) as null | { name?: string };
          const category = (r.categories ?? null) as null | { name?: string };
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return {
            id: String(r.id),
            date: String(r.date),
            description: String(r.description ?? ''),
            amount: amt,
            source: String(r.source ?? ''),
            account_name: String(account?.name ?? 'Unknown'),
            category_name: category?.name ?? null,
          };
        });
        setAllTransactions(mapped);
      } catch (e) {
        console.error('Error fetching transactions:', e);
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
    let filtered = allTransactions.filter((t) => {
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount
    );

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
    setFilters({
      search: '',
      source: '',
      account: '',
      category: '',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: '',
    });
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

  const setQuickFilter = (filterType: 'uncategorized' | 'last30days' | 'expenses' | 'income') => {
    clearFilters();
    if (filterType === 'uncategorized') {
      setFilters((prev) => ({ ...prev, category: 'uncategorized' }));
    } else if (filterType === 'last30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFilters((prev) => ({ ...prev, dateFrom: d.toISOString().slice(0, 10) }));
    } else if (filterType === 'expenses') {
      setFilters((prev) => ({ ...prev, amountMin: '0.01' }));
    } else if (filterType === 'income') {
      setFilters((prev) => ({ ...prev, amountMax: '-0.01' }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Transactions
        </Typography>
        <Card
          sx={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: theme.shadows[3] },
          }}
          onClick={() => router.push('/upload')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <UploadFileIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No transactions yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
              Start by uploading your bank statements to track and manage your transactions.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => router.push('/upload')}>
              Upload Your First Statement
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h4">Transactions</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? 'primary' : 'inherit'}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            disabled={filteredAndSortedTransactions.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                {summaryStats.totalTransactions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <TrendingDownIcon color="success" />
                <Typography variant="h6" color="success.main">
                  ${formatCurrency(summaryStats.totalIncome)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Income
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <TrendingUpIcon color="error" />
                <Typography variant="h6" color="error.main">
                  ${formatCurrency(summaryStats.totalExpenses)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color={summaryStats.netAmount >= 0 ? 'success.main' : 'error.main'}>
                ${formatCurrency(summaryStats.netAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4 as any}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="warning.main">
                {summaryStats.uncategorized}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uncategorized
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Filters:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="Uncategorized" variant="outlined" size="small" icon={<CategoryIcon />} onClick={() => setQuickFilter('uncategorized')} />
          <Chip label="Last 30 Days" variant="outlined" size="small" icon={<DateIcon />} onClick={() => setQuickFilter('last30days')} />
          <Chip label="Expenses Only" variant="outlined" size="small" icon={<TrendingUpIcon />} onClick={() => setQuickFilter('expenses')} />
          <Chip label="Income Only" variant="outlined" size="small" icon={<TrendingDownIcon />} onClick={() => setQuickFilter('income')} />
          <Chip label="Clear All Filters" variant="outlined" size="small" icon={<ClearIcon />} onClick={clearFilters} color="secondary" />
        </Stack>
      </Box>

      <Collapse in={showFilters}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search Description"
                  size="small"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select value={filters.source} label="Source" onChange={(e) => handleFilterChange('source', e.target.value)}>
                    <MenuItem value="">All Sources</MenuItem>
                    {uniqueSources.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account</InputLabel>
                  <Select value={filters.account} label="Account" onChange={(e) => handleFilterChange('account', e.target.value)}>
                    <MenuItem value="">All Accounts</MenuItem>
                    {uniqueAccounts.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={filters.category} label="Category" onChange={(e) => handleFilterChange('category', e.target.value)}>
                    <MenuItem value="">All Categories</MenuItem>
                    <MenuItem value="uncategorized">Uncategorized</MenuItem>
                    {uniqueCategories.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="Min Amount" size="small" type="number" value={filters.amountMin} onChange={(e) => handleFilterChange('amountMin', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="Max Amount" size="small" type="number" value={filters.amountMax} onChange={(e) => handleFilterChange('amountMax', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="From Date" size="small" type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="To Date" size="small" type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedTransactions.length} of {filteredAndSortedTransactions.length} transactions
          {filteredAndSortedTransactions.length !== allTransactions.length ? ` (filtered from ${allTransactions.length} total)` : ''}
        </Typography>
        {filteredAndSortedTransactions.length === 0 && Object.values(filters).some((f) => f !== '') ? (
          <Alert severity="info">No transactions match your filters.</Alert>
        ) : null}
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 'none',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={sortField === 'date'} direction={sortField === 'date' ? sortDirection : 'asc'} onClick={() => handleSort('date')}>
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortField === 'description'} direction={sortField === 'description' ? sortDirection : 'asc'} onClick={() => handleSort('description')}>
                  Description
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortField === 'amount'} direction={sortField === 'amount' ? sortDirection : 'asc'} onClick={() => handleSort('amount')}>
                  Amount
                </TableSortLabel>
              </TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>
                <TableSortLabel active={sortField === 'category'} direction={sortField === 'category' ? sortDirection : 'asc'} onClick={() => handleSort('category')}>
                  Category
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((t) => {
              const isExpense = t.amount > 0;
              return (
                <TableRow key={t.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                  <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, wordWrap: 'break-word' }}>
                      {t.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium" color={isExpense ? 'error.main' : 'success.main'}>
                      {isExpense ? '-' : ''}${formatCurrency(Math.abs(t.amount))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.source} size="small" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccountIcon fontSize="small" color="action" />
                      <Typography variant="body2">{t.account_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {t.category_name ? (
                      <Chip
                        label={t.category_name}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={(t) => ({
                          backgroundColor:
                            t.palette.mode === 'dark'
                              ? 'rgba(236,231,220,0.04)'
                              : 'rgba(11,18,32,0.03)',
                          borderColor:
                            t.palette.mode === 'dark'
                              ? 'rgba(236,231,220,0.14)'
                              : 'rgba(11,18,32,0.12)',
                        })}
                      />
                    ) : (
                      <Chip label="Uncategorized" size="small" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAndSortedTransactions.length > rowsPerPage ? (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(filteredAndSortedTransactions.length / rowsPerPage)}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      ) : null}
    </Box>
  );
}

