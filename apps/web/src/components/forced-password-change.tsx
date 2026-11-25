'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiPost, requestCsrfToken } from '../lib/api-client';
import messages from '../messages/en.json';

export function ForcedPasswordChange() {
  const router = useRouter();
  const query = useSearchParams();
  const forced = query.get('forced') === '1';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError(messages.auth.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const csrf = await requestCsrfToken();
      await apiPost('/v1/auth/password/change', { currentPassword, newPassword }, csrf);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="portal">
      <section className="card">
        <p className="eyebrow">{messages.shell.partnerWorkspace}</p>
        <h1>{messages.auth.changePasswordTitle}</h1>
        <p className="muted">
          {forced ? messages.auth.changePasswordIntro : messages.auth.resetSubtitle}
        </p>
        {done ? (
          <div role="status">
            <p>{messages.auth.passwordChanged}</p>
            <button className="button" onClick={() => router.push('/partner')}>
              {messages.shell.partnerWorkspace}
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <label className="field">
              <span>{messages.auth.forcedCurrentPassword}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{messages.auth.newPassword}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{messages.auth.forcedConfirmPassword}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </label>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button" disabled={busy}>
              {busy ? messages.auth.loading : messages.auth.forcedChangePassword}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
