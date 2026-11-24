'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import messages from '../messages/en.json';
import { apiPost, requestCsrfToken } from '../lib/api-client';

type LoginFormProps = { kind: 'admin' | 'partner' };
type LoginResponse = { status: string; requiresTotp?: boolean; requiresTotpSetup?: boolean };

export function LoginForm({ kind }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const csrf = await requestCsrfToken();
      const path = kind === 'admin' ? '/v1/auth/admin/login' : '/v1/auth/login';
      const result = await apiPost<LoginResponse>(path, { email, password }, csrf);
      if (result.requiresTotpSetup) router.push('/admin/2fa/setup');
      else if (result.requiresTotp)
        router.push(kind === 'admin' ? '/admin/2fa/verify' : '/2fa/verify');
      else router.push(kind === 'admin' ? '/admin' : '/partner');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>{messages.auth.email}</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        <span>{messages.auth.password}</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          maxLength={128}
        />
      </label>
      <a
        className="text-button"
        href={kind === 'admin' ? '/admin/forgot-password' : '/forgot-password'}
      >
        {messages.auth.forgotPassword}
      </a>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={busy}>
        {busy ? messages.auth.loading : messages.auth.signIn}
      </button>
    </form>
  );
}
