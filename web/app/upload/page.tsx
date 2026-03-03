'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import UndoIcon from '@mui/icons-material/Undo';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';

type UploadResult = {
  filename: string;
  success: boolean;
  rowsProcessed?: number;
  error?: string;
  uploadId?: string;
  undone?: boolean;
};

export default function UploadPage() {
  const theme = useTheme();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [fileType, setFileType] = useState<string>('Amex');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('updated_at', { ascending: false });
      if (error) {
        setAccounts([]);
        setMessage(`Failed to fetch accounts: ${error.message}`);
        return;
      }
      const list = (data ?? []) as Account[];
      setAccounts(list);
      const first = list[0] ?? null;
      setAccountId(first?.id ?? '');
      setSelectedAccount(first);
      if (first?.bank) {
        const b = first.bank.toUpperCase();
        if (b.includes('AMEX')) setFileType('Amex');
        else if (b.includes('TD')) setFileType('TD');
        else if (b.includes('SCOT')) setFileType('Scotiabank');
      }
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
    if (acc?.bank) {
      const b = acc.bank.toUpperCase();
      if (b.includes('AMEX')) setFileType('Amex');
      else if (b.includes('TD')) setFileType('TD');
      else if (b.includes('SCOT')) setFileType('Scotiabank');
    }
  };

  const accept =
    selectedAccount?.bank?.toUpperCase().includes('AMEX') ? '.csv,.xls,.xlsx' : '.csv,.xlsx';

  const handleFileChange = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(picked)]);
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAllFiles = () => {
    setFiles([]);
  };

  const handleDragOver = (event: React.DragEvent) => event.preventDefault();
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length === 0) return;
    setFiles((prev) => [...prev, ...dropped]);
  };

  const uploadOne = async (f: File): Promise<UploadResult> => {
    try {
      if (!accountId) throw new Error('Please select an account.');
      if (fileType !== 'Amex') {
        throw new Error('Only Amex ingest is wired up right now (API route: /api/ingest/amex).');
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

      // Check if response is HTML (error page) instead of JSON
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await resp.text();
        throw new Error(`Server returned non-JSON response (${resp.status}). This may indicate a timeout or server error.`);
      }

      let body: {
        ok?: true;
        rowsProcessed?: number;
        uploadId?: string;
        error?: string;
      };
      try {
        body = (await resp.json()) as typeof body;
      } catch (jsonErr) {
        throw new Error(`Failed to parse server response: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
      }
      
      if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);
      return {
        filename: f.name,
        success: true,
        rowsProcessed: body.rowsProcessed ?? 0,
        uploadId: body.uploadId,
      };
    } catch (e) {
      return { filename: f.name, success: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const handleUndoResult = async (resultIndex: number) => {
    const current = uploadResults[resultIndex];
    if (!current?.success || !current.uploadId || current.undone) return;
    if (!window.confirm(`Undo upload "${current.filename}"? This cannot be undone.`)) return;

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

      setUploadResults((prev) =>
        prev.map((r, i) => (i === resultIndex ? { ...r, undone: true } : r))
      );
      setMessage(
        `Upload "${current.filename}" undone. ${body.rowsReversed ?? 0} transaction(s) removed.`
      );
    } catch (e) {
      setMessage(`Undo failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    setMessage('');

    if (!selectedAccount || !accountId || files.length === 0) {
      setMessage('Please select an account and file(s).');
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
    setMessage(okCount === results.length ? 'Upload complete.' : 'Upload finished with errors.');
    setUploading(false);
  };

  if (accounts.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Upload statements
        </Typography>
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              You need an account first.
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/accounts?create=true')}>
              Create an account
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Upload statements
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Account</InputLabel>
              <Select value={accountId} label="Account" onChange={(e) => handleAccountChange(e.target.value)}>
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.bank})
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem value="add_account" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <AddIcon sx={{ mr: 1 }} />
                  Add New Account
                </MenuItem>
              </Select>
            </FormControl>

            {selectedAccount ? (
              <Box
                sx={{
                  p: 2,
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? theme.palette.grey[800]
                      : theme.palette.grey[100],
                  borderRadius: 1,
                  border: `1px solid ${
                    theme.palette.mode === 'dark'
                      ? theme.palette.grey[700]
                      : theme.palette.grey[300]
                  }`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Selected Bank:</strong> {selectedAccount.bank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Account Type:</strong>{' '}
                  {String(selectedAccount.type ?? '').charAt(0).toUpperCase() +
                    String(selectedAccount.type ?? '').slice(1)}
                </Typography>
                <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                  <Chip size="small" label={`Allowed file types: ${accept}`} />
                  {fileType !== 'Amex' ? (
                    <Chip size="small" color="warning" label="Ingest not wired yet" />
                  ) : (
                    <Chip size="small" color="success" label="Supported" />
                  )}
                </Box>
              </Box>
            ) : null}

            <Box sx={{ mb: 1 }}>
              <Typography variant="body1" gutterBottom>
                File Requirements:
              </Typography>
              <ul
                style={{
                  marginTop: 0,
                  paddingLeft: '1.5rem',
                  color: theme.palette.text.secondary as any,
                }}
              >
                <li>Amex: CSV, XLS, or XLSX files</li>
                <li>CSV format: YearEndSummary format with Category, Date, Transaction, Charges $, Credits $ columns</li>
                <li>Excel format: Standard Amex export with optional 11-row preamble</li>
                <li>Must contain transaction date, description, and amount</li>
              </ul>
            </Box>

            <Box
              sx={{
                border: `2px dashed ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.55 : 0.45)}`,
                borderRadius: 3,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.55),
                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.10 : 0.07) },
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept={accept}
                onChange={(e) => handleFileChange(e.target.files)}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  {files.length > 0
                    ? `${files.length} file(s) selected`
                    : 'Drag and drop or click to select files'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: {accept}
                </Typography>
              </label>
            </Box>

            {files.length > 0 ? (
              <Paper sx={{ p: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Selected Files ({files.length})</Typography>
                  <Button size="small" onClick={handleClearAllFiles} startIcon={<DeleteIcon />}>
                    Clear All
                  </Button>
                </Box>
                <List dense>
                  {files.map((f, idx) => (
                    <ListItem key={`${f.name}-${idx}`} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <UploadFileIcon />
                      </ListItemIcon>
                      <ListItemText primary={f.name} secondary={`${(f.size / 1024).toFixed(1)} KB`} />
                      <Button size="small" onClick={() => handleRemoveFile(idx)} startIcon={<DeleteIcon />}>
                        Remove
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : null}

            {uploading ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Uploading...
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            ) : null}

            {uploadResults.length > 0 ? (
              <Paper sx={{ p: 2, mt: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Typography variant="h6">Upload Results</Typography>
                  <Button size="small" variant="outlined" onClick={() => router.push('/uploads')}>
                    Manage uploads
                  </Button>
                </Box>
                <List dense>
                  {uploadResults.map((r, idx) => (
                    <ListItem key={`${r.filename}-${idx}`} sx={{ px: 0 }}>
                      <ListItemIcon>
                        {r.success ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={r.filename}
                        secondary={
                          r.success
                            ? r.undone
                              ? 'Upload undone'
                              : `${r.rowsProcessed ?? 0} rows processed`
                            : r.error ?? 'Unknown error'
                        }
                      />
                      {r.success ? (
                        <Chip label="Success" color="success" size="small" />
                      ) : (
                        <Chip label="Failed" color="error" size="small" />
                      )}
                      {r.success && r.uploadId && !r.undone ? (
                        <Button
                          size="small"
                          sx={{ ml: 1 }}
                          variant="outlined"
                          color="warning"
                          startIcon={<UndoIcon />}
                          onClick={() => void handleUndoResult(idx)}
                        >
                          Undo
                        </Button>
                      ) : null}
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : null}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={
                uploading ||
                !selectedAccount ||
                files.length === 0 ||
                !accountId
              }
              fullWidth
              sx={{ mt: 1 }}
            >
              {`Upload ${files.length} Statement${files.length !== 1 ? 's' : ''}`}
            </Button>

            {message ? (
              <Alert severity={message.toLowerCase().includes('error') ? 'error' : 'info'} sx={{ mt: 1 }}>
                {message}
              </Alert>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

