'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUploadRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import CheckIcon from '@mui/icons-material/CheckRounded';
import UndoIcon from '@mui/icons-material/UndoRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';
import { plural } from '../../lib/format';
import { PageHeader, SectionCard, EmptyState, BankLogo, bankDisplayName, StatusChip, PageSkeleton } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

type UploadResult = {
  filename: string;
  success: boolean;
  rowsProcessed?: number;
  error?: string;
  uploadId?: string;
  undone?: boolean;
};

function fileTypeForBank(bank: string | undefined | null): string | null {
  const b = (bank ?? '').toUpperCase();
  if (b.includes('AMEX')) return 'Amex';
  if (b.includes('TD')) return 'TD';
  if (b.includes('SCOT')) return 'Scotiabank';
  return null;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function UploadPage() {
  const theme = useTheme();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const toast = useToast();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountId, setAccountId] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [fileType, setFileType] = useState<string>('Amex');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('updated_at', { ascending: false });
      if (error) {
        setAccounts([]);
        setLoadError(`Failed to fetch accounts: ${error.message}`);
        setAccountsLoading(false);
        return;
      }
      const list = (data ?? []) as Account[];
      setAccounts(list);
      const first = list[0] ?? null;
      setAccountId(first?.id ?? '');
      setSelectedAccount(first);
      const ft = fileTypeForBank(first?.bank);
      if (ft) setFileType(ft);
      setAccountsLoading(false);
    })();
  }, [supabase]);

  const handleAccountChange = (value: string) => {
    if (value === 'add_account') {
      router.push('/accounts?create=true');
      return;
    }
    setAccountId(value);
    const acc = accounts.find((a) => a.id === value) ?? null;
    setSelectedAccount(acc);
    const ft = fileTypeForBank(acc?.bank);
    if (ft) setFileType(ft);
  };

  const accept = selectedAccount?.bank?.toUpperCase().includes('AMEX') ? '.csv,.xls,.xlsx' : '.csv,.xlsx';
  const manualUploadSupported = selectedAccount?.bank?.toUpperCase().includes('AMEX') ?? false;

  const handleFileChange = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(picked)]);
  };

  const handleRemoveFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const handleClearAllFiles = () => setFiles([]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length === 0) return;
    setFiles((prev) => [...prev, ...dropped]);
  };

  const uploadOne = async (f: File): Promise<UploadResult> => {
    try {
      if (!accountId) throw new Error('Please select an account.');
      if (fileType !== 'Amex') {
        throw new Error('Manual upload is currently available for Amex accounts only. Use Plaid from Accounts for other banks.');
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session access token.');

      const fd = new FormData();
      fd.set('file', f);
      fd.set('account_id', accountId);

      const resp = await fetch('/api/ingest/amex', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: fd,
      });

      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        await resp.text();
        throw new Error(`Server returned non-JSON response (${resp.status}). This may indicate a timeout or server error.`);
      }

      let body: { ok?: true; rowsProcessed?: number; uploadId?: string; error?: string };
      try {
        body = (await resp.json()) as typeof body;
      } catch (jsonErr) {
        throw new Error(`Failed to parse server response: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
      }

      if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);
      return { filename: f.name, success: true, rowsProcessed: body.rowsProcessed ?? 0, uploadId: body.uploadId };
    } catch (e) {
      return { filename: f.name, success: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const handleUndoResult = async (resultIndex: number) => {
    const current = uploadResults[resultIndex];
    if (!current?.success || !current.uploadId || current.undone) return;
    const ok = await confirm({
      title: 'Undo this upload?',
      description: `Transactions imported from "${current.filename}" will be removed. This cannot be reversed.`,
      confirmLabel: 'Undo upload',
      destructive: true,
    });
    if (!ok) return;

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session access token.');

      const resp = await fetch(`/api/uploads/${encodeURIComponent(current.uploadId)}/undo`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const body = (await resp.json()) as { error?: string; rowsReversed?: number };
      if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);

      setUploadResults((prev) => prev.map((r, i) => (i === resultIndex ? { ...r, undone: true } : r)));
      toast.success(`Upload "${current.filename}" undone. ${plural(body.rowsReversed ?? 0, 'transaction')} removed.`);
    } catch (e) {
      toast.error(`Undo failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    if (!selectedAccount || !accountId || files.length === 0) {
      toast.warning('Please select an account and at least one file.');
      setUploading(false);
      return;
    }

    const results: UploadResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const r = await uploadOne(files[i]);
      results.push(r);
      setUploadResults([...results]);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    const okCount = results.filter((r) => r.success).length;
    if (okCount === results.length) {
      toast.success(`${plural(okCount, 'statement')} imported.`);
      setFiles([]);
    } else {
      toast.error(`${okCount} of ${results.length} statements imported. Check the results for details.`);
    }
    setUploading(false);
  };

  if (accountsLoading) return <PageSkeleton stats={0} rows={4} />;

  if (accounts.length === 0) {
    return (
      <Box>
        <PageHeader title="Upload statement" description="Import Amex statements into an account." />
        {loadError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        ) : null}
        <EmptyState
          icon={<CloudUploadIcon />}
          title="Add an account first"
          description="Statements are attached to an account. Create one, then come back here to upload."
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/accounts?create=true')}>
              Create an account
            </Button>
          }
        />
      </Box>
    );
  }

  const canUpload = !uploading && !!selectedAccount && files.length > 0 && !!accountId && manualUploadSupported;

  return (
    <Box>
      <PageHeader
        title="Upload statement"
        description="Manual import is available for Amex accounts. For other banks, connect Plaid from Accounts."
      />

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.6fr) minmax(280px, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Stack spacing={3}>
          <Card sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <FormControl fullWidth>
                <InputLabel id="upload-account-label">Account</InputLabel>
                <Select
                  labelId="upload-account-label"
                  value={accountId}
                  label="Account"
                  onChange={(e) => handleAccountChange(e.target.value)}
                  renderValue={(value) => {
                    const acc = accounts.find((a) => a.id === value);
                    if (!acc) return '';
                    return (
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <BankLogo bank={acc.bank} size={24} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {acc.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bankDisplayName(acc.bank)}
                        </Typography>
                      </Stack>
                    );
                  }}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      <ListItemIcon>
                        <BankLogo bank={a.bank} size={24} />
                      </ListItemIcon>
                      <ListItemText primary={a.name} secondary={bankDisplayName(a.bank)} />
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value="add_account" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <AddIcon fontSize="small" />
                    </ListItemIcon>
                    Add new account
                  </MenuItem>
                </Select>
              </FormControl>

              {manualUploadSupported ? (
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragging ? 'primary.main' : alpha(theme.palette.text.primary, 0.18),
                    borderRadius: 3,
                    p: { xs: 3, sm: 4 },
                    textAlign: 'center',
                    bgcolor: isDragging
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
                      : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.015),
                    transition: 'border-color 120ms ease, background-color 120ms ease',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.7) },
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept={accept}
                    onChange={(e) => {
                      handleFileChange(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  <Box component="label" htmlFor="file-input" sx={{ cursor: 'pointer', display: 'block' }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 3,
                        mx: 'auto',
                        mb: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 620 }}>
                      Drop Amex files here or{' '}
                      <Box component="span" sx={{ color: 'primary.main' }}>
                        browse
                      </Box>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Supported formats: {accept.split(',').join(', ')}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<LinkIcon />}
                  title={`Manual upload isn't available for ${bankDisplayName(selectedAccount?.bank)}`}
                  description="Use Plaid from Accounts to import this bank, or pick an Amex account to upload a statement here."
                  actions={
                    <Button variant="outlined" onClick={() => router.push('/accounts')}>
                      Go to accounts
                    </Button>
                  }
                />
              )}

              {files.length > 0 ? (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {plural(files.length, 'file')} selected
                    </Typography>
                    <Button size="small" color="inherit" onClick={handleClearAllFiles} disabled={uploading}>
                      Clear all
                    </Button>
                  </Stack>
                  <Stack
                    divider={<Divider />}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}
                  >
                    {files.map((f, idx) => (
                      <Stack key={`${f.name}-${idx}`} direction="row" alignItems="center" gap={1.5} sx={{ px: 1.5, py: 1 }}>
                        <DescriptionIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 560 }}>
                            {f.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatSize(f.size)}
                          </Typography>
                        </Box>
                        <IconButton size="small" aria-label={`Remove ${f.name}`} onClick={() => handleRemoveFile(idx)} disabled={uploading}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {uploading ? (
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Uploading…
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="tabular-nums">
                      {uploadProgress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              ) : null}

              <Button variant="contained" size="large" fullWidth onClick={handleUpload} disabled={!canUpload} startIcon={<CloudUploadIcon />}>
                {files.length > 0 ? `Upload ${plural(files.length, 'statement')}` : 'Upload statement'}
              </Button>
            </Stack>
          </Card>

          {uploadResults.length > 0 ? (
            <SectionCard
              title="Results"
              action={
                <Button size="small" variant="outlined" onClick={() => router.push('/uploads')}>
                  Upload history
                </Button>
              }
              disablePadding
              divider
            >
              <Stack divider={<Divider />}>
                {uploadResults.map((r, idx) => (
                  <Stack key={`${r.filename}-${idx}`} direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, py: 1.5 }}>
                    <DescriptionIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 560 }}>
                        {r.filename}
                      </Typography>
                      <Typography variant="caption" color={r.success ? 'text.secondary' : 'error.main'}>
                        {r.success
                          ? r.undone
                            ? 'Upload undone'
                            : `${plural(r.rowsProcessed ?? 0, 'row')} processed`
                          : r.error ?? 'Unknown error'}
                      </Typography>
                    </Box>
                    <StatusChip status={r.success ? (r.undone ? 'reversed' : 'succeeded') : 'failed'} label={r.success ? (r.undone ? 'Undone' : 'Imported') : 'Failed'} />
                    {r.success && r.uploadId && !r.undone ? (
                      <Button size="small" startIcon={<UndoIcon />} onClick={() => void handleUndoResult(idx)}>
                        Undo
                      </Button>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          ) : null}
        </Stack>

        <Stack spacing={3}>
          <SectionCard title="What's supported">
            <Stack spacing={1.25}>
              {[
                'Amex CSV, XLS or XLSX exports',
                'CSV: YearEndSummary export with transaction and amount columns',
                'Excel: standard Amex export, preamble rows are fine',
                'Duplicates are skipped automatically on re-upload',
              ].map((line) => (
                <Stack key={line} direction="row" gap={1.25} alignItems="flex-start">
                  <CheckIcon sx={{ fontSize: 18, color: 'success.main', mt: '2px', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    {line}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Other banks import through Plaid. Open an account card in{' '}
              <Box component="span" onClick={() => router.push('/accounts')} sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}>
                Accounts
              </Box>{' '}
              and choose “Connect bank”.
            </Typography>
          </SectionCard>

          <SectionCard title="After importing">
            <Typography variant="body2" color="text.secondary">
              Every upload can be undone from Upload history. Generate category suggestions from Transactions once your data is in.
            </Typography>
          </SectionCard>
        </Stack>
      </Box>
    </Box>
  );
}
