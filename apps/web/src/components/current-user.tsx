'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import messages from '../messages/en.json';
import { apiGet, apiPost, readCsrfCookie } from '../lib/api-client';

type CurrentUser = { email: string; name: string; roleNames: string[]; totpEnabled: boolean };

export function CurrentUser({ kind }: { kind: 'admin' | 'partner' }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [factorSecret, setFactorSecret] = useState('');
  const [factorMessage, setFactorMessage] = useState('');
  const [factorCodes, setFactorCodes] = useState<string[]>([]);
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

  async function beginFactorSetup() {
    setFactorMessage('');
    try {
      const result = await apiPost<{ secret: string; otpauthUrl: string }>('/v1/auth/2fa/setup');
      setFactorSecret(result.secret);
      setFactorMessage(`${messages.auth.twoFactorSetup}: ${result.otpauthUrl}`);
    } catch (error) {
      setFactorMessage(error instanceof Error ? error.message : messages.auth.error);
    }
  }

  async function enableFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get('factorCode');
    try {
      const result = await apiPost<{ recoveryCodes: string[] }>('/v1/auth/2fa/verify', { code });
      setFactorCodes(result.recoveryCodes);
      setFactorSecret('');
      setFactorMessage(messages.auth.twoFactorEnabled);
      setUser((current) => (current ? { ...current, totpEnabled: true } : current));
    } catch (error) {
      setFactorMessage(error instanceof Error ? error.message : messages.auth.error);
    }
  }

  async function disableFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiPost('/v1/auth/2fa/disable', {
        currentPassword: form.get('factorPassword'),
        code: form.get('factorCode'),
      });
      router.replace('/login');
    } catch (error) {
      setFactorMessage(error instanceof Error ? error.message : messages.auth.error);
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
      {kind === 'partner' && (
        <section className="card">
          <h2>{messages.auth.twoFactor}</h2>
          <p className="muted">
            {user.totpEnabled ? messages.auth.twoFactorEnabled : messages.auth.twoFactorDisabled}
          </p>
          {factorMessage && <p role="status">{factorMessage}</p>}
          {factorCodes.length > 0 && (
            <div>
              <p>{messages.auth.recoveryInstructions}</p>
              <ul>
                {factorCodes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
              <button className="button secondary" onClick={() => setFactorCodes([])}>
                {messages.auth.continue}
              </button>
            </div>
          )}
          {!user.totpEnabled && !factorSecret && (
            <button className="button" onClick={beginFactorSetup}>
              {messages.auth.enableTwoFactor}
            </button>
          )}
          {factorSecret && (
            <form className="stack" onSubmit={enableFactor}>
              <p>{messages.auth.twoFactorSetup}</p>
              <code>{factorSecret}</code>
              <label>
                {messages.auth.authenticatorCode}
                <input name="factorCode" inputMode="numeric" required />
              </label>
              <button className="button">{messages.auth.verifyCode}</button>
            </form>
          )}
          {user.totpEnabled && (
            <form className="stack" onSubmit={disableFactor}>
              <label>
                {messages.auth.currentPassword}
                <input name="factorPassword" type="password" required />
              </label>
              <label>
                {messages.auth.authenticatorCode}
                <input name="factorCode" required />
              </label>
              <button className="button secondary">{messages.auth.disableTwoFactor}</button>
            </form>
          )}
        </section>
      )}
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
