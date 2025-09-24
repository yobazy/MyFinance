import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Box, 
  Button, 
  FormControlLabel, 
  Checkbox, 
  Tooltip, 
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import { 
  Tooltip as RechartsTooltip, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  ResponsiveContainer,
  Legend
} from "recharts";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router-dom';
import { useTheme } from "@mui/material/styles";

const Visualizations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [includeUncategorized, setIncludeUncategorized] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();

  // Fetch accounts for filtering
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/accounts/")
      .then(response => {
        setAccounts(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
      });
  }, []);

  // Combine monthly spending and income data for the chart
  const combinedMonthlyData = React.useMemo(() => {
    if (!data?.monthly_trend) return [];
    
    const spendingMap = new Map(data.monthly_trend.map(item => [item.month, item.total_amount]));
    const incomeMap = new Map((data?.monthly_income || []).map(item => [item.month, item.total_amount]));
    
    // Get all unique months
    const allMonths = new Set([...spendingMap.keys(), ...incomeMap.keys()]);
    
    const result = Array.from(allMonths).map(month => {
      const spending = parseFloat(spendingMap.get(month) || 0);
      const income = parseFloat(incomeMap.get(month) || 0);
      const balance = income - spending;
      
      return {
        month,
        spending,
        income,
        balance
      };
    }).sort((a, b) => new Date(a.month) - new Date(b.month));
    
    return result;
  }, [data?.monthly_trend, data?.monthly_income]);

  // Fetch data with current filters
  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }
    if (selectedAccount !== 'all') {
      params.append('account_id', selectedAccount);
    }

    axios.get(`http://127.0.0.1:8000/api/visualizations/?${params.toString()}`)
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching visualization data:", error);
        setData(null);
        setLoading(false);
      });
  }, [startDate, endDate, selectedAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Simplified check - if we have any data at all, show the analytics
  const hasTransactions = data !== null;

  if (!hasTransactions) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Financial Insights 📊
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
            <AddCircleOutlineIcon sx={{ 
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
              Start by uploading your bank statements to see beautiful visualizations and insights about your spending patterns.
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

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  // Chart styling that adapts to theme
  const chartStyle = {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
  };

  const axisStyle = {
    stroke: theme.palette.text.secondary,
    fontSize: 12,
  };


  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
  };

  // Safe formatter functions
  const formatCurrency = (value) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatCurrencyShort = (value) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatPercentage = (value) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return `${(numValue * 100).toFixed(0)}%`;
  };

  // Summary metrics component
  const SummaryCard = ({ title, value, icon, trend, color = "primary" }) => (
    <Card sx={{ height: '100%', ...chartStyle }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography 
                  variant="body2" 
                  color={trend > 0 ? "success.main" : "error.main"}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Financial Insights 📊
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchData}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, ...chartStyle }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters & Date Range
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Account</InputLabel>
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  label="Account"
                >
                  <MenuItem value="all">All Accounts</MenuItem>
                  {Array.isArray(accounts) && accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.bank} - {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeUncategorized}
                    onChange={(e) => setIncludeUncategorized(e.target.checked)}
                    color="primary"
                  />
                }
                label="Include Uncategorized"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

        {/* Summary Metrics */}
        {data?.summary_metrics && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total Spending"
                value={formatCurrency(data.summary_metrics.total_spending)}
                icon={<ShoppingCartIcon sx={{ fontSize: 40 }} />}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total Income"
                value={formatCurrency(data.summary_metrics.total_income)}
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Net Balance"
                value={formatCurrency(data.summary_metrics.net_balance)}
                icon={<AccountBalanceIcon sx={{ fontSize: 40 }} />}
                color={data.summary_metrics.net_balance >= 0 ? "success" : "error"}
                trend={data.summary_metrics.mom_change_percent}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Avg Daily Spending"
                value={formatCurrency(data.summary_metrics.avg_daily_spending)}
                icon={<TrendingDownIcon sx={{ fontSize: 40 }} />}
                color="warning"
              />
            </Grid>
          </Grid>
        )}

        {/* Unusual Spending Alert */}
        {data?.unusual_transactions && data.unusual_transactions.length > 0 && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="h6" gutterBottom>
              Unusual Spending Detected
            </Typography>
            <Typography variant="body2">
              We detected {data.unusual_transactions.length} transactions that are significantly higher than your average spending:
            </Typography>
            <Box mt={1}>
              {data.unusual_transactions.map((transaction, index) => (
                <Chip
                  key={index}
                  label={`${transaction.description} - ${formatCurrency(transaction.amount)}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Category Spending Breakdown (Pie Chart) */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ ...chartStyle }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">Spending Breakdown by Category</Typography>
                    <Tooltip 
                      title="This pie chart shows how your spending is distributed across different categories. Each slice represents the percentage and dollar amount spent in that category."
                      arrow
                      placement="top"
                    >
                      <IconButton size="small" color="primary">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                {data?.category_spending && data.category_spending.length > 0 ? (
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const filteredData = data.category_spending
                            .filter(item => includeUncategorized || item.category__name !== null)
                            .map(item => ({
                              ...item,
                              category__name: item.category__name || 'Uncategorized',
                              total_amount: parseFloat(item.total_amount) || 0
                            }));
                          
                          const totalAmount = filteredData.reduce((sum, item) => sum + item.total_amount, 0);
                          
                          return filteredData.map((item, index) => {
                            const percentage = totalAmount > 0 ? (item.total_amount / totalAmount) * 100 : 0;
                            return (
                              <TableRow key={`row-${index}`} hover>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <Box
                                      width={12}
                                      height={12}
                                      borderRadius="50%"
                                      bgcolor={COLORS[index % COLORS.length]}
                                      mr={1}
                                    />
                                    {item.category__name}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(item.total_amount)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" color="text.secondary">
                                    {formatPercentage(percentage / 100)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography variant="body1" color="text.secondary">
                      No spending data available for the selected period
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly Spending Patterns */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ ...chartStyle }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">Weekly Spending Patterns</Typography>
                  <Tooltip 
                    title="This chart shows your spending patterns by day of the week. It helps identify which days you tend to spend more money."
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" color="primary">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {data?.weekly_patterns && data.weekly_patterns.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.weekly_patterns} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis 
                        dataKey="day" 
                        tick={axisStyle}
                        axisLine={axisStyle}
                        tickLine={axisStyle}
                      />
                      <YAxis 
                        tick={axisStyle}
                        axisLine={axisStyle}
                        tickLine={axisStyle}
                        tickFormatter={formatCurrencyShort}
                      />
                      <RechartsTooltip 
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [formatCurrency(value), 'Amount']}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill={COLORS[1]} 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography variant="body1" color="text.secondary">
                      No weekly data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Spending & Income Trend (Line Chart) */}
          <Grid item xs={12}>
            <Card sx={{ ...chartStyle }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">Monthly Spending, Income & Balance Trend</Typography>
                  <Tooltip 
                    title="This line chart tracks your monthly spending (red), income (green), and net balance (blue dashed) over time. The balance line shows your net financial position each month."
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" color="primary">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={combinedMonthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="month" 
                      tick={axisStyle}
                      axisLine={axisStyle}
                      tickLine={axisStyle}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    />
                    <YAxis 
                      tick={axisStyle}
                      axisLine={axisStyle}
                      tickLine={axisStyle}
                      tickFormatter={formatCurrencyShort}
                    />
                    <RechartsTooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [formatCurrency(value), name]}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="spending" 
                      stroke={COLORS[1]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[1], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: COLORS[1], strokeWidth: 2 }}
                      name="Spending"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke={theme.palette.success.main}
                      strokeWidth={2}
                      dot={{ fill: theme.palette.success.main, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: theme.palette.success.main, strokeWidth: 2 }}
                      name="Income"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke={theme.palette.info.main}
                      strokeWidth={3}
                      dot={{ fill: theme.palette.info.main, strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: theme.palette.info.main, strokeWidth: 2 }}
                      name="Balance"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Merchants */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ ...chartStyle }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">Top Merchants</Typography>
                  <Tooltip 
                    title="This chart shows your top merchants by total spending amount. It helps identify where you spend the most money."
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" color="primary">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {data?.top_merchants && data.top_merchants.length > 0 ? (
                  <Box>
                    {data.top_merchants.slice(0, 10).map((merchant, index) => (
                      <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                        <Typography variant="body2" sx={{ flex: 1, mr: 2 }}>
                          {merchant.description.length > 30 
                            ? `${merchant.description.substring(0, 30)}...` 
                            : merchant.description
                          }
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" color="text.secondary">
                            {merchant.transaction_count} txns
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(merchant.total_amount)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                    <Typography variant="body1" color="text.secondary">
                      No merchant data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Spending Consistency (Bar Chart) */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ ...chartStyle }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="h6">Spending Consistency by Category</Typography>
                  <Tooltip 
                    title="This bar chart shows the standard deviation of spending in each category. Lower values indicate more consistent spending patterns, while higher values suggest more variable spending."
                    arrow
                    placement="top"
                  >
                    <IconButton size="small" color="primary">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(data.category_variance || {}).map(([name, std_dev]) => ({ name, std_dev }))} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="name" 
                      tick={axisStyle}
                      axisLine={axisStyle}
                      tickLine={axisStyle}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={axisStyle}
                      axisLine={axisStyle}
                      tickLine={axisStyle}
                      tickFormatter={formatCurrencyShort}
                    />
                    <RechartsTooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value) => [formatCurrency(value), 'Standard Deviation']}
                    />
                    <Bar 
                      dataKey="std_dev" 
                      fill={COLORS[2]} 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
  );
};

export default Visualizations;