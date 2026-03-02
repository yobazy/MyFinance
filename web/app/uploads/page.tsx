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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RefreshIcon from '@mui/icons-material/Refresh';
import { createBrowserSupabaseClient } from '../../lib/supabase';

type UploadWithAccount = {
  id: string;
  account_id: string;
  bank: string;
  file_type: string;
  original_filename: string;
  status: string;
  error: string | null;
  rows_processed: number;
  rows_reversed: number;
  reversed_at: string | null;
  created_at: string;
  accounts: { name: string } | null;
};

const canUndoStatus = new Set(['succeeded', 'reverse_failed']);

function statusChipColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'succeeded') return 'success';
  if (status === 'reversing') return 'warning';
  if (status === 'reversed') return 'default';
  if (status === 'reverse_failed' || status === 'failed') return 'error';
  if (status === 'processing' || status === 'uploaded') return 'info';
  return 'default';
}

export default function UploadsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [rows, setRows] = useState<UploadWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [undoTarget, setUndoTarget] = useState<UploadWithAccount | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('uploads')
        .select(
          'id,account_id,bank,file_type,original_filename,status,error,rows_processed,rows_reversed,reversed_at,created_at,accounts(name)'
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchErr) throw fetchErr;
      setRows((data ?? []) as unknown as UploadWithAccount[]);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  const handleUndo = async () => {
    if (!undoTarget) return;

    setUndoingId(undoTarget.id);
    setMessage('');
    setError('');

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session access token.');

      const resp = await fetch(`/api/uploads/${encodeURIComponent(undoTarget.id)}/undo`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const body = (await resp.json()) as { error?: string; rowsReversed?: number };
      if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);

      setMessage(
        `Upload "${undoTarget.original_filename}" reversed. ${body.rowsReversed ?? 0} transaction(s) removed.`
      );
      setUndoTarget(null);
      await loadUploads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={1}>
        <Typography variant="h4">Upload history</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void loadUploads()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {message ? <Alert sx={{ mb: 2 }}>{message}</Alert> : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          {loading ? (
            <Typography color="text.secondary">Loading uploads...</Typography>
          ) : rows.length === 0 ? (
            <Typography color="text.secondary">No uploads yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>File</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Bank</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Rows</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((u) => {
                    const undoable = canUndoStatus.has(u.status);
                    const isUndoing = undoingId === u.id;
                    return (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">{u.original_filename}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Type: {u.file_type}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{u.accounts?.name ?? 'Unknown'}</TableCell>
                        <TableCell>{u.bank}</TableCell>
                        <TableCell>
                          <Chip size="small" label={u.status} color={statusChipColor(u.status)} />
                          {u.error ? (
                            <Typography variant="caption" color="error.main" display="block">
                              {u.error}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {u.status === 'reversed'
                            ? `${u.rows_reversed ?? 0} reversed`
                            : `${u.rows_processed ?? 0} processed`}
                        </TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UndoIcon />}
                            disabled={!undoable || isUndoing}
                            onClick={() => setUndoTarget(u)}
                          >
                            Undo
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(undoTarget)} onClose={() => setUndoTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Undo upload?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will delete transactions created by this upload and remove the uploaded file from
            storage. This action cannot be undone.
          </Typography>
          {undoTarget ? (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {undoTarget.original_filename}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoTarget(null)} disabled={Boolean(undoingId)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleUndo()}
            disabled={!undoTarget || Boolean(undoingId)}
          >
            Undo upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
