'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  Category as CategoryIcon,
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
      if (stored !== 0) return stored;
      if (hasTx) return computed;
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
        let balanceQuery = supabase
          .from('transactions')
          .select('date,amount')
          .order('date', { ascending: true });

        if (selectedAccountId !== 'all') {
          balanceQuery = balanceQuery.eq('account_id', selectedAccountId);
        }

        const { data: balanceData, error: balanceError } = await balanceQuery;
        if (balanceError) throw balanceError;

        // Calculate running balance
        const balanceMap = new Map<string, number>();
        let runningBalance = 0;

        // Group transactions by date and calculate cumulative balance
        const sortedTxs = (balanceData ?? []).sort((a, b) => {
          const dateA = new Date(a.date as string).getTime();
          const dateB = new Date(b.date as string).getTime();
          return dateA - dateB;
        });

        for (const tx of sortedTxs) {
          const date = String(tx.date);
          const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount));
          runningBalance += amount;
          balanceMap.set(date, runningBalance);
        }

        // Convert to array and format for chart
        const balanceArray: BalanceOverTime[] = Array.from(balanceMap.entries())
          .map(([date, balance]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            balance: parseFloat(balance.toFixed(2)),
          }))
          .slice(-30); // Show last 30 data points for readability

        setBalanceOverTime(balanceArray);
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
  }, [accounts, getDisplayedBalance, isAuthenticated, selectedAccountId, supabase]);

  const handleAccountChange = (event: SelectChangeEvent) => {
    setSelectedAccountId(event.target.value);
  };

  const QuickActionCard = (p: {
    icon: React.ReactNode;
    title: string;
    description: string;
    path: string;
  }) => (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
      }}
      onClick={() => router.push(p.path)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {p.icon}
          <Typography variant="h6" ml={1}>
            {p.title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {p.description}
        </Typography>
      </CardContent>
    </Card>
  );

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

  const quickActions = [
    {
      icon: <UploadIcon color="primary" />,
      title: 'Upload Statements',
      description: 'Import your bank statements to track expenses',
      path: '/upload',
    },
    {
      icon: <CategoryIcon color="primary" />,
      title: 'Categorize',
      description: 'Organize your transactions by category',
      path: '/categorization',
    },
    {
      icon: <TrendingUpIcon color="primary" />,
      title: 'Analytics',
      description: 'View spending insights and trends',
      path: '/visualizations',
    },
    {
      icon: <AccountIcon color="primary" />,
      title: 'Manage Accounts',
      description: 'Add or edit your bank accounts',
      path: '/accounts',
    },
  ];

  return (
    <Box sx={{ py: 2 }}>
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h3" component="h1">
          Dashboard
        </Typography>

        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel id="account-filter-label">Filter by Account</InputLabel>
          <Select
            labelId="account-filter-label"
            id="account-filter"
            value={selectedAccountId}
            label="Filter by Account"
            onChange={handleAccountChange}
          >
            <MenuItem value="all">All Accounts</MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.bank} - {account.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {dashboardData ? (
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
                <Typography variant="h6" gutterBottom>
                  Balance Over Time {selectedAccountId !== 'all' && '(Filtered)'}
                </Typography>
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
                        if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                        return `$${value}`;
                      }}
                    />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                      }}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
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
      ) : (
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No financial data yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Start by uploading your bank statements to see your financial overview
          </Typography>
          <Button variant="contained" onClick={() => router.push('/upload')}>
            Upload Statements
          </Button>
        </Paper>
      )}

      <Typography variant="h5" gutterBottom mb={3}>
        Quick actions
      </Typography>
      <Grid container spacing={3} mb={4}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.path}>
            <QuickActionCard {...action} />
          </Grid>
        ))}
      </Grid>

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

