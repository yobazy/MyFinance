'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../lib/supabase';
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
  lastTransactionDate: string | null;
  recentTransactions: RecentTx[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error) setAccounts((data ?? []) as Account[]);
    })();
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);

      const filteredAccount =
        selectedAccountId === 'all'
          ? null
          : accounts.find((a) => a.id === selectedAccountId) ?? null;

      const totalBalance =
        selectedAccountId === 'all'
          ? accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0)
          : Number(filteredAccount?.balance ?? 0);

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
        .select('date,description,amount,accounts(name,bank),categories(name)')
        .order('date', { ascending: false })
        .limit(8);

      if (selectedAccountId !== 'all') {
        txForMonth = txForMonth.eq('account_id', selectedAccountId);
        recentTxQuery = recentTxQuery.eq('account_id', selectedAccountId);
      }

      const [{ data: monthRows }, { data: recentRows }] = await Promise.all([
        txForMonth,
        recentTxQuery,
      ]);

      const monthlySpending = (monthRows ?? []).reduce((sum, r) => {
        const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
        return amt > 0 ? sum + amt : sum;
      }, 0);

      const lastTransactionDate =
        (monthRows?.[0]?.date as string | undefined) ?? (recentRows?.[0]?.date as string | undefined) ?? null;

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
        lastTransactionDate,
        recentTransactions,
      });

      setLoading(false);
    })();
  }, [accounts, isAuthenticated, selectedAccountId, supabase]);

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h3" component="h1">
          Financial Dashboard
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
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Balance {selectedAccountId !== 'all' && '(Filtered)'}
                </Typography>
                <Typography variant="h3">${dashboardData.totalBalance.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly spending as of:{' '}
                  {dashboardData.lastTransactionDate
                    ? new Date(dashboardData.lastTransactionDate).toLocaleDateString()
                    : 'No transactions'}{' '}
                  {selectedAccountId !== 'all' && '(Filtered)'}
                </Typography>
                <Typography variant="h3">${dashboardData.monthlySpending.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
        Quick Actions
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

