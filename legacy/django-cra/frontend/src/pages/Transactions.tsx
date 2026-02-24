import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Container, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TableSortLabel,
  Pagination,
  IconButton,
  Toolbar,
  Divider,
  Alert,
  Collapse,
  Stack
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  UploadFile as UploadFileIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon,
  AccountBalance as AccountIcon,
  DateRange as DateIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from "@mui/material/styles";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  source: string;
  account: number;
  account_name: string;
  category?: string | null;
  category_name?: string | null;
}

interface Filters {
  search: string;
  source: string;
  account: string;
  category: string;
  amountMin: string;
  amountMax: string;
  dateFrom: string;
  dateTo: string;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDirection = 'asc' | 'desc';

const Transactions = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State management
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(25);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    source: '',
    account: '',
    category: '',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });

  // Unique values for filter dropdowns
  const uniqueSources = useMemo(() => 
    [...new Set(allTransactions.map(t => t.source).filter(Boolean))].sort(),
    [allTransactions]
  );
  
  const uniqueAccounts = useMemo(() => 
    [...new Set(allTransactions.map(t => t.account_name).filter(Boolean))].sort(),
    [allTransactions]
  );
  
  const uniqueCategories = useMemo(() => 
    [...new Set(allTransactions.map(t => t.category_name).filter((cat): cat is string => Boolean(cat)))].sort(),
    [allTransactions]
  );

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/transactions/");
        const data = await response.json();
        setAllTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions.filter(transaction => {
      // Search filter
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Source filter
      if (filters.source && transaction.source !== filters.source) {
        return false;
      }
      
      // Account filter
      if (filters.account && transaction.account_name !== filters.account) {
        return false;
      }
      
      // Category filter
      if (filters.category) {
        if (filters.category === 'uncategorized' && transaction.category_name) {
          return false;
        }
        if (filters.category !== 'uncategorized' && transaction.category_name !== filters.category) {
          return false;
        }
      }
      
      // Amount filters
      const amount = parseFloat(transaction.amount);
      if (filters.amountMin && amount < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && amount > parseFloat(filters.amountMax)) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom && transaction.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && transaction.date > filters.dateTo) {
        return false;
      }
      
      return true;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = String(a.category_name ?? 'zzz_uncategorized').toLowerCase();
          bValue = String(b.category_name ?? 'zzz_uncategorized').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTransactions, filters, sortField, sortDirection]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedTransactions, page, rowsPerPage]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalTransactions = filteredAndSortedTransactions.length;
    const totalIncome = filteredAndSortedTransactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const totalExpenses = filteredAndSortedTransactions
      .filter(t => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const netAmount = totalIncome - totalExpenses;
    const uncategorized = filteredAndSortedTransactions.filter(t => !t.category_name).length;
    
    return {
      totalTransactions,
      totalIncome,
      totalExpenses,
      netAmount,
      uncategorized
    };
  }, [filteredAndSortedTransactions]);

  // Helper function to format currency with commas
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      source: '',
      account: '',
      category: '',
      amountMin: '',
      amountMax: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Source', 'Account', 'Category'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.source,
        t.account_name,
        t.category_name || 'Uncategorized'
      ].join(','))
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

  // Quick filter functions
  const setQuickFilter = (filterType: string) => {
    clearFilters();
    switch (filterType) {
      case 'uncategorized':
        setFilters(prev => ({ ...prev, category: 'uncategorized' }));
        break;
      case 'last30days':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setFilters(prev => ({ ...prev, dateFrom: thirtyDaysAgo.toISOString().split('T')[0] }));
        break;
      case 'expenses':
        setFilters(prev => ({ ...prev, amountMin: '0.01' }));
        break;
      case 'income':
        setFilters(prev => ({ ...prev, amountMax: '-0.01' }));
        break;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Transactions 💳
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
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: theme.shadows[4],
            }
          }}
          onClick={() => navigate('/upload')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <UploadFileIcon sx={{ 
              fontSize: 80, 
              color: theme.palette.primary.main,
              mb: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }} />
            <Typography variant="h5" gutterBottom>
              No transactions yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
              Start by uploading your bank statements to track and manage your transactions.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/upload');
              }}
            >
              Upload Your First Statement
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }} maxWidth="xl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Transactions 💳
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? "primary" : "inherit"}
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

      {/* Summary Statistics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
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
        <Grid item xs={12} sm={6} md={2.4}>
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
        <Grid item xs={12} sm={6} md={2.4}>
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
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography 
                variant="h6" 
                color={summaryStats.netAmount >= 0 ? "success.main" : "error.main"}
              >
                ${formatCurrency(summaryStats.netAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
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

      {/* Quick Filters */}
      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>Quick Filters:</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip 
            label="Uncategorized" 
            variant="outlined" 
            size="small"
            icon={<CategoryIcon />}
            onClick={() => setQuickFilter('uncategorized')}
          />
          <Chip 
            label="Last 30 Days" 
            variant="outlined" 
            size="small"
            icon={<DateIcon />}
            onClick={() => setQuickFilter('last30days')}
          />
          <Chip 
            label="Expenses Only" 
            variant="outlined" 
            size="small"
            icon={<TrendingUpIcon />}
            onClick={() => setQuickFilter('expenses')}
          />
          <Chip 
            label="Income Only" 
            variant="outlined" 
            size="small"
            icon={<TrendingDownIcon />}
            onClick={() => setQuickFilter('income')}
          />
          <Chip 
            label="Clear All Filters" 
            variant="outlined" 
            size="small"
            icon={<ClearIcon />}
            onClick={clearFilters}
            color="secondary"
          />
        </Stack>
      </Box>

      {/* Filters Panel */}
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
                  variant="outlined"
                  size="small"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={filters.source}
                    label="Source"
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  >
                    <MenuItem value="">All Sources</MenuItem>
                    {uniqueSources.map(source => (
                      <MenuItem key={source} value={source}>{source}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account</InputLabel>
                  <Select
                    value={filters.account}
                    label="Account"
                    onChange={(e) => handleFilterChange('account', e.target.value)}
                  >
                    <MenuItem value="">All Accounts</MenuItem>
                    {uniqueAccounts.map(account => (
                      <MenuItem key={account} value={account}>{account}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    <MenuItem value="uncategorized">Uncategorized</MenuItem>
                    {uniqueCategories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Min Amount"
                  variant="outlined"
                  size="small"
                  type="number"
                  value={filters.amountMin}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Max Amount"
                  variant="outlined"
                  size="small"
                  type="number"
                  value={filters.amountMax}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="From Date"
                  variant="outlined"
                  size="small"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="To Date"
                  variant="outlined"
                  size="small"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Results Info */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedTransactions.length} of {filteredAndSortedTransactions.length} transactions
          {filteredAndSortedTransactions.length !== allTransactions.length && 
            ` (filtered from ${allTransactions.length} total)`
          }
        </Typography>
        {filteredAndSortedTransactions.length === 0 && Object.values(filters).some(f => f !== '') && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No transactions match your current filters. Try adjusting your search criteria.
          </Alert>
        )}
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'date'}
                  direction={sortField === 'date' ? sortDirection : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'description'}
                  direction={sortField === 'description' ? sortDirection : 'asc'}
                  onClick={() => handleSort('description')}
                >
                  Description
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'amount'}
                  direction={sortField === 'amount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Amount
                </TableSortLabel>
              </TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortDirection : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  Category
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((transaction) => {
              const amount = parseFloat(transaction.amount);
              const isExpense = amount > 0;
              
              return (
                <TableRow 
                  key={transaction.id}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: theme.palette.action.hover 
                    }
                  }}
                >
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, wordWrap: 'break-word' }}>
                      {transaction.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      color={isExpense ? "error.main" : "success.main"}
                    >
                      {isExpense ? '-' : ''}${formatCurrency(Math.abs(amount))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.source} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccountIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {transaction.account_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {transaction.category_name ? (
                      <Chip 
                        label={transaction.category_name} 
                        size="small" 
                        color="secondary"
                        variant="filled"
                      />
                    ) : (
                      <Chip 
                        label="Uncategorized" 
                        size="small" 
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredAndSortedTransactions.length > rowsPerPage && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(filteredAndSortedTransactions.length / rowsPerPage)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Container>
  );
};

export default Transactions;
