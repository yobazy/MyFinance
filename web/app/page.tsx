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
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  AutoAwesome as AutoAwesomeIcon,
  Category as CategoryIcon,
  Link as LinkIcon,
  TrendingUp as TrendingUpIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../lib/supabase';
import { formatUnknownError } from '../lib/errors';
import type { Account } from '../lib/types';
import { useAuth } from '../lib/auth/AuthContext';
import PublicLanding from './components/PublicLanding';

type RecentTx = {
  date: string;
  description: string;
  amount: number;
  category_name?: string | null;
  account_name?: string | null;
  account_bank?: string | null;
};

type DashboardData = {
  totalBalance: number;
  monthlySpending: number;
  lastMonthTransactionDate: string | null;
  hasAnyTransactions: boolean;
  hasMonthTransactions: boolean;
  recentTransactions: RecentTx[];
};

type BalanceOverTime = {
  date: string;
  balance: number;
};

type BalancePeriod = '1m' | '3m' | '6m' | '1y' | 'all';

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceRollupByAccountId, setBalanceRollupByAccountId] = useState<
    Record<string, { txSum: number; txCount: number }>
  >({});
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [balanceOverTime, setBalanceOverTime] = useState<BalanceOverTime[]>([]);
  const [balancePeriod, setBalancePeriod] = useState<BalancePeriod>('3m');
  const [reviewSuggestionCount, setReviewSuggestionCount] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_account_balance_rollup');
      if (error) {
        setErrorMessage(`Failed to load balances: ${error.message}`);
        setBalanceRollupByAccountId({});
        return;
      }
      const map: Record<string, { txSum: number; txCount: number }> = {};
      for (const row of (data ?? []) as any[]) {
        const accountId = String(row.account_id ?? '');
        if (!accountId) continue;
        map[accountId] = {
          txSum: Number(row.tx_sum ?? 0),
          txCount: Number(row.tx_count ?? 0),
        };
      }
      setBalanceRollupByAccountId(map);
    })();
  }, [isAuthenticated, supabase]);

  const getDisplayedBalance = useMemo(() => {
    return (account: Account | null | undefined): number => {
      if (!account) return 0;
      const stored = Number(account.balance ?? 0);
      const rollup = balanceRollupByAccountId[account.id];
      const computed = Number(rollup?.txSum ?? 0);
      const hasTx = Number(rollup?.txCount ?? 0) > 0;
      // If stored balance exists, use it (it should be correct)
      // Otherwise, for computed balance: In this system, expenses are positive and income is negative.
      // For account balance: income increases balance (should be positive), expenses decrease it (should be negative).
      // So we need to invert the sign: balance = -sum(transactions)
      if (stored !== 0) return stored;
      if (hasTx) return -computed; // Invert sign because expenses are + and income is -
      return stored;
    };
  }, [balanceRollupByAccountId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) {
        setErrorMessage(`Failed to load accounts: ${error.message}`);
        setAccounts([]);
        return;
      }
      setErrorMessage(null);
      setAccounts((data ?? []) as Account[]);
    })();
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { count, error } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .is('category_id', null)
        .not('suggested_category_id', 'is', null);
      if (error) {
        setReviewSuggestionCount(0);
        return;
      }
      setReviewSuggestionCount(count ?? 0);
    })();
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const filteredAccount =
          selectedAccountId === 'all'
            ? null
            : accounts.find((a) => a.id === selectedAccountId) ?? null;

        const totalBalance =
          selectedAccountId === 'all'
            ? accounts.reduce((sum, a) => sum + getDisplayedBalance(a), 0)
            : getDisplayedBalance(filteredAccount);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startISO = startOfMonth.toISOString().slice(0, 10);
        const endISO = now.toISOString().slice(0, 10);

        let txForMonth = supabase
          .from('transactions')
          .select('amount,date')
          .gte('date', startISO)
          .lte('date', endISO)
          .order('date', { ascending: false });

        let recentTxQuery = supabase
          .from('transactions')
          .select(
            'date,description,amount,accounts(name,bank),categories:categories!transactions_category_id_fkey(name)'
          )
          .order('date', { ascending: false })
          .limit(8);

        if (selectedAccountId !== 'all') {
          txForMonth = txForMonth.eq('account_id', selectedAccountId);
          recentTxQuery = recentTxQuery.eq('account_id', selectedAccountId);
        }

        const [monthRes, recentRes] = await Promise.all([txForMonth, recentTxQuery]);
        if (monthRes.error) throw monthRes.error;
        if (recentRes.error) throw recentRes.error;

        const monthRows = monthRes.data;
        const recentRows = recentRes.data;

        const monthTransactionCount = monthRows?.length ?? 0;
        const hasMonthTransactions = monthTransactionCount > 0;
        const hasAnyTransactions = (recentRows?.length ?? 0) > 0;

        const monthlySpending = (monthRows ?? []).reduce((sum, r) => {
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return amt > 0 ? sum + amt : sum;
        }, 0);

        const lastMonthTransactionDate = hasMonthTransactions
          ? ((monthRows?.[0]?.date as string | undefined) ?? null)
          : null;

        const recentTransactions: RecentTx[] = (recentRows ?? []).map((r) => {
          const account = (r.accounts ?? null) as null | { name?: string; bank?: string };
          const category = (r.categories ?? null) as null | { name?: string };
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return {
            date: String(r.date),
            description: String(r.description ?? ''),
            amount: amt,
            category_name: category?.name ?? null,
            account_name: account?.name ?? null,
            account_bank: account?.bank ?? null,
          };
        });

        setDashboardData({
          totalBalance,
          monthlySpending,
          lastMonthTransactionDate,
          hasAnyTransactions,
          hasMonthTransactions,
          recentTransactions,
        });

        // Fetch balance over time data
        // Calculate date range based on period
        const getPeriodStartDate = (period: BalancePeriod): string | null => {
          if (period === 'all') return null;
          const now = new Date();
          const start = new Date(now);
          if (period === '1m') {
            start.setMonth(start.getMonth() - 1);
          } else if (period === '3m') {
            start.setMonth(start.getMonth() - 3);
          } else if (period === '6m') {
            start.setMonth(start.getMonth() - 6);
          } else if (period === '1y') {
            start.setFullYear(start.getFullYear() - 1);
          }
          return start.toISOString().split('T')[0];
        };

        let balanceQuery = supabase
          .from('transactions')
          .select('date,amount')
          .order('date', { ascending: true });

        if (selectedAccountId !== 'all') {
          balanceQuery = balanceQuery.eq('account_id', selectedAccountId);
        }

        const periodStart = getPeriodStartDate(balancePeriod);
        if (periodStart) {
          balanceQuery = balanceQuery.gte('date', periodStart);
        }

        const { data: balanceData, error: balanceError } = await balanceQuery;
        if (balanceError) throw balanceError;

        // Calculate running balance
        // In this system: expenses are positive, income is negative
        // For balance calculation: we need to invert the sign
        // because expenses should decrease balance and income should increase it
        const balanceMap = new Map<string, number>();
        let runningBalance = 0;

        // Get current balance using the same logic as getDisplayedBalance
        let currentBalance = 0;
        if (selectedAccountId === 'all') {
          currentBalance = accounts.reduce((sum, a) => {
            const stored = Number(a.balance ?? 0);
            const rollup = balanceRollupByAccountId[a.id];
            const computed = Number(rollup?.txSum ?? 0);
            const hasTx = Number(rollup?.txCount ?? 0) > 0;
            // Use stored if available, otherwise invert computed (since expenses are +, income is -)
            const accountBalance = stored !== 0 ? stored : (hasTx ? -computed : 0);
            return sum + accountBalance;
          }, 0);
        } else {
          const account = accounts.find((a) => a.id === selectedAccountId);
          if (account) {
            const stored = Number(account.balance ?? 0);
            const rollup = balanceRollupByAccountId[account.id];
            const computed = Number(rollup?.txSum ?? 0);
            const hasTx = Number(rollup?.txCount ?? 0) > 0;
            currentBalance = stored !== 0 ? stored : (hasTx ? -computed : 0);
          }
        }

        // Calculate starting balance for the period
        // If we have a period filter, calculate the balance at the start of the period
        // by subtracting the net change from transactions in the period
        if (periodStart && balanceData && balanceData.length > 0) {
          // Sum of transactions in the period (as stored: expenses positive, income negative)
          const periodSum = (balanceData ?? []).reduce((sum, tx) => {
            const amt = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount));
            return sum + amt;
          }, 0);
          // Balance at start of period = current balance - net change in period
          // Since expenses (positive) decrease balance and income (negative) increases it,
          // the periodSum already represents the net change with correct sign
          // So: startBalance = currentBalance - periodSum
          // Then as we process transactions with runningBalance -= amount:
          // - Expense (+$50): balance -= $50 (decreases) ✓
          // - Income (-$100): balance -= (-$100) = balance + $100 (increases) ✓
          runningBalance = currentBalance - periodSum;
        } else {
          // For "all time", start from 0 and build up
          runningBalance = 0;
        }

        // Group transactions by date and calculate cumulative balance
        const sortedTxs = (balanceData ?? []).sort((a, b) => {
          const dateA = new Date(a.date as string).getTime();
          const dateB = new Date(b.date as string).getTime();
          return dateA - dateB;
        });

        // Store the starting balance if we have transactions
        if (sortedTxs.length > 0) {
          const firstDate = String(sortedTxs[0].date);
          balanceMap.set(firstDate, runningBalance);
        }

        for (const tx of sortedTxs) {
          const date = String(tx.date);
          const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount));
          // Invert the sign: expenses (positive) decrease balance, income (negative) increases balance
          runningBalance -= amount;
          balanceMap.set(date, runningBalance);
        }

        // Convert to array and format for chart
        const balanceArray: BalanceOverTime[] = Array.from(balanceMap.entries())
          .map(([date, balance]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            balance: parseFloat(balance.toFixed(2)),
          }));

        // Limit to reasonable number of points for readability
        const maxPoints = balancePeriod === 'all' ? 100 : balancePeriod === '1y' ? 52 : 30;
        if (balanceArray.length > maxPoints) {
          // Sample evenly
          const step = Math.ceil(balanceArray.length / maxPoints);
          const sampled = balanceArray.filter((_, i) => i % step === 0 || i === balanceArray.length - 1);
          setBalanceOverTime(sampled);
        } else {
          setBalanceOverTime(balanceArray);
        }
      } catch (e) {
        const msg = formatUnknownError(e);
        console.error('Error loading dashboard:', e);
        setErrorMessage(`Failed to load dashboard: ${msg}`);
        setDashboardData(null);
        setBalanceOverTime([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [accounts, getDisplayedBalance, isAuthenticated, selectedAccountId, balancePeriod, balanceRollupByAccountId, supabase]);

  const handleAccountChange = (event: SelectChangeEvent) => {
    setSelectedAccountId(event.target.value);
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <PublicLanding />;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasAccounts = accounts.length > 0;
  const hasTransactions = dashboardData?.hasAnyTransactions ?? false;
  const hasSuggestions = reviewSuggestionCount > 0;

  const homeState: 'no_accounts' | 'no_data' | 'review' | 'active' =
    !hasAccounts ? 'no_accounts' : !hasTransactions ? 'no_data' : hasSuggestions ? 'review' : 'active';

  const nextStepActions =
    homeState === 'no_accounts'
      ? [
          {
            icon: <AccountIcon color="primary" />,
            title: 'Add your first account',
            description: 'Create an account before you connect Plaid or upload a statement.',
            path: '/accounts?create=true',
          },
        ]
      : homeState === 'no_data'
        ? [
            {
              icon: <LinkIcon color="primary" />,
              title: 'Connect a bank',
              description: 'Use Plaid from Accounts to bring in transactions automatically.',
              path: '/accounts',
            },
            {
              icon: <UploadIcon color="primary" />,
              title: 'Upload an Amex statement',
              description: 'Manual statement upload is ready for Amex accounts today.',
              path: '/upload',
            },
          ]
        : homeState === 'review'
          ? [
              {
                icon: <CategoryIcon color="primary" />,
                title: 'Review suggestions',
                description: 'Apply suggested categories before you dive into reports.',
                path: '/transactions/review',
              },
              {
                icon: <UploadIcon color="primary" />,
                title: 'Add more data',
                description: 'Upload another statement or connect another account.',
                path: '/upload',
              },
            ]
          : [
              {
                icon: <CategoryIcon color="primary" />,
                title: 'Review transactions',
                description: 'Search, filter, and clean up recent activity.',
                path: '/transactions',
              },
              {
                icon: <AutoAwesomeIcon color="primary" />,
                title: 'Open insights',
                description: 'See charts, summaries, and the finance assistant in one place.',
                path: '/insights',
              },
              {
                icon: <UploadIcon color="primary" />,
                title: 'Add more data',
                description: 'Keep the dashboard current with another import.',
                path: '/upload',
              },
            ];

  return (
    <Box sx={{ py: 2 }}>
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Home
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {homeState === 'no_accounts'
              ? 'Set up one account first, then bring in your data.'
              : homeState === 'no_data'
                ? 'Your accounts are ready. The next step is importing transactions.'
                : homeState === 'review'
                  ? 'You have fresh category suggestions waiting for review.'
                  : 'Your financial overview is ready.'}
          </Typography>
        </Box>

        {hasTransactions && accounts.length > 1 ? (
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel id="account-filter-label">Filter by account</InputLabel>
            <Select
              labelId="account-filter-label"
              id="account-filter"
              value={selectedAccountId}
              label="Filter by account"
              onChange={handleAccountChange}
            >
              <MenuItem value="all">All accounts</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.bank} - {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Box>

      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14)}`,
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {homeState === 'no_accounts'
                ? 'Start with your first account'
                : homeState === 'no_data'
                  ? 'Bring in your first transactions'
                  : homeState === 'review'
                    ? 'Review suggestions before anything else'
                    : 'Everything is in place'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
              {homeState === 'no_accounts'
                ? 'Accounts anchor the rest of the app. Once you add one, you can either connect Plaid or upload an Amex statement.'
                : homeState === 'no_data'
                  ? 'The fastest way in is Plaid from Accounts. If you use Amex, you can also upload a statement right now.'
                  : homeState === 'review'
                    ? `${reviewSuggestionCount} transaction${reviewSuggestionCount === 1 ? '' : 's'} have suggested categories. Clear those first so your reports stay useful.`
                    : 'Use this page for the overview, then head to transactions or insights when you want to dig in.'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {homeState === 'no_accounts' ? (
              <Button variant="contained" size="large" startIcon={<AccountIcon />} onClick={() => router.push('/accounts?create=true')}>
                Add account
              </Button>
            ) : homeState === 'no_data' ? (
              <>
                <Button variant="contained" size="large" startIcon={<LinkIcon />} onClick={() => router.push('/accounts')}>
                  Connect bank
                </Button>
                <Button variant="outlined" size="large" startIcon={<UploadIcon />} onClick={() => router.push('/upload')}>
                  Upload Amex statement
                </Button>
              </>
            ) : homeState === 'review' ? (
              <>
                <Button variant="contained" size="large" startIcon={<CategoryIcon />} onClick={() => router.push('/transactions/review')}>
                  Review suggestions
                </Button>
                <Button variant="outlined" size="large" startIcon={<TrendingUpIcon />} onClick={() => router.push('/insights')}>
                  Open insights
                </Button>
              </>
            ) : (
              <>
                <Button variant="contained" size="large" startIcon={<TrendingUpIcon />} onClick={() => router.push('/insights')}>
                  Open insights
                </Button>
                <Button variant="outlined" size="large" startIcon={<CategoryIcon />} onClick={() => router.push('/transactions')}>
                  Review transactions
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Next step
        </Typography>
        <Grid container spacing={3}>
          {nextStepActions.map((action) => (
            <Grid item xs={12} md={12 / nextStepActions.length} key={action.path}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 3 },
                }}
                onClick={() => router.push(action.path)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.25} mb={1.5}>
                    {action.icon}
                    <Typography variant="h6">{action.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {dashboardData && hasTransactions ? (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Total Balance {selectedAccountId !== 'all' && '(Filtered)'}
                  </Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end' }}>
                    <Typography variant="h3">${dashboardData.totalBalance.toLocaleString()}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Monthly spending (this month) {selectedAccountId !== 'all' && '(Filtered)'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {dashboardData.hasMonthTransactions && dashboardData.lastMonthTransactionDate
                      ? `Updated ${new Date(dashboardData.lastMonthTransactionDate).toLocaleDateString()}`
                      : dashboardData.hasAnyTransactions
                        ? 'No transactions this month'
                        : 'No transactions yet'}
                  </Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end' }}>
                    <Typography variant="h3" color={dashboardData.hasAnyTransactions ? 'text.primary' : 'text.secondary'}>
                      {dashboardData.hasAnyTransactions
                        ? `$${dashboardData.monthlySpending.toLocaleString()}`
                        : '—'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {balanceOverTime.length > 0 && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Balance Over Time {selectedAccountId !== 'all' && '(Filtered)'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {(['1m', '3m', '6m', '1y', 'all'] as BalancePeriod[]).map((period) => (
                      <Chip
                        key={period}
                        label={period === '1m' ? '1M' : period === '3m' ? '3M' : period === '6m' ? '6M' : period === '1y' ? '1Y' : 'All'}
                        onClick={() => setBalancePeriod(period)}
                        color={balancePeriod === period ? 'primary' : 'default'}
                        variant={balancePeriod === period ? 'filled' : 'outlined'}
                        sx={{ fontWeight: balancePeriod === period ? 600 : 400 }}
                      />
                    ))}
                  </Stack>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={balanceOverTime}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.7)}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (Math.abs(value) >= 1000) {
                          const sign = value < 0 ? '-' : '';
                          return `${sign}$${(Math.abs(value) / 1000).toFixed(1)}k`;
                        }
                        return `$${value}`;
                      }}
                    />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                      }}
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return '$0.00';
                        const formatted = value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                        return `$${formatted}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      {dashboardData?.recentTransactions?.length ? (
        <>
          <Typography variant="h5" gutterBottom mb={2}>
            Recent Transactions {selectedAccountId !== 'all' && '(Filtered)'}
          </Typography>
          <Card>
            <CardContent>
              {dashboardData.recentTransactions.map((transaction, idx) => (
                <React.Fragment key={`${transaction.date}-${idx}`}>
                  <Box display="flex" justifyContent="space-between" py={1} gap={2}>
                    <Box flex={1}>
                      <Typography variant="body1" fontWeight="medium" mb={0.5}>
                        {transaction.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transaction.date).toLocaleDateString()} •{' '}
                        {transaction.category_name || 'Uncategorized'}
                        {transaction.account_bank && transaction.account_name
                          ? ` • ${transaction.account_bank} - ${transaction.account_name}`
                          : ''}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      sx={{ color: transaction.amount > 0 ? 'error.main' : 'success.main' }}
                    >
                      {transaction.amount > 0 ? '-' : ''}$
                      {Math.abs(transaction.amount).toLocaleString()}
                    </Typography>
                  </Box>
                  {idx < dashboardData.recentTransactions.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Box>
  );
}

