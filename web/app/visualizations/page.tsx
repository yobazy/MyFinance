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
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  UploadFile as UploadFileIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { formatUnknownError } from '../../lib/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';

type TransactionType = 'all' | 'income' | 'expenses';

type AnalyticsTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  account_name: string;
  category_name: string | null;
};

type Insight = {
  severity: 'success' | 'warning' | 'error' | 'info';
  message: string;
};

type CategoryRow = { name: string; amount: number; pct: number };
type MonthRow = { month: string; Income: number; Expenses: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORY_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtAxis(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

function getPeriodStart(period: Period): string | null {
  if (period === 'all' || period === 'custom') return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '1m') {
    d.setMonth(d.getMonth() - 1);
  } else if (period === '3m') {
    d.setMonth(d.getMonth() - 3);
  } else if (period === '6m') {
    d.setMonth(d.getMonth() - 6);
  } else if (period === '1y') {
    d.setFullYear(d.getFullYear() - 1);
  }
  return d.toISOString().split('T')[0];
}

function getPeriodEnd(period: Period): string | null {
  if (period === 'all' || period === 'custom') return null;
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function buildMonthlyData(txs: AnalyticsTransaction[]): MonthRow[] {
  const map = new Map<string, { income: number; expenses: number }>();
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    const entry = map.get(key) ?? { income: 0, expenses: 0 };
    if (t.amount < 0) entry.income += Math.abs(t.amount);
    else entry.expenses += t.amount;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      month: new Date(key + '-01').toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      Income: parseFloat(v.income.toFixed(2)),
      Expenses: parseFloat(v.expenses.toFixed(2)),
    }));
}

function buildCategoryData(txs: AnalyticsTransaction[]): CategoryRow[] {
  const map = new Map<string, number>();
  const expenses = txs.filter((t) => t.amount > 0);
  for (const t of expenses) {
    const name = t.category_name ?? 'Uncategorized';
    map.set(name, (map.get(name) ?? 0) + t.amount);
  }
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const sorted = Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount: parseFloat(amount.toFixed(2)),
      pct: total > 0 ? (amount / total) * 100 : 0,
    }));

  // Collapse tail into "Other" when there are many categories
  if (sorted.length > 8) {
    const top = sorted.slice(0, 7);
    const other = sorted.slice(7).reduce((s, c) => s + c.amount, 0);
    return [
      ...top,
      {
        name: 'Other',
        amount: parseFloat(other.toFixed(2)),
        pct: total > 0 ? (other / total) * 100 : 0,
      },
    ];
  }
  return sorted;
}

function buildInsights(
  txs: AnalyticsTransaction[],
  catData: CategoryRow[],
  totalIncome: number,
  totalExpenses: number,
  uncategorized: number,
): Insight[] {
  const insights: Insight[] = [];

  // Positive cash flow / savings rate
  if (totalIncome > 0 && totalIncome >= totalExpenses) {
    const saved = totalIncome - totalExpenses;
    const rate = (saved / totalIncome) * 100;
    insights.push({
      severity: 'success',
      message: `Savings rate of ${Math.round(rate)}% — you kept $${fmt(saved)} this period. Keep it up.`,
    });
  }

  // Overspending
  if (totalIncome > 0 && totalExpenses > totalIncome) {
    insights.push({
      severity: 'error',
      message: `You overspent by $${fmt(totalExpenses - totalIncome)} this period. Review your top spending categories below.`,
    });
  }

  // Dominant single category (excluding Uncategorized)
  const topCat = catData.find((c) => c.name !== 'Uncategorized');
  if (topCat && topCat.pct > 35) {
    const saving = topCat.amount * 0.1;
    insights.push({
      severity: 'info',
      message: `${topCat.name} is ${Math.round(topCat.pct)}% of your spending ($${fmt(topCat.amount)}). A 10% reduction there would save you $${fmt(saving)}/period.`,
    });
  }

  // Uncategorized blind spots
  const expenseCount = txs.filter((t) => t.amount > 0).length;
  const pctUncategorized = expenseCount > 0 ? (uncategorized / expenseCount) * 100 : 0;
  if (pctUncategorized > 15) {
    insights.push({
      severity: 'warning',
      message: `${uncategorized} expense transactions (${Math.round(pctUncategorized)}%) are uncategorized. Categorize them to see where your money really goes.`,
    });
  }

  return insights;
}

// ─── Chart sub-components ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        boxShadow: 4,
      }}
    >
      {label && (
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          {label}
        </Typography>
      )}
      {payload.map((entry: any) => (
        <Box key={entry.name} display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: entry.color ?? entry.fill,
            }}
          />
          <Typography variant="body2">
            {entry.name}: ${fmt(Math.abs(entry.value))}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const theme = useTheme();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [period, setPeriod] = useState<Period>('all');
  const [transactions, setTransactions] = useState<AnalyticsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        let startDate: string | null = null;
        let endDate: string | null = null;

        if (period === 'custom') {
          startDate = customStartDate || null;
          endDate = customEndDate || null;
        } else {
          startDate = getPeriodStart(period);
          endDate = getPeriodEnd(period);
        }

        const baseQuery = supabase
          .from('transactions')
          .select(
            'id,date,description,amount,accounts(name),categories:categories!transactions_category_id_fkey(name)',
          )
          .order('date', { ascending: false })
          .limit(5000);

        let query = baseQuery;
        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) {
          console.error('AnalyticsPage query error:', error);
          throw error;
        }
        console.log('AnalyticsPage query result:', { dataCount: data?.length ?? 0, period, startDate, endDate, sample: data?.[0] });
        if (!cancelled) {
          setTransactions(
            (data ?? []).map((r: any) => ({
              id: String(r.id),
              date: String(r.date),
              description: String(r.description ?? ''),
              amount:
                typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount)),
              account_name: String(r.accounts?.name ?? 'Unknown'),
              category_name: (r.categories as any)?.name ?? null,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) setLoadError(formatUnknownError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, customStartDate, customEndDate, supabase]);

  // ── Filter transactions by type ────────────────────────────────────────────

  const filteredTransactions = useMemo(() => {
    if (transactionType === 'all') return transactions;
    if (transactionType === 'income') {
      return transactions.filter((t) => t.amount < 0);
    }
    // expenses
    return transactions.filter((t) => t.amount > 0);
  }, [transactions, transactionType]);

  // ── Aggregations ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalExpenses = filteredTransactions
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const totalIncome = filteredTransactions
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const uncategorized = filteredTransactions.filter(
      (t) => t.amount > 0 && !t.category_name,
    ).length;
    const months = new Set(filteredTransactions.map((t) => t.date.slice(0, 7)));
    return {
      totalExpenses,
      totalIncome,
      net: totalIncome - totalExpenses,
      avgMonthlyExpense: totalExpenses / Math.max(months.size, 1),
      uncategorized,
    };
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => buildMonthlyData(filteredTransactions), [filteredTransactions]);
  const categoryData = useMemo(() => buildCategoryData(filteredTransactions), [filteredTransactions]);
  const topExpenses = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6),
    [filteredTransactions],
  );
  const insights = useMemo(
    () =>
      buildInsights(
        filteredTransactions,
        categoryData,
        stats.totalIncome,
        stats.totalExpenses,
        stats.uncategorized,
      ),
    [filteredTransactions, categoryData, stats],
  );

  const incomeColor = theme.palette.success.main;
  const expenseColor = theme.palette.error.main;

  // ── Render guards ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="text.secondary">Loading analytics…</Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Typography variant="h4">Insights: Charts</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/insights')}>
            Back to insights
          </Button>
        </Box>
        <Alert severity="error">Failed to load data: {loadError}</Alert>
      </Box>
    );
  }

  if (filteredTransactions.length === 0) {
    const hasPeriodFilter = period !== 'all';
    const hasCustomDateFilter = period === 'custom' && Boolean(customStartDate || customEndDate);
    const hasFilters = hasPeriodFilter || transactionType !== 'all' || hasCustomDateFilter;
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Typography variant="h4">Insights: Charts</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/insights')}>
            Back to insights
          </Button>
        </Box>
        <Card
          sx={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: hasFilters ? 'default' : 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': hasFilters ? {} : { transform: 'translateY(-3px)', boxShadow: theme.shadows[3] },
          }}
          onClick={hasFilters ? undefined : () => router.push('/upload')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <UploadFileIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No transactions for this period
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
              {hasFilters
                ? 'Try adjusting your filters or selecting a different time period.'
                : 'Upload bank statements to start seeing spending insights and trends.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Header ── */}
      <Box mb={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h4">Insights: Charts</Typography>
            <Typography variant="body2" color="text.secondary">
              Use charts when you want a visual read on the same data behind narrative insights.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" size="small" onClick={() => router.push('/insights')}>
              Back to insights
            </Button>
            <Stack direction="row" spacing={0.5}>
              {PERIOD_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  onClick={() => {
                    setPeriod(opt.value);
                    if (opt.value !== 'custom') {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }
                  }}
                  color={period === opt.value ? 'primary' : 'default'}
                  variant={period === opt.value ? 'filled' : 'outlined'}
                  sx={{ fontWeight: period === opt.value ? 600 : 400 }}
                />
              ))}
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon />}
              endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              Filters
            </Button>
          </Stack>
        </Box>

        {/* ── Advanced Filters ── */}
        <Collapse in={showAdvancedFilters}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                {period === 'custom' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        size="small"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        size="small"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6} md={period === 'custom' ? 6 : 12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Transaction Type</InputLabel>
                    <Select
                      value={transactionType}
                      label="Transaction Type"
                      onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    >
                      <MenuItem value="all">All Transactions</MenuItem>
                      <MenuItem value="income">Income Only</MenuItem>
                      <MenuItem value="expenses">Expenses Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Collapse>
      </Box>

      {/* ── KPI cards ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <TrendingDownIcon color="success" />
                <Typography variant="h6" color="success.main">
                  ${fmt(stats.totalIncome)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Income
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <TrendingUpIcon color="error" />
                <Typography variant="h6" color="error.main">
                  ${fmt(stats.totalExpenses)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h6"
                color={stats.net >= 0 ? 'success.main' : 'error.main'}
              >
                {stats.net >= 0 ? '+' : ''}${fmt(stats.net)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Cash Flow
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                ${fmt(stats.avgMonthlyExpense)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Monthly Spend
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <LightbulbIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Insights
            </Typography>
          </Box>
          <Stack spacing={1}>
            {insights.map((insight, i) => (
              <Alert
                key={i}
                severity={insight.severity}
                icon={
                  insight.severity === 'success' ? (
                    <CheckCircleIcon />
                  ) : insight.severity === 'warning' ? (
                    <WarningIcon />
                  ) : undefined
                }
              >
                {insight.message}
              </Alert>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── Charts row 1: monthly bar + category donut ── */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Monthly Income vs Expenses
              </Typography>
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={monthlyData} barGap={4} barCategoryGap="28%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={alpha(theme.palette.divider, 0.7)}
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 12 }} />
                  <ReTooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Income" fill={incomeColor} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill={expenseColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Spending by Category
              </Typography>
              {categoryData.length === 0 ? (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height={270}
                >
                  <Typography variant="body2" color="text.secondary">
                    No expense data
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={108}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ReTooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value, entry: any) =>
                        `${value} (${Math.round(entry.payload?.pct ?? 0)}%)`
                      }
                      iconSize={10}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Spending trend area chart ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Monthly Spending Trend
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={expenseColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={expenseColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={alpha(theme.palette.divider, 0.7)}
              />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 12 }} />
              <ReTooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Expenses"
                stroke={expenseColor}
                strokeWidth={2}
                fill="url(#expGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Bottom row: top categories bar + largest expenses ── */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Top Spending Categories
              </Typography>
              {categoryData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    layout="vertical"
                    data={categoryData.slice(0, 6)}
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={alpha(theme.palette.divider, 0.7)}
                    />
                    <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      tick={{ fontSize: 12 }}
                    />
                    <ReTooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" name="Spent" radius={[0, 4, 4, 0]}>
                      {categoryData.slice(0, 6).map((_, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Largest Expenses
              </Typography>
              <Stack spacing={1}>
                {topExpenses.map((t) => (
                  <Box
                    key={t.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.action.hover, 0.5),
                    }}
                  >
                    <Box minWidth={0} mr={1}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {t.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(t.date).toLocaleDateString()} ·{' '}
                        {t.category_name ?? 'Uncategorized'}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="error.main"
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      ${fmt(t.amount)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Category breakdown table ── */}
      {categoryData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Category Breakdown
            </Typography>
            <Grid container spacing={2}>
              {categoryData.map((cat, i) => (
                <Grid item xs={12} sm={6} md={4} key={cat.name}>
                  <Box display="flex" alignItems="flex-start" gap={1.5} py={0.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    />
                    <Box flex={1} minWidth={0}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2" noWrap>
                          {cat.name}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} ml={1}>
                          ${fmt(cat.amount)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: alpha(
                            CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            0.18,
                          ),
                          mt: 0.5,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: `${cat.pct}%`,
                            bgcolor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(cat.pct)}% of spending
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
