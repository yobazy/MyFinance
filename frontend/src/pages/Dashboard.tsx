import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import {
  AccountBalance as AccountIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Account {
  id: number;
  name: string;
  bank: string;
  type: string;
  balance: number;
  lastUpdated: string;
}

interface DashboardData {
  totalBalance: number;
  recentTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    category__name?: string;
    account__name?: string;
    account__bank?: string;
  }>;
  monthlySpending: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/accounts/");
        setAccounts(response.data.accounts || []);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const params = selectedAccountId !== 'all' ? `?account_id=${selectedAccountId}` : '';
        const response = await axios.get(`http://127.0.0.1:8000/api/dashboard/${params}`);
        setDashboardData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedAccountId]);

  const handleAccountChange = (event: SelectChangeEvent) => {
    setSelectedAccountId(event.target.value);
  };

  const QuickActionCard = ({ icon, title, description, path }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
        }
      }}
      onClick={() => navigate(path)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" ml={1}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const quickActions = [
    {
      icon: <UploadIcon color="primary" />,
      title: "Upload Statements",
      description: "Import your bank statements to track expenses",
      path: "/upload"
    },
    {
      icon: <CategoryIcon color="primary" />,
      title: "Categorize",
      description: "Organize your transactions by category",
      path: "/categorization"
    },
    {
      icon: <TrendingUpIcon color="primary" />,
      title: "Analytics",
      description: "View spending insights and trends",
      path: "/visualizations"
    },
    {
      icon: <AccountIcon color="primary" />,
      title: "Manage Accounts",
      description: "Add or edit your bank accounts",
      path: "/accounts"
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Financial Dashboard
        </Typography>
        
        {/* Account Filter */}
        <FormControl sx={{ minWidth: 200 }}>
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
              <MenuItem key={account.id} value={account.id.toString()}>
                {account.bank} - {account.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Financial Overview */}
      {dashboardData ? (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Balance {selectedAccountId !== 'all' && '(Filtered)'}
                </Typography>
                <Typography variant="h3">
                  ${dashboardData.totalBalance.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Spending {selectedAccountId !== 'all' && '(Filtered)'}
                </Typography>
                <Typography variant="h3">
                  ${dashboardData.monthlySpending.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            No financial data yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Start by uploading your bank statements to see your financial overview
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/upload')}
          >
            Upload Statements
          </Button>
        </Paper>
      )}

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom mb={3}>
        Quick Actions
      </Typography>
      <Grid container spacing={3} mb={4}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <QuickActionCard {...action} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom mb={2}>
            Recent Transactions {selectedAccountId !== 'all' && '(Filtered)'}
          </Typography>
          <Card>
            <CardContent>
              {dashboardData.recentTransactions.map((transaction, index) => (
                <React.Fragment key={index}>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Box flex={1}>
                      <Typography variant="body1" fontWeight="medium" mb={0.5}>
                        {transaction.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.category__name || 'Uncategorized'}
                        {transaction.account__bank && transaction.account__name && (
                          ` • ${transaction.account__bank} - ${transaction.account__name}`
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium" sx={{ 
                      color: transaction.amount > 0 ? 'error.main' : 'success.main' 
                    }}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                    </Typography>
                  </Box>
                  {index < dashboardData.recentTransactions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default Dashboard; 