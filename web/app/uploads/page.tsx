'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/UndoRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { formatDateTime, formatRelative, plural } from '../../lib/format';
import { PageHeader, SectionCard, EmptyState, BankLogo, StatusChip, PageSkeleton } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

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

export default function UploadsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<UploadWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
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

  const handleUndo = async (target: UploadWithAccount) => {
    const ok = await confirm({
      title: 'Undo this upload?',
      description: `Transactions created by "${target.original_filename}" will be deleted and the file removed from storage. This cannot be reversed.`,
      confirmLabel: 'Undo upload',
      destructive: true,
    });
    if (!ok) return;

    setUndoingId(target.id);
    setError('');
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session access token.');

      const resp = await fetch(`/api/uploads/${encodeURIComponent(target.id)}/undo`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const body = (await resp.json()) as { error?: string; rowsReversed?: number };
      if (!resp.ok) throw new Error(body.error ?? `HTTP ${resp.status}`);

      toast.success(`"${target.original_filename}" reversed. ${plural(body.rowsReversed ?? 0, 'transaction')} removed.`);
      await loadUploads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUndoingId(null);
    }
  };

  const header = (
    <PageHeader
      title="Upload history"
      description="Every statement you've imported, with the option to reverse it."
      actions={
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={() => void loadUploads()} disabled={loading} aria-label="Refresh uploads">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    />
  );

  if (loading && rows.length === 0) {
    return (
      <Box>
        {header}
        <PageSkeleton stats={0} rows={5} />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="No uploads yet"
          description="Imported statements will show up here so you can review or undo them."
          actions={
            <Button variant="contained" onClick={() => router.push('/upload')}>
              Upload a statement
            </Button>
          }
        />
      ) : (
        <SectionCard disablePadding>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Rows</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => {
                  const undoable = canUndoStatus.has(u.status);
                  const isUndoing = undoingId === u.id;
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 560 }}>
                          {u.original_filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {u.file_type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <BankLogo bank={u.bank} size={24} />
                          <Typography variant="body2" noWrap>
                            {u.accounts?.name ?? 'Unknown'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={u.status} />
                        {u.error ? (
                          <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5, maxWidth: 260 }}>
                            {u.error}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right" className="tabular-nums">
                        <Typography variant="body2">
                          {u.status === 'reversed' ? u.rows_reversed ?? 0 : u.rows_processed ?? 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.status === 'reversed' ? 'reversed' : 'processed'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {formatDateTime(u.created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelative(u.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<UndoIcon />}
                          disabled={!undoable || isUndoing || Boolean(undoingId)}
                          onClick={() => void handleUndo(u)}
                        >
                          {isUndoing ? 'Undoing…' : 'Undo'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}
    </Box>
  );
}
