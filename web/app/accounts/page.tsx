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
  UploadFile as UploadFileIcon,
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

function describeInvalidSupabaseAccessToken(token: string): string | null {
  // Supabase user session access tokens are JWTs and should not contain whitespace.
  if (!token) return 'Missing Supabase session access token. Please sign in again.';

  if (token.trim() !== token) {
    return 'Your Supabase session token has leading/trailing whitespace. Please sign out/in and ensure you did not paste keys with extra spaces in your env.';
  }

  if (/\s/.test(token)) {
    return 'Your Supabase session token contains whitespace (space/newline), so the browser refuses to send it as an Authorization header. This usually means you pasted a Supabase key incorrectly (or used a key where a user JWT should be). Please sign out/in and double-check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is an anon/publishable key, not a `sb_secret_...` service role key.';
  }

  if (token.startsWith('sb_secret_') || token.startsWith('sb_publishable_')) {
    return 'The value being used as your Supabase session access token looks like a Supabase API key (`sb_*`), not a user JWT. Ensure you are logged in with Supabase Auth, and double-check your `web/.env.local`: `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be an anon/publishable key (never `sb_secret_...`).';
  }

  if (!token.startsWith('eyJ')) {
    return 'Your Supabase session access token does not look like a JWT. Please sign out/in and double-check `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.';
  }

  return null;
}

function formatClientSideFetchAuthHeaderError(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('Headers.append') && msg.includes('invalid header value')) {
    return 'Failed to send request: invalid Authorization header value. Your Supabase access token likely contains whitespace or is actually a Supabase API key (`sb_*`) instead of a user JWT. Check `web/.env.local` keys and re-login.';
  }
  return null;
}

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceRollupByAccountId, setBalanceRollupByAccountId] = useState<
    Record<string, { txSum: number; txCount: number; lastTxDate: string | null }>
  >({});
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

  const fetchBalanceRollup = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_account_balance_rollup');
    if (error) {
      showMessage(`Failed to fetch balance rollup: ${error.message}`);
      setBalanceRollupByAccountId({});
      return;
    }

    const map: Record<string, { txSum: number; txCount: number; lastTxDate: string | null }> = {};
    for (const row of (data ?? []) as any[]) {
      const accountId = String(row.account_id ?? '');
      if (!accountId) continue;
      map[accountId] = {
        txSum: Number(row.tx_sum ?? 0),
        txCount: Number(row.tx_count ?? 0),
        lastTxDate: row.last_tx_date ? String(row.last_tx_date) : null,
      };
    }
    setBalanceRollupByAccountId(map);
  }, [supabase]);

  useEffect(() => {
    fetchAccounts();
    fetchBalanceRollup();
  }, [fetchAccounts, fetchBalanceRollup]);

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

  const getDisplayedBalance = useCallback(
    (account: Account): { value: number; source: 'stored' | 'computed' } => {
      const stored = Number(account.balance ?? 0);
      const rollup = balanceRollupByAccountId[account.id];
      const computed = Number(rollup?.txSum ?? 0);
      const hasTx = Number(rollup?.txCount ?? 0) > 0;

      // If stored balance exists, use it (it should be correct)
      // Otherwise, for computed balance: In this system, expenses are positive and income is negative.
      // For account balance: income increases balance (should be positive), expenses decrease it (should be negative).
      // So we need to invert the sign: balance = -sum(transactions)
      if (stored !== 0) return { value: stored, source: 'stored' };
      if (hasTx) return { value: -computed, source: 'computed' }; // Invert sign because expenses are + and income is -
      return { value: stored, source: 'stored' };
    },
    [balanceRollupByAccountId]
  );

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
      await fetchBalanceRollup();
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
      await fetchBalanceRollup();
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
      await fetchBalanceRollup();
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
          comparison = getDisplayedBalance(a).value - getDisplayedBalance(b).value;
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
      const tokenIssue = describeInvalidSupabaseAccessToken(token);
      if (tokenIssue) {
        showMessage(tokenIssue);
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
        const friendly = formatClientSideFetchAuthHeaderError(e);
        showMessage(
          `Failed Plaid import: ${friendly ?? (e instanceof Error ? e.message : String(e))}`
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
        const tokenIssue = describeInvalidSupabaseAccessToken(token);
        if (tokenIssue) throw new Error(tokenIssue);

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
        const friendly = formatClientSideFetchAuthHeaderError(e);
        showMessage(
          `Failed to start Plaid link: ${friendly ?? (e instanceof Error ? e.message : String(e))}`
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
          Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add an account first, then either connect it with Plaid or upload an Amex statement.
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

        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => router.push('/upload')}
        >
          Upload Amex statement
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<RefreshIcon />}
          onClick={fetchBalanceRollup}
          disabled={busy}
        >
          Refresh Balances
        </Button>

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

      <Alert severity="info" sx={{ mb: 4 }}>
        Plaid is the main path for ongoing imports. Manual statement upload is currently available for Amex accounts.
      </Alert>

      {accounts.length === 0 ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Start here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first account so you have somewhere to connect Plaid or attach an Amex statement.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setEditingAccount(null);
                setOpenDialog(true);
              }}
            >
              Add first account
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
                  {(() => {
                    const b = getDisplayedBalance(account);
                    const suffix = b.source === 'computed' ? ' (computed)' : '';
                    return `Balance: $${Number(b.value ?? 0).toLocaleString()}${suffix}`;
                  })()}
                </Typography>

                <Button
                  sx={{ mt: 2 }}
                  size="small"
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => handleConnectPlaid(account)}
                  disabled={busy || plaidBusy || plaidImporting}
                >
                  Connect bank
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

