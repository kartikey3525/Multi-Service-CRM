'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import messages from '../messages/en.json';
import { apiGet, apiPost, readCsrfCookie } from '../lib/api-client';

type CurrentUser = { email: string; name: string; roleNames: string[] };

export function CurrentUser({ kind }: { kind: 'admin' | 'partner' }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  useEffect(() => {
    apiGet<{ user: CurrentUser }>('/v1/auth/me')
      .then((response) => setUser(response.user))
      .catch(() => {
        router.replace(kind === 'admin' ? '/admin/login' : '/login');
      });
  }, [kind, router]);

  async function signOut() {
    await apiPost('/v1/auth/logout', {}, readCsrfCookie());
    router.replace(kind === 'admin' ? '/admin/login' : '/login');
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setSavingPassword(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiPost('/v1/auth/password/change', {
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      });
      router.replace(kind === 'admin' ? '/admin/login' : '/login');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : messages.auth.error);
      setSavingPassword(false);
    }
  }

  if (!user)
    return (
      <main className="portal">
        <p>{messages.auth.loading}</p>
      </main>
    );
  return (
    <main className="portal">
      <section className="card">
        <p className="eyebrow">
          {kind === 'admin' ? messages.admin.welcome : messages.partner.welcome}
        </p>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
        <p>{user.roleNames.join(', ')}</p>
        <button className="button secondary" onClick={signOut}>
          {messages.auth.signOut}
        </button>
      </section>
      <section className="card">
        <h2>{messages.auth.changePassword}</h2>
        <p className="muted">{messages.auth.passwordChangeNotice}</p>
        <form className="stack" onSubmit={changePassword}>
          <label>
            {messages.auth.currentPassword}
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            {messages.auth.newPassword}
            <input
              name="newPassword"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          {passwordError && (
            <p className="error" role="alert">
              {passwordError}
            </p>
          )}
          <button className="button" type="submit" disabled={savingPassword}>
            {savingPassword ? messages.auth.loading : messages.auth.changePassword}
          </button>
        </form>
      </section>
    </main>
  );
}
