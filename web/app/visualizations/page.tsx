'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ErrorOutline as ErrorIcon,
  UploadFile as UploadFileIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalanceWallet as WalletIcon,
  CalendarMonth as CalendarIcon,
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
  ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { formatUnknownError } from '../../lib/errors';
import { chartPalette } from '../../lib/theme';
import { formatCompactMoney, formatDate, formatMoney, formatSignedMoney, parseDateOnly, plural } from '../../lib/format';
import {
  ChartTooltip,
  EmptyState,
  Money,
  PageHeader,
  PageSkeleton,
  SectionCard,
  SegmentedControl,
  StatCard,
} from '../components/ui';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      month: parseDateOnly(key + '-01').toLocaleDateString('en-US', {
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
      message: `Savings rate of ${Math.round(rate)}% — you kept ${formatMoney(saved)} this period. Keep it up.`,
    });
  }

  // Overspending
  if (totalIncome > 0 && totalExpenses > totalIncome) {
    insights.push({
      severity: 'error',
      message: `You overspent by ${formatMoney(totalExpenses - totalIncome)} this period. Review your top spending categories below.`,
    });
  }

  // Dominant single category (excluding Uncategorized)
  const topCat = catData.find((c) => c.name !== 'Uncategorized');
  if (topCat && topCat.pct > 35) {
    const saving = topCat.amount * 0.1;
    insights.push({
      severity: 'info',
      message: `${topCat.name} is ${Math.round(topCat.pct)}% of your spending (${formatMoney(topCat.amount)}). A 10% reduction there would save you ${formatMoney(saving)}/period.`,
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

// ─── Small presentational pieces ──────────────────────────────────────────────

function LegendRow(props: { items: { label: string; color: string }[] }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {props.items.map((it) => (
        <Stack key={it.label} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: it.color }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {it.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function InsightIcon(props: { severity: Insight['severity'] }) {
  const theme = useTheme();
  const map = {
    success: { color: theme.palette.success.main, Icon: CheckCircleIcon },
    warning: { color: theme.palette.warning.main, Icon: WarningIcon },
    error: { color: theme.palette.error.main, Icon: ErrorIcon },
    info: { color: theme.palette.info.main, Icon: InfoIcon },
  } as const;
  const { color, Icon } = map[props.severity];
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
        '& svg': { fontSize: 16 },
      }}
    >
      <Icon />
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
      monthCount: months.size,
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
  const expenseColor = alpha(theme.palette.error.main, 0.85);
  const gridStroke = theme.palette.divider;
  const tickStyle = { fontSize: 12, fill: theme.palette.text.secondary };

  const hasCustomDates = period === 'custom' && Boolean(customStartDate || customEndDate);
  const activeFilterCount = (transactionType !== 'all' ? 1 : 0) + (hasCustomDates ? 1 : 0);

  const handlePeriodChange = (value: Period) => {
    setPeriod(value);
    if (value !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      setShowAdvancedFilters(true);
    }
  };

  const header = (
    <PageHeader
      eyebrow="Insights"
      title="Charts"
      description="A visual read on the same data behind your narrative summaries."
      actions={
        <>
          <SegmentedControl
            value={period}
            onChange={handlePeriodChange}
            options={PERIOD_OPTIONS}
            aria-label="Time period"
          />
          <Badge badgeContent={activeFilterCount} color="primary" overlap="rectangular">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<FilterListIcon />}
              endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowAdvancedFilters((v) => !v)}
            >
              Filters
            </Button>
          </Badge>
        </>
      }
    >
      <Collapse in={showAdvancedFilters}>
        <SectionCard sx={{ mb: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: period === 'custom' ? '1fr 1fr 1fr' : '1fr' },
              gap: 2,
            }}
          >
            {period === 'custom' ? (
              <>
                <TextField
                  fullWidth
                  label="Start date"
                  type="date"
                  size="small"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="End date"
                  type="date"
                  size="small"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            ) : null}
            <FormControl fullWidth size="small">
              <InputLabel>Transaction type</InputLabel>
              <Select
                value={transactionType}
                label="Transaction type"
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
              >
                <MenuItem value="all">All transactions</MenuItem>
                <MenuItem value="income">Income only</MenuItem>
                <MenuItem value="expenses">Expenses only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </SectionCard>
      </Collapse>
    </PageHeader>
  );

  // ── Render guards ───────────────────────────────────────────────────────────

  if (loading) {
    return <PageSkeleton stats={4} chart rows={4} />;
  }

  if (loadError) {
    return (
      <Box>
        {header}
        <Alert severity="error">Failed to load data: {loadError}</Alert>
      </Box>
    );
  }

  if (filteredTransactions.length === 0) {
    const hasFilters = period !== 'all' || transactionType !== 'all' || hasCustomDates;
    return (
      <Box>
        {header}
        <EmptyState
          size="lg"
          icon={hasFilters ? <CalendarIcon /> : <UploadFileIcon />}
          title={hasFilters ? 'No transactions for this period' : 'No transactions yet'}
          description={
            hasFilters
              ? 'Try a wider time period or clear the filters to see your charts.'
              : 'Upload a statement or connect a bank to start seeing spending trends.'
          }
          actions={
            hasFilters ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setPeriod('all');
                  setTransactionType('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="contained" onClick={() => router.push('/upload')}>
                Upload a statement
              </Button>
            )
          }
        />
      </Box>
    );
  }

  const categoryTotal = categoryData.reduce((s, c) => s + c.amount, 0);

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Box>
      {header}

      {/* ── KPI cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Income"
          value={formatMoney(stats.totalIncome)}
          tone="positive"
          icon={<TrendingUpIcon />}
          hint={`${plural(filteredTransactions.filter((t) => t.amount < 0).length, 'deposit')}`}
        />
        <StatCard
          label="Spending"
          value={formatMoney(stats.totalExpenses)}
          icon={<TrendingDownIcon />}
          hint={`${plural(filteredTransactions.filter((t) => t.amount > 0).length, 'expense')}`}
        />
        <StatCard
          label="Net cash flow"
          value={formatSignedMoney(stats.net)}
          tone={stats.net >= 0 ? 'positive' : 'negative'}
          icon={<WalletIcon />}
          hint={stats.net >= 0 ? 'You kept more than you spent' : 'Spending exceeded income'}
        />
        <StatCard
          label="Avg monthly spend"
          value={formatMoney(stats.avgMonthlyExpense)}
          icon={<CalendarIcon />}
          hint={`Across ${plural(stats.monthCount, 'month')}`}
        />
      </Box>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <SectionCard
          title="What stands out"
          icon={<LightbulbIcon />}
          sx={{ mb: 3 }}
          disablePadding
        >
          <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
            {insights.map((insight, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 2.5, py: 1.5 }}>
                <InsightIcon severity={insight.severity} />
                <Typography variant="body2" sx={{ pt: 0.4 }}>
                  {insight.message}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      )}

      {/* ── Charts row 1: monthly bar + category donut ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <SectionCard title="Income vs. spending" description="By month">
          <LegendRow
            items={[
              { label: 'Income', color: incomeColor },
              { label: 'Spending', color: expenseColor },
            ]}
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barGap={4} barCategoryGap="28%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompactMoney} tick={tickStyle} axisLine={false} tickLine={false} width={56} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
              <Bar dataKey="Income" fill={incomeColor} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expenses" name="Spending" fill={expenseColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Spending by category" description="Share of total spending">
          {categoryData.length === 0 ? (
            <Box display="flex" alignItems="center" justifyContent="center" height={260}>
              <Typography variant="body2" color="text.secondary">
                No expense data
              </Typography>
            </Box>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ position: 'relative', width: 220, height: 220, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                      ))}
                    </Pie>
                    <ReTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography variant="overline" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h5" className="tabular-nums" sx={{ fontWeight: 650, letterSpacing: '-0.02em' }}>
                    {formatCompactMoney(categoryTotal)}
                  </Typography>
                </Box>
              </Box>
              <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                {categoryData.map((cat, i) => (
                  <Stack key={cat.name} direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: chartPalette[i % chartPalette.length],
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" noWrap title={cat.name} sx={{ flex: 1, minWidth: 0 }}>
                      {cat.name}
                    </Typography>
                    <Money value={cat.amount} cents={false} sx={{ fontWeight: 600 }} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      className="tabular-nums"
                      sx={{ width: 36, textAlign: 'right' }}
                    >
                      {Math.round(cat.pct)}%
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </SectionCard>
      </Box>

      {/* ── Spending trend area chart ── */}
      <SectionCard title="Monthly spending trend" sx={{ mb: 2 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.28} />
                <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCompactMoney} tick={tickStyle} axisLine={false} tickLine={false} width={56} />
            <ReTooltip content={<ChartTooltip hideName />} />
            <Area
              type="monotone"
              dataKey="Expenses"
              name="Spending"
              stroke={theme.palette.error.main}
              strokeWidth={2}
              fill="url(#expGradient)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Bottom row: top categories bar + largest expenses ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <SectionCard title="Top spending categories">
          {categoryData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No data
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart layout="vertical" data={categoryData.slice(0, 6)} margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" tickFormatter={formatCompactMoney} tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={tickStyle} axisLine={false} tickLine={false} />
                <ReTooltip content={<ChartTooltip hideName />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                <Bar dataKey="amount" name="Spent" radius={[0, 6, 6, 0]}>
                  {categoryData.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Largest expenses" disablePadding>
          <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
            {topExpenses.map((t) => (
              <Stack
                key={t.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ px: 2.5, py: 1.25 }}
              >
                <Box minWidth={0}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {t.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {formatDate(t.date)} · {t.category_name ?? 'Uncategorized'}
                  </Typography>
                </Box>
                <Money stored={t.amount} sx={{ fontWeight: 650 }} />
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      {/* ── Category breakdown ── */}
      {categoryData.length > 0 && (
        <SectionCard title="Category breakdown" description="Share of spending per category">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              gap: 2.5,
            }}
          >
            {categoryData.map((cat, i) => {
              const color = chartPalette[i % chartPalette.length];
              return (
                <Box key={cat.name}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {cat.name}
                      </Typography>
                    </Stack>
                    <Money value={cat.amount} sx={{ ml: 1 }} />
                  </Stack>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: alpha(color, 0.16),
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: `${cat.pct}%`,
                        bgcolor: color,
                        borderRadius: 999,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {Math.round(cat.pct)}% of spending
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      )}
    </Box>
  );
}
