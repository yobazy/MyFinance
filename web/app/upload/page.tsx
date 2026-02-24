'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';

export default function UploadPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [fileType, setFileType] = useState<string>('Amex');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rowsProcessed: number } | null>(null);

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
    setResult(null);

    try {
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session access token');

      if (fileType !== 'Amex') throw new Error('Only Amex is supported right now');

      const fd = new FormData();
      fd.set('file', file);
      fd.set('account_id', accountId);

      const resp = await fetch('/api/ingest/amex', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: fd,
      });

      const body = (await resp.json()) as
        | { ok: true; rowsProcessed: number }
        | { error: string };

      if (!resp.ok) {
        throw new Error('error' in body ? body.error : `HTTP ${resp.status}`);
      }

      if (!('rowsProcessed' in body)) throw new Error('Invalid response');
      setResult({ rowsProcessed: body.rowsProcessed });
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
          This posts the file to a Next.js API route, parses immediately, writes
          transactions to Postgres, then discards the file.
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

      {result ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 0 }}>
            Imported <b>{result.rowsProcessed}</b> rows.
          </p>
        </div>
      ) : null}
    </div>
  );
}

