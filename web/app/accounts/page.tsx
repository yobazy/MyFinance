'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import type { Account } from '../../lib/types';

export default function AccountsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bank, setBank] = useState('Amex');
  const [name, setName] = useState('Main');
  const [type, setType] = useState('credit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;

    const { data, error: e } = await supabase
      .from('accounts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (e) setError(e.message);
    setAccounts((data ?? []) as Account[]);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAccount() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase
      .from('accounts')
      .insert({ bank, name, type });
    setBusy(false);
    if (e) setError(e.message);
    else await refresh();
  }

  if (!userId) {
    return (
      <div className="card">
        <h2>Accounts</h2>
        <p>You must be signed in.</p>
        <Link href="/login">
          <button>Go to login</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Accounts</h2>
        <div className="row">
          <Link href="/">
            <button className="secondary">Home</button>
          </Link>
          <Link href="/upload">
            <button>Upload</button>
          </Link>
        </div>
      </div>

      <p>
        <small className="muted">
          Create at least one account before uploading statements.
        </small>
      </p>

      <div className="row">
        <input value={bank} onChange={(e) => setBank(e.target.value)} />
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="checking">checking</option>
          <option value="savings">savings</option>
          <option value="credit">credit</option>
        </select>
        <button onClick={createAccount} disabled={busy || !bank || !name}>
          Create
        </button>
      </div>

      {error ? <p style={{ color: '#ff9aa2' }}>{error}</p> : null}

      <div style={{ marginTop: 12 }}>
        {accounts.length === 0 ? (
          <p>No accounts yet.</p>
        ) : (
          <ul>
            {accounts.map((a) => (
              <li key={a.id}>
                <b>{a.bank}</b> — {a.name} ({a.type}){' '}
                <small className="muted">id={a.id}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

