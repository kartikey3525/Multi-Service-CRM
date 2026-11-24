'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import messages from '../messages/en.json';
import { apiPost, requestCsrfToken } from '../lib/api-client';

export function ForgotPasswordForm({ kind }: { kind: 'admin' | 'partner' }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const csrf = await requestCsrfToken();
      await apiPost('/v1/auth/password/forgot', { email }, csrf);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="portal">
      <section className="card">
        <h1>{messages.auth.forgotPassword}</h1>
        {sent ? (
          <p role="status">{messages.auth.resetSent}</p>
        ) : (
          <form className="form" onSubmit={submit}>
            <label className="field">
              <span>{messages.auth.email}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
            </label>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button" disabled={busy}>
              {busy ? messages.auth.loading : messages.auth.requestReset}
            </button>
          </form>
        )}
        <a className="text-button" href={kind === 'admin' ? '/admin/login' : '/login'}>
          {messages.auth.signIn}
        </a>
      </section>
    </main>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const csrf = await requestCsrfToken();
      await apiPost('/v1/auth/password/reset', { token, password }, csrf);
      setUpdated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="portal">
      <section className="card">
        <h1>{messages.auth.resetPassword}</h1>
        {updated ? (
          <>
            <p role="status">{messages.auth.passwordUpdated}</p>
            <button className="button" onClick={() => router.replace('/login')}>
              {messages.auth.signIn}
            </button>
          </>
        ) : (
          <form className="form" onSubmit={submit}>
            <label className="field">
              <span>{messages.auth.newPassword}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button" disabled={busy || !token}>
              {busy ? messages.auth.loading : messages.auth.resetPassword}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
