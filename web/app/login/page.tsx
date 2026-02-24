'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';

export default function LoginPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: e } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (e) setError(e.message);
    else {
      setMessage('Signed in.');
      location.href = '/';
    }
  }

  async function signUp() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: e } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (e) setError(e.message);
    else setMessage('Signed up. If email confirmations are enabled, check email.');
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <p>
        <small className="muted">
          Dev-friendly email/password. You can switch to OAuth in Supabase later.
        </small>
      </p>

      <div className="row">
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button onClick={signIn} disabled={busy || !email || !password}>
          Sign in
        </button>
        <button
          className="secondary"
          onClick={signUp}
          disabled={busy || !email || !password}
        >
          Sign up
        </button>
        <Link href="/">
          <button className="secondary">Home</button>
        </Link>
      </div>

      {error ? <p style={{ color: '#ff9aa2' }}>{error}</p> : null}
      {message ? <p style={{ color: '#b6ffd3' }}>{message}</p> : null}
    </div>
  );
}

