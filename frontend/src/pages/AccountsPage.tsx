import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccountBalance as AccountIcon,
  CreditCard as CreditCardIcon,
  Savings as SavingsIcon,
} from "@mui/icons-material";
import axios from "axios";

interface Account {
  id: number;
  name: string;
  bank: string;
  type: "checking" | "savings" | "credit";
  balance: number;
  lastUpdated: string;
}

const AccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bank, setBank] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings" | "credit">("checking");
  const [message, setMessage] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/accounts/");
      setAccounts(response.data.accounts);
    } catch (error) {
      showMessage("Failed to fetch accounts", "error");
    }
  };

  const showMessage = (msg: string, severity: "success" | "error" = "success") => {
    setMessage(msg);
    setOpenSnackbar(true);
  };

  const handleAddAccount = async () => {
    if (!bank || !accountName || !accountType) {
      showMessage("Please fill in all fields", "error");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/api/accounts/create/", {
        bank,
        name: accountName,
        type: accountType,
      });
      
      await fetchAccounts();
      setAccountName("");
      setBank("");
      setAccountType("checking");
      setOpenDialog(false);
      showMessage("Account created successfully!");
    } catch (error) {
      showMessage("Failed to create account", "error");
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/accounts/${accountId}/delete/`);
      await fetchAccounts();
      showMessage("Account deleted successfully!");
    } catch (error) {
      showMessage("Failed to delete account", "error");
    }
  };

  const handleEditAccount = async (account: Account) => {
    setEditingAccount(account);
    setBank(account.bank);
    setAccountName(account.name);
    setAccountType(account.type);
    setOpenDialog(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <AccountIcon />;
      case "savings":
        return <SavingsIcon />;
      case "credit":
        return <CreditCardIcon />;
      default:
        return <AccountIcon />;
    }
  };

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Manage Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add and manage your bank accounts to track your finances
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setEditingAccount(null);
          setOpenDialog(true);
        }}
        sx={{ mb: 4 }}
      >
        Add New Account
      </Button>

      <Grid container spacing={3}>
        {accounts.map((account) => (
          <Grid item xs={12} sm={6} md={4} key={account.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center">
                    {getAccountIcon(account.type)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {account.name}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleEditAccount(account)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteAccount(account.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Chip 
                  label={account.bank}
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary">
                  Account Type: {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Balance: ${account.balance?.toLocaleString() ?? '0'}
                </Typography>
                
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Last Updated: {new Date(account.lastUpdated).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Account Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingAccount ? "Edit Account" : "Add New Account"}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Bank</InputLabel>
            <Select
              value={bank}
              label="Bank"
              onChange={(e) => setBank(e.target.value)}
            >
              <MenuItem value="TD">Toronto-Dominion Bank</MenuItem>
              <MenuItem value="AMEX">American Express</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Account Name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            sx={{ mt: 2 }}
          />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Account Type</InputLabel>
            <Select
              value={accountType}
              label="Account Type"
              onChange={(e) => setAccountType(e.target.value as "checking" | "savings" | "credit")}
            >
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
              <MenuItem value="credit">Credit Card</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAccount} variant="contained">
            {editingAccount ? "Save Changes" : "Add Account"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={message.includes("Failed") ? "error" : "success"}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AccountsPage; 