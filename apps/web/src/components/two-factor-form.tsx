'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import messages from '../messages/en.json';
import { apiPost, readCsrfCookie } from '../lib/api-client';

type TotpSetup = { secret: string; otpauthUrl: string };
type VerifyResult = { status: string; recoveryCodes?: string[] };

export function TwoFactorForm({ kind, setup }: { kind: 'admin' | 'partner'; setup?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!setup) return;
    apiPost<TotpSetup>('/v1/auth/2fa/setup')
      .then(setData)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : messages.auth.error);
      });
  }, [setup]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await apiPost<VerifyResult>('/v1/auth/2fa/verify', { code }, readCsrfCookie());
      if (result.recoveryCodes) setRecoveryCodes(result.recoveryCodes);
      else router.replace(kind === 'admin' ? '/admin' : '/partner');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.auth.error);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) {
    return (
      <section className="card">
        <h1>{messages.auth.recoveryCodes}</h1>
        <p>{messages.auth.recoveryInstructions}</p>
        <ul className="recovery-codes">
          {recoveryCodes.map((value) => (
            <li key={value}>
              <code>{value}</code>
            </li>
          ))}
        </ul>
        <button className="button" onClick={() => router.replace('/admin')}>
          {messages.auth.continue}
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>{setup ? messages.auth.enrollHeading : messages.auth.verifyCode}</h1>
      {setup ? <p>{messages.auth.enrollInstructions}</p> : null}
      {data ? (
        <>
          <p className="muted">{data.secret}</p>
          <p className="muted">{data.otpauthUrl}</p>
        </>
      ) : null}
      {setup && !data && !error ? <p>{messages.auth.loading}</p> : null}
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>{messages.auth.authenticatorCode}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            maxLength={32}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={busy || (setup && !data)}>
          {busy ? messages.auth.loading : messages.auth.verifyCode}
        </button>
      </form>
    </section>
  );
}
