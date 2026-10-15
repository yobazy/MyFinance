'use client';

import React, { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  AccountBalanceRounded as AccountIcon,
  ArrowForwardRounded as ArrowForwardIcon,
  AutoAwesomeRounded as AutoAwesomeIcon,
  CategoryRounded as CategoryIcon,
  ChevronRightRounded as ChevronRightIcon,
  LinkRounded as LinkIcon,
  ReceiptLongRounded as ReceiptIcon,
  TrendingDownRounded as TrendingDownIcon,
  TrendingUpRounded as TrendingUpIcon,
  UploadFileRounded as UploadIcon,
  WalletRounded as WalletIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  AreaChart,
  Area,
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
import {
  ChartTooltip,
  EmptyState,
  Money,
  PageHeader,
  PageSkeleton,
  SectionCard,
  SegmentedControl,
  StatCard,
  CategoryChip,
} from './components/ui';
import { formatCompactMoney, formatDate, formatMoney, formatShortDate, plural } from '../lib/format';

type RecentTx = {
  date: string;
  description: string;
  amount: number;
  category_name?: string | null;
  category_color?: string | null;
  account_name?: string | null;
  account_bank?: string | null;
};

type DashboardData = {
  totalBalance: number;
  monthlySpending: number;
  monthlyIncome: number;
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

type NextStepAction = {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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
            'date,description,amount,accounts(name,bank),categories:categories!transactions_category_id_fkey(name,color)'
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

        const monthlyIncome = (monthRows ?? []).reduce((sum, r) => {
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return amt < 0 ? sum + Math.abs(amt) : sum;
        }, 0);

        const lastMonthTransactionDate = hasMonthTransactions
          ? ((monthRows?.[0]?.date as string | undefined) ?? null)
          : null;

        const recentTransactions: RecentTx[] = (recentRows ?? []).map((r) => {
          const account = (r.accounts ?? null) as null | { name?: string; bank?: string };
          const category = (r.categories ?? null) as null | { name?: string; color?: string };
          const amt = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount));
          return {
            date: String(r.date),
            description: String(r.description ?? ''),
            amount: amt,
            category_name: category?.name ?? null,
            category_color: category?.color ?? null,
            account_name: account?.name ?? null,
            account_bank: account?.bank ?? null,
          };
        });

        setDashboardData({
          totalBalance,
          monthlySpending,
          monthlyIncome,
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
            date: formatShortDate(date),
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
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <PageSkeleton stats={4} rows={4} chart />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <PublicLanding />;
  }

  if (loading) {
    return <PageSkeleton stats={4} rows={5} chart />;
  }

  const hasAccounts = accounts.length > 0;
  const hasTransactions = dashboardData?.hasAnyTransactions ?? false;
  const hasSuggestions = reviewSuggestionCount > 0;

  const homeState: 'no_accounts' | 'no_data' | 'review' | 'active' =
    !hasAccounts ? 'no_accounts' : !hasTransactions ? 'no_data' : hasSuggestions ? 'review' : 'active';

  const nextStepActions: NextStepAction[] =
    homeState === 'no_accounts'
      ? [
          {
            icon: <AccountIcon />,
            title: 'Add your first account',
            description: 'Create an account before you connect Plaid or upload a statement.',
            path: '/accounts?create=true',
          },
        ]
      : homeState === 'no_data'
        ? [
            {
              icon: <LinkIcon />,
              title: 'Connect a bank',
              description: 'Plaid keeps transactions flowing in automatically.',
              path: '/accounts',
            },
            {
              icon: <UploadIcon />,
              title: 'Upload an Amex statement',
              description: 'Import a CSV or XLSX export right now.',
              path: '/upload',
            },
          ]
        : homeState === 'review'
          ? [
              {
                icon: <CategoryIcon />,
                title: 'Review suggestions',
                description: `${plural(reviewSuggestionCount, 'transaction')} waiting for a category.`,
                path: '/transactions/review',
              },
              {
                icon: <AutoAwesomeIcon />,
                title: 'Open insights',
                description: 'Read a narrative summary of the month.',
                path: '/insights',
              },
              {
                icon: <ReceiptIcon />,
                title: 'Browse transactions',
                description: 'Search, filter, and export your activity.',
                path: '/transactions',
              },
            ]
          : [
              {
                icon: <AutoAwesomeIcon />,
                title: 'Open insights',
                description: 'Read a narrative summary of the month.',
                path: '/insights',
              },
              {
                icon: <ReceiptIcon />,
                title: 'Browse transactions',
                description: 'Search, filter, and export your activity.',
                path: '/transactions',
              },
              {
                icon: <UploadIcon />,
                title: 'Import more data',
                description: 'Upload a statement or sync a connected bank.',
                path: '/upload',
              },
            ];

  const today = formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' });
  const filteredSuffix = selectedAccountId !== 'all' ? ' · filtered' : '';

  const accountFilter =
    hasTransactions && accounts.length > 1 ? (
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="account-filter-label">Account</InputLabel>
        <Select
          labelId="account-filter-label"
          id="account-filter"
          value={selectedAccountId}
          label="Account"
          onChange={handleAccountChange}
        >
          <MenuItem value="all">All accounts</MenuItem>
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              {account.name} · {account.bank}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    ) : null;

  // ── Onboarding hero (no accounts / no data) ──────────────────────────────
  if (homeState === 'no_accounts' || homeState === 'no_data') {
    const isNoAccounts = homeState === 'no_accounts';
    return (
      <Box>
        <PageHeader title={greeting()} description={today} />
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <EmptyState
          size="lg"
          icon={isNoAccounts ? <AccountIcon /> : <UploadIcon />}
          title={isNoAccounts ? 'Start with your first account' : 'Bring in your first transactions'}
          description={
            isNoAccounts
              ? 'Accounts anchor the rest of the app. Once you add one, you can either connect Plaid or upload an Amex statement.'
              : 'The fastest way in is Plaid from Accounts. If you use Amex, you can also upload a statement right now.'
          }
          actions={
            isNoAccounts ? (
              <Button variant="contained" size="large" startIcon={<AccountIcon />} onClick={() => router.push('/accounts?create=true')}>
                Add account
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" startIcon={<LinkIcon />} onClick={() => router.push('/accounts')}>
                  Connect bank
                </Button>
                <Button variant="outlined" size="large" startIcon={<UploadIcon />} onClick={() => router.push('/upload')}>
                  Upload Amex statement
                </Button>
              </>
            )
          }
        />
        <Box sx={{ mt: 3 }}>
          <NextStepsList actions={nextStepActions} onNavigate={(p) => router.push(p)} />
        </Box>
      </Box>
    );
  }

  // ── Active dashboard ─────────────────────────────────────────────────────
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' });
  const netThisMonth = (dashboardData?.monthlyIncome ?? 0) - (dashboardData?.monthlySpending ?? 0);

  return (
    <Box>
      <PageHeader title={greeting()} description={today} actions={accountFilter} />

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      {/* KPI row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label={`Total balance${filteredSuffix}`}
          value={formatMoney(dashboardData?.totalBalance ?? 0)}
          icon={<WalletIcon />}
          hint={plural(selectedAccountId === 'all' ? accounts.length : 1, 'account')}
        />
        <StatCard
          label={`Spending · ${monthLabel}`}
          value={dashboardData?.hasMonthTransactions ? formatMoney(dashboardData.monthlySpending) : '—'}
          icon={<TrendingDownIcon />}
          hint={
            dashboardData?.hasMonthTransactions && dashboardData.lastMonthTransactionDate
              ? `Updated ${formatShortDate(dashboardData.lastMonthTransactionDate)}`
              : 'No transactions this month'
          }
        />
        <StatCard
          label={`Income · ${monthLabel}`}
          value={dashboardData?.hasMonthTransactions ? formatMoney(dashboardData.monthlyIncome) : '—'}
          icon={<TrendingUpIcon />}
          tone={dashboardData?.hasMonthTransactions && dashboardData.monthlyIncome > 0 ? 'positive' : 'default'}
          hint={
            dashboardData?.hasMonthTransactions
              ? `Net ${netThisMonth >= 0 ? '+' : '−'}${formatMoney(Math.abs(netThisMonth))}`
              : 'No transactions this month'
          }
        />
        <StatCard
          label="Needs review"
          value={reviewSuggestionCount}
          icon={<CategoryIcon />}
          tone={hasSuggestions ? 'warning' : 'default'}
          hint={hasSuggestions ? 'Suggested categories to confirm' : 'All caught up'}
          onClick={hasSuggestions ? () => router.push('/transactions/review') : undefined}
        />
      </Box>

      {/* Chart + next steps */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
          gap: 2,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <SectionCard
          title={`Balance over time${filteredSuffix}`}
          action={
            <SegmentedControl<BalancePeriod>
              value={balancePeriod}
              onChange={setBalancePeriod}
              aria-label="Balance period"
              options={[
                { value: '1m', label: '1M' },
                { value: '3m', label: '3M' },
                { value: '6m', label: '6M' },
                { value: '1y', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
            />
          }
        >
          {balanceOverTime.length > 0 ? (
            <Box sx={{ mt: 1, mx: -1 }}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={balanceOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={alpha(theme.palette.text.primary, 0.08)} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(value: number) => formatCompactMoney(value)}
                  />
                  <ReTooltip
                    content={<ChartTooltip hideName format={(v) => (v < 0 ? `−${formatMoney(Math.abs(v))}` : formatMoney(v))} />}
                    cursor={{ stroke: alpha(theme.palette.text.primary, 0.2), strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    fill="url(#balanceGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: theme.palette.background.paper }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <EmptyState
              variant="plain"
              size="sm"
              title="No activity in this period"
              description="Try a longer period, or import more transactions."
            />
          )}
        </SectionCard>

        <NextStepsList actions={nextStepActions} onNavigate={(p) => router.push(p)} />
      </Box>

      {/* Recent transactions */}
      {dashboardData?.recentTransactions?.length ? (
        <SectionCard
          title={`Recent transactions${filteredSuffix}`}
          description="The latest activity across your accounts."
          disablePadding
          divider
          action={
            <Button component={NextLink} href="/transactions" size="small" endIcon={<ArrowForwardIcon fontSize="small" />}>
              View all
            </Button>
          }
        >
          <Stack divider={<Divider />}>
            {dashboardData.recentTransactions.map((transaction, idx) => (
              <Stack
                key={`${transaction.date}-${idx}`}
                direction="row"
                alignItems="center"
                gap={2}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  transition: 'background-color 120ms ease',
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.05 : 0.03) },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="tabular-nums"
                  sx={{ width: 56, flexShrink: 0, fontWeight: 600 }}
                >
                  {formatShortDate(transaction.date)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {transaction.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {transaction.account_name
                      ? `${transaction.account_name}${transaction.account_bank ? ` · ${transaction.account_bank}` : ''}`
                      : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <CategoryChip name={transaction.category_name} color={transaction.category_color} />
                </Box>
                <Money stored={transaction.amount} colored sx={{ minWidth: 88, textAlign: 'right' }} />
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      ) : null}
    </Box>
  );
}

function NextStepsList(props: { actions: NextStepAction[]; onNavigate: (path: string) => void }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <SectionCard title="Next steps" description="Suggested based on where your data is." disablePadding divider>
      <Stack divider={<Divider />}>
        {props.actions.map((action) => (
          <Box
            key={action.path}
            role="button"
            tabIndex={0}
            onClick={() => props.onNavigate(action.path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onNavigate(action.path);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.75,
              cursor: 'pointer',
              transition: 'background-color 120ms ease',
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, isDark ? 0.05 : 0.03) },
              '&:hover .mf-chevron': { transform: 'translateX(2px)', color: theme.palette.text.primary },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1),
                '& svg': { fontSize: 20 },
              }}
            >
              {action.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 620 }}>
                {action.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {action.description}
              </Typography>
            </Box>
            <ChevronRightIcon
              className="mf-chevron"
              sx={{ color: 'text.disabled', fontSize: 20, transition: 'transform 120ms ease, color 120ms ease' }}
            />
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
