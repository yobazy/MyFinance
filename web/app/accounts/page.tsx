'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  CreditCard as CreditCardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Savings as SavingsIcon,
  Sort as SortIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link';

type SortField = 'balance' | 'name' | 'bank' | 'type';
type SortOrder = 'asc' | 'desc';

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bank, setBank] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'credit'>(
    'checking'
  );
  const [message, setMessage] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [plaidTargetAccount, setPlaidTargetAccount] = useState<Account | null>(null);
  const [plaidBusy, setPlaidBusy] = useState(false);
  const [plaidImporting, setPlaidImporting] = useState(false);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setOpenSnackbar(true);
  };

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      showMessage(`Failed to fetch accounts: ${error.message}`);
      setAccounts([]);
      return;
    }
    setAccounts((data ?? []) as Account[]);
  }, [supabase]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingAccount(null);
      setOpenDialog(true);
      router.replace('/accounts');
    }
  }, [router, searchParams]);

  const resetDialog = () => {
    setOpenDialog(false);
    setEditingAccount(null);
    setAccountName('');
    setBank('');
    setAccountType('checking');
  };

  const handleAddAccount = async () => {
    if (!bank || !accountName) {
      showMessage('Please fill in all fields');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('accounts')
      .insert({ bank, name: accountName, type: accountType });
    setBusy(false);
    if (error) showMessage(`Failed to create account: ${error.message}`);
    else {
      await fetchAccounts();
      resetDialog();
      showMessage('Account created successfully!');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !bank || !accountName) {
      showMessage('Please fill in all fields');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('accounts')
      .update({ bank, name: accountName, type: accountType })
      .eq('id', editingAccount.id);
    setBusy(false);
    if (error) showMessage(`Failed to update account: ${error.message}`);
    else {
      await fetchAccounts();
      resetDialog();
      showMessage('Account updated successfully!');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setBusy(true);
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    setBusy(false);
    if (error) showMessage(`Failed to delete account: ${error.message}`);
    else {
      await fetchAccounts();
      showMessage('Account deleted successfully!');
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setBank(account.bank ?? '');
    setAccountName(account.name ?? '');
    setAccountType((account.type as any) ?? 'checking');
    setOpenDialog(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <AccountIcon />;
      case 'savings':
        return <SavingsIcon />;
      case 'credit':
        return <CreditCardIcon />;
      default:
        return <AccountIcon />;
    }
  };

  const getBankIcon = (bank: string): React.ReactElement | undefined => {
    const b = bank.toUpperCase();
    switch (b) {
      case 'AMEX':
      case 'AMERICAN EXPRESS':
        return (
          <img
            src="/bank_amex_icon.svg"
            alt="American Express Logo"
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
        );
      case 'TD':
        return (
          <img
            src="/bank_td_icon.svg"
            alt="TD Bank Logo"
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
        );
      case 'SCOTIA':
      case 'SCOTIABANK':
        return (
          <img
            src="/bank_scotia_icon.svg"
            alt="Scotiabank Logo"
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
        );
      default:
        return undefined;
    }
  };

  const sortAccounts = (list: Account[], field: SortField, order: SortOrder): Account[] => {
    return [...list].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'balance':
          comparison = Number(a.balance ?? 0) - Number(b.balance ?? 0);
          break;
        case 'name':
          comparison = String(a.name ?? '').localeCompare(String(b.name ?? ''));
          break;
        case 'bank':
          comparison = String(a.bank ?? '').localeCompare(String(b.bank ?? ''));
          break;
        case 'type':
          comparison = String(a.type ?? '').localeCompare(String(b.type ?? ''));
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <SortIcon />;
    return sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />;
  };

  const importPlaidTransactions = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!plaidTargetAccount) {
        showMessage('Failed to import: target account is missing.');
        return;
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        showMessage(`Failed to import: ${sessionErr.message}`);
        return;
      }

      const token = sessionData.session?.access_token;
      if (!token) {
        showMessage('Failed to import: missing session access token.');
        return;
      }

      const plaidAccountId =
        metadata.accounts.length === 1 ? metadata.accounts[0]?.id : undefined;

      setPlaidImporting(true);
      try {
        const resp = await fetch('/api/plaid/import', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            publicToken,
            accountId: plaidTargetAccount.id,
            plaidAccountId,
          }),
        });

        const body = (await resp.json()) as {
          ok?: boolean;
          rowsProcessed?: number;
          error?: string;
        };

        if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);

        showMessage(
          `Plaid import complete for ${plaidTargetAccount.name}: ${
            body.rowsProcessed ?? 0
          } rows processed.`
        );
      } catch (e) {
        showMessage(
          `Failed Plaid import: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      } finally {
        setPlaidImporting(false);
        setPlaidLinkToken(null);
        setPlaidTargetAccount(null);
      }
    },
    [plaidTargetAccount, supabase]
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: importPlaidTransactions,
    onExit: (err) => {
      if (err?.error_message) showMessage(`Plaid closed: ${err.error_message}`);
      setPlaidLinkToken(null);
      setPlaidTargetAccount(null);
    },
  });

  useEffect(() => {
    if (plaidLinkToken && plaidReady) openPlaid();
  }, [openPlaid, plaidLinkToken, plaidReady]);

  const handleConnectPlaid = useCallback(
    async (account: Account) => {
      setPlaidBusy(true);
      setPlaidTargetAccount(account);

      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Missing session access token.');

        const resp = await fetch('/api/plaid/link-token', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });

        const body = (await resp.json()) as {
          ok?: boolean;
          linkToken?: string;
          error?: string;
        };

        if (!resp.ok || !body.linkToken) {
          throw new Error(body.error ?? `HTTP ${resp.status}`);
        }

        setPlaidLinkToken(body.linkToken);
      } catch (e) {
        showMessage(
          `Failed to start Plaid link: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        setPlaidTargetAccount(null);
      } finally {
        setPlaidBusy(false);
      }
    },
    [supabase]
  );

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Manage Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add and manage your bank accounts to track your finances
        </Typography>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEditingAccount(null);
            setOpenDialog(true);
          }}
        >
          Add New Account
        </Button>

        <Tooltip title="Balance refresh isn’t implemented yet in the Supabase version.">
          <span>
            <Button
              variant="outlined"
              color="secondary"
              disabled
              startIcon={<RefreshIcon />}
            >
              Refresh Balances
            </Button>
          </span>
        </Tooltip>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Sort by:
          </Typography>
          <Button
            variant={sortBy === 'name' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleSortChange('name')}
            startIcon={getSortIcon('name')}
          >
            Account Name
          </Button>
          <Button
            variant={sortBy === 'bank' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleSortChange('bank')}
            startIcon={getSortIcon('bank')}
          >
            Bank
          </Button>
          <Button
            variant={sortBy === 'balance' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleSortChange('balance')}
            startIcon={getSortIcon('balance')}
          >
            Balance
          </Button>
          <Button
            variant={sortBy === 'type' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleSortChange('type')}
            startIcon={getSortIcon('type')}
          >
            Type
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {sortAccounts(accounts, sortBy, sortOrder).map((account) => (
          <Grid item xs={12} sm={6} md={4} key={account.id}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
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
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={busy}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Chip
                  label={account.bank}
                  size="small"
                  sx={{ mb: 2 }}
                  icon={getBankIcon(account.bank)}
                />

                <Typography variant="body2" color="text.secondary">
                  Account Type:{' '}
                  {String(account.type ?? '').charAt(0).toUpperCase() + String(account.type ?? '').slice(1)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Balance: ${Number(account.balance ?? 0).toLocaleString()}
                </Typography>

                <Button
                  sx={{ mt: 2 }}
                  size="small"
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => handleConnectPlaid(account)}
                  disabled={busy || plaidBusy || plaidImporting}
                >
                  Connect with Plaid
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={resetDialog} fullWidth>
        <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Bank</InputLabel>
            <Select value={bank} label="Bank" onChange={(e) => setBank(e.target.value)}>
              <MenuItem value="TD">
                <Box display="flex" alignItems="center" gap={1}>
                  {getBankIcon('TD')}
                  Toronto-Dominion Bank
                </Box>
              </MenuItem>
              <MenuItem value="AMEX">
                <Box display="flex" alignItems="center" gap={1}>
                  {getBankIcon('AMEX')}
                  American Express
                </Box>
              </MenuItem>
              <MenuItem value="SCOTIA">
                <Box display="flex" alignItems="center" gap={1}>
                  {getBankIcon('SCOTIA')}
                  Scotiabank
                </Box>
              </MenuItem>
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
              onChange={(e) =>
                setAccountType(e.target.value as 'checking' | 'savings' | 'credit')
              }
            >
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
              <MenuItem value="credit">Credit Card</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetDialog}>Cancel</Button>
          <Button
            onClick={editingAccount ? handleUpdateAccount : handleAddAccount}
            variant="contained"
            disabled={busy}
          >
            {editingAccount ? 'Save Changes' : 'Add Account'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={message.toLowerCase().includes('failed') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

