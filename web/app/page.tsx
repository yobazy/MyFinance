'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase';

export default function HomePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, [supabase]);

  return (
    <div className="card">
      <h2>MyFinance (Supabase + Next.js)</h2>
      {loading ? (
        <p>Loading…</p>
      ) : email ? (
        <>
          <p>
            Signed in as <b>{email}</b>
          </p>
          <div className="row">
            <Link href="/accounts">
              <button className="secondary">Accounts</button>
            </Link>
            <Link href="/upload">
              <button>Upload statement</button>
            </Link>
            <button
              className="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = '/';
              }}
            >
              Sign out
            </button>
          </div>
          <p style={{ marginTop: 12 }}>
            <small className="muted">
              Upload creates an <code>uploads</code> row + enqueues a{' '}
              <code>processing_jobs</code> row. The TS worker picks it up.
            </small>
          </p>
        </>
      ) : (
        <>
          <p>You’re not signed in.</p>
          <Link href="/login">
            <button>Go to login</button>
          </Link>
        </>
      )}
    </div>
  );
}

