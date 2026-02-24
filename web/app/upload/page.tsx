'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account, Upload } from '../../lib/types';

export default function UploadPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [fileType, setFileType] = useState<string>('Amex');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<Upload | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data, error: e } = await supabase.from('accounts').select('*');
      if (e) {
        setError(e.message);
        return;
      }
      const list = (data ?? []) as Account[];
      setAccounts(list);
      setAccountId(list[0]?.id ?? '');
    })();
  }, [supabase]);

  async function doUpload() {
    if (!userId) throw new Error('Not signed in');
    if (!accountId) throw new Error('Missing account');
    if (!file) throw new Error('Pick a file');

    setBusy(true);
    setError(null);
    setLastUpload(null);

    try {
      // Fetch account to fill bank
      const acct = accounts.find((a) => a.id === accountId);
      if (!acct) throw new Error('Account not found in list');

      // Create an uploads row first (so we have upload_id for storage path)
      const uploadId = crypto.randomUUID();
      const storagePath = `${userId}/${uploadId}/${file.name}`;

      const { data: uploadInsert, error: uploadErr } = await supabase
        .from('uploads')
        .insert({
          id: uploadId,
          account_id: accountId,
          bank: acct.bank,
          file_type: fileType,
          storage_path: storagePath,
          original_filename: file.name,
          status: 'uploaded',
        })
        .select('*')
        .single();

      if (uploadErr) throw uploadErr;

      // Upload file bytes to Storage (private bucket, user-owned prefix)
      const { error: storageErr } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (storageErr) throw storageErr;

      // Enqueue processing job
      const { error: jobErr } = await supabase.from('processing_jobs').insert({
        type: 'ingest_upload',
        payload: { upload_id: uploadId },
      });
      if (jobErr) throw jobErr;

      setLastUpload(uploadInsert as Upload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <div className="card">
        <h2>Upload statement</h2>
        <p>You must be signed in.</p>
        <Link href="/login">
          <button>Go to login</button>
        </Link>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="card">
        <h2>Upload statement</h2>
        <p>You need an account first.</p>
        <Link href="/accounts">
          <button>Create an account</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Upload statement</h2>
        <div className="row">
          <Link href="/">
            <button className="secondary">Home</button>
          </Link>
          <Link href="/accounts">
            <button className="secondary">Accounts</button>
          </Link>
        </div>
      </div>

      <p>
        <small className="muted">
          This uploads to Supabase Storage, writes an <code>uploads</code> row, and
          enqueues <code>processing_jobs</code> type <code>ingest_upload</code>.
        </small>
      </p>

      <div className="row">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.bank} — {a.name}
            </option>
          ))}
        </select>

        <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
          <option value="Amex">Amex</option>
          <option value="TD" disabled>
            TD (coming next)
          </option>
          <option value="Scotiabank" disabled>
            Scotiabank (coming next)
          </option>
        </select>

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button onClick={doUpload} disabled={busy || !file || !accountId}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {error ? <p style={{ color: '#ff9aa2' }}>{error}</p> : null}

      {lastUpload ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 6 }}>
            Uploaded: <b>{lastUpload.original_filename}</b>
          </p>
          <p style={{ marginTop: 0 }}>
            <small className="muted">
              upload_id={lastUpload.id} (watch worker logs for processing)
            </small>
          </p>
        </div>
      ) : null}
    </div>
  );
}

