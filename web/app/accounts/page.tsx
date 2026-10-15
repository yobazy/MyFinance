'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountBalanceRounded as AccountIcon,
  AddRounded as AddIcon,
  CreditCardRounded as CreditCardIcon,
  DeleteOutlineRounded as DeleteIcon,
  EditOutlined as EditIcon,
  LinkRounded as LinkIcon,
  MoreHorizRounded as MoreIcon,
  RefreshRounded as RefreshIcon,
  SavingsRounded as SavingsIcon,
  TrendingDownRounded as TrendingDownIcon,
  TrendingUpRounded as TrendingUpIcon,
  UploadFileRounded as UploadFileIcon,
  WalletRounded as WalletIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';
import {
  BankLogo,
  EmptyState,
  Money,
  PageHeader,
  PageSkeleton,
  StatCard,
  StatusChip,
  bankDisplayName,
} from '../components/ui';
import { formatMoney, formatRelative, humanize, plural } from '../../lib/format';

type SortField = 'balance' | 'name' | 'bank' | 'type';
type SortOrder = 'asc' | 'desc';
type AccountType = 'checking' | 'savings' | 'credit';

const SORT_OPTIONS: { value: `${SortField}:${SortOrder}`; label: string }[] = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'balance:desc', label: 'Balance (high to low)' },
  { value: 'balance:asc', label: 'Balance (low to high)' },
  { value: 'bank:asc', label: 'Bank' },
  { value: 'type:asc', label: 'Type' },
];

const BANK_OPTIONS: { value: string; label: string }[] = [
  { value: 'TD', label: 'Toronto-Dominion Bank' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'SCOTIA', label: 'Scotiabank' },
];

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

function accountTypeIcon(type: string) {
  switch (type) {
    case 'savings':
      return <SavingsIcon />;
    case 'credit':
      return <CreditCardIcon />;
    default:
      return <AccountIcon />;
  }
}

function accountTypeLabel(type: string | null | undefined): string {
  if (type === 'credit') return 'Credit card';
  return humanize(String(type ?? 'checking'));
}

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceRollupByAccountId, setBalanceRollupByAccountId] = useState<
    Record<string, { txSum: number; txCount: number; lastTxDate: string | null }>
  >({});
  const [bank, setBank] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [plaidTargetAccount, setPlaidTargetAccount] = useState<Account | null>(null);
  const [plaidBusy, setPlaidBusy] = useState(false);
  const [plaidImporting, setPlaidImporting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; account: Account } | null>(null);

  const showMessage = useCallback(
    (msg: string) => {
      if (msg.toLowerCase().includes('failed')) toast.error(msg);
      else toast.success(msg);
    },
    [toast]
  );

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
  }, [showMessage, supabase]);

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
  }, [showMessage, supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchAccounts(), fetchBalanceRollup()]);
      setLoading(false);
    })();
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
      toast.warning('Please fill in all fields.');
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
      showMessage('Account created.');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !bank || !accountName) {
      toast.warning('Please fill in all fields.');
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
      showMessage('Account updated.');
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    const ok = await confirm({
      title: `Delete “${account.name}”?`,
      description:
        'This permanently removes the account and every transaction imported into it. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.from('accounts').delete().eq('id', account.id);
    setBusy(false);
    if (error) showMessage(`Failed to delete account: ${error.message}`);
    else {
      await fetchAccounts();
      await fetchBalanceRollup();
      showMessage('Account deleted.');
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setBank(account.bank ?? '');
    setAccountName(account.name ?? '');
    setAccountType((account.type as AccountType) ?? 'checking');
    setOpenDialog(true);
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
        await fetchAccounts();
        await fetchBalanceRollup();
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
    [fetchAccounts, fetchBalanceRollup, plaidTargetAccount, showMessage, supabase]
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: importPlaidTransactions,
    onExit: (err) => {
      if (err?.error_message) toast.info(`Plaid closed: ${err.error_message}`);
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
    [showMessage, supabase]
  );

  // ── Derived summary ─────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let total = 0;
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      const v = getDisplayedBalance(a).value;
      total += v;
      if (v >= 0) assets += v;
      else liabilities += Math.abs(v);
    }
    return { total, assets, liabilities };
  }, [accounts, getDisplayedBalance]);

  const sortedAccounts = useMemo(
    () => sortAccounts(accounts, sortBy, sortOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, sortBy, sortOrder, getDisplayedBalance]
  );

  const openCreateDialog = () => {
    setEditingAccount(null);
    setOpenDialog(true);
  };

  const headerActions = (
    <>
      <Tooltip title="Refresh balances">
        <span>
          <IconButton onClick={fetchBalanceRollup} disabled={busy} aria-label="Refresh balances">
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => router.push('/upload')}>
        Upload statement
      </Button>
      <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
        Add account
      </Button>
    </>
  );

  if (loading) {
    return <PageSkeleton stats={4} rows={3} />;
  }

  return (
    <Box>
      <PageHeader
        title="Accounts"
        description="Every account you track. Connect a bank with Plaid, or upload an Amex statement manually."
        actions={headerActions}
      />

      {accounts.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<AccountIcon />}
          title="Add your first account"
          description="Accounts are where transactions live. Create one, then connect it to Plaid for ongoing imports or upload an Amex statement."
          actions={
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Add account
            </Button>
          }
        />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <StatCard
              label="Total balance"
              value={formatMoney(summary.total)}
              icon={<WalletIcon />}
              hint="Across all accounts"
            />
            <StatCard
              label="Assets"
              value={formatMoney(summary.assets)}
              icon={<TrendingUpIcon />}
              tone="positive"
              hint="Positive balances"
            />
            <StatCard
              label="Liabilities"
              value={formatMoney(summary.liabilities)}
              icon={<TrendingDownIcon />}
              tone={summary.liabilities > 0 ? 'negative' : 'default'}
              hint="Credit and negative balances"
            />
            <StatCard
              label="Accounts"
              value={accounts.length}
              icon={<AccountIcon />}
              hint={plural(accounts.length, 'account')}
            />
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1.5}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Plaid is the main path for ongoing imports. Manual statement upload is available for Amex accounts.
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="account-sort-label">Sort by</InputLabel>
              <Select
                labelId="account-sort-label"
                label="Sort by"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = String(e.target.value).split(':') as [SortField, SortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {sortedAccounts.map((account) => {
              const balance = getDisplayedBalance(account);
              const rollup = balanceRollupByAccountId[account.id];
              const connecting = plaidTargetAccount?.id === account.id && (plaidBusy || plaidImporting);
              return (
                <Card
                  key={account.id}
                  sx={{
                    p: 2.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    transition: 'border-color 120ms ease, transform 120ms ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.text.primary, 0.2),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" gap={1.5}>
                    <BankLogo bank={account.bank} size={40} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap sx={{ lineHeight: 1.25 }}>
                        {account.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {bankDisplayName(account.bank)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${account.name}`}
                      onClick={(e) => setMenuAnchor({ el: e.currentTarget, account })}
                      disabled={busy}
                      sx={{ mt: -0.5, mr: -0.5, color: 'text.secondary' }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Box>
                    <Money
                      value={balance.value}
                      variant="h4"
                      component="div"
                      sx={{ fontWeight: 650, letterSpacing: '-0.03em', color: balance.value < 0 ? 'error.main' : 'text.primary' }}
                    />
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <StatusChip
                        status={String(account.type ?? 'checking')}
                        label={accountTypeLabel(account.type)}
                        tone="neutral"
                        dot={false}
                        icon={accountTypeIcon(String(account.type ?? ''))}
                        sx={{ '& .MuiChip-icon': { fontSize: 14, ml: 0.75, color: 'inherit' } }}
                      />
                      {balance.source === 'computed' ? (
                        <Tooltip title="Calculated from imported transactions; no stored balance yet.">
                          <Typography variant="caption" color="text.secondary">
                            computed
                          </Typography>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </Box>

                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: 'auto' }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {rollup?.lastTxDate
                        ? `Last activity ${formatRelative(rollup.lastTxDate)}`
                        : rollup?.txCount
                          ? plural(rollup.txCount, 'transaction')
                          : 'No transactions yet'}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => handleConnectPlaid(account)}
                      disabled={busy || plaidBusy || plaidImporting}
                    >
                      {connecting ? 'Connecting…' : 'Connect bank'}
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <Menu
        anchorEl={menuAnchor?.el ?? null}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            const a = menuAnchor?.account;
            setMenuAnchor(null);
            if (a) handleEditAccount(a);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const a = menuAnchor?.account;
            setMenuAnchor(null);
            if (a) void handleDeleteAccount(a);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={openDialog} onClose={resetDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editingAccount ? 'Edit account' : 'Add account'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: '0.875rem' }}>
            {editingAccount
              ? 'Update the details for this account.'
              : 'Pick the bank and give the account a name you will recognise.'}
          </DialogContentText>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="account-bank-label">Bank</InputLabel>
              <Select
                labelId="account-bank-label"
                value={bank}
                label="Bank"
                onChange={(e) => setBank(e.target.value)}
                renderValue={(v) => {
                  const opt = BANK_OPTIONS.find((o) => o.value === v);
                  return (
                    <Stack direction="row" alignItems="center" gap={1}>
                      <BankLogo bank={String(v)} size={22} />
                      <span>{opt?.label ?? String(v)}</span>
                    </Stack>
                  );
                }}
              >
                {BANK_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <BankLogo bank={o.value} size={24} />
                      <span>{o.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Amex supports manual statement uploads; other banks import via Plaid.</FormHelperText>
            </FormControl>

            <TextField
              fullWidth
              label="Account name"
              placeholder="e.g. Everyday Chequing"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              autoFocus
            />

            <FormControl fullWidth>
              <InputLabel id="account-type-label">Account type</InputLabel>
              <Select
                labelId="account-type-label"
                value={accountType}
                label="Account type"
                onChange={(e) => setAccountType(e.target.value as AccountType)}
              >
                <MenuItem value="checking">Checking</MenuItem>
                <MenuItem value="savings">Savings</MenuItem>
                <MenuItem value="credit">Credit card</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={editingAccount ? handleUpdateAccount : handleAddAccount}
            variant="contained"
            disabled={busy || !bank || !accountName.trim()}
          >
            {editingAccount ? 'Save changes' : 'Add account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
