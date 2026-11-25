'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api-client';
import messages from '../messages/en.json';

type ApplicationState = { applicationId: string; status: string; updatedAt: string };
type OrderState = {
  orderNumber: string;
  status: string;
  serviceName: string;
  updatedAt: string;
  events: Array<{ status: string; date: string; note: string }>;
};

export function PublicApplicationStatus() {
  const query = useSearchParams();
  const [token, setToken] = useState(query.get('token') ?? '');
  const [result, setResult] = useState<ApplicationState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function lookup(value = token) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await apiGet<ApplicationState>(
          `/v1/public/applications/status?token=${encodeURIComponent(value.trim())}`,
        ),
      );
    } catch {
      setError(messages.auth.invalidTrackingToken);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const value = query.get('token');
    if (value) void lookup(value);
  }, [query]);
  return (
    <main className="portal public-status-page">
      <section className="card">
        <p className="eyebrow">{messages.apply.eyebrow}</p>
        <h1>{messages.auth.applicationStatusTitle}</h1>
        <p className="muted">
          Use the private status link sent after you submitted your application.
        </p>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup();
          }}
        >
          <label className="field">
            <span>{messages.auth.trackingToken}</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <button className="button" disabled={busy}>
            {busy ? messages.auth.loading : messages.auth.lookupStatus}
          </button>
        </form>
        {result ? (
          <section className="status-result" aria-live="polite">
            <p>
              {messages.auth.applicationReference}:{' '}
              <strong>{result.applicationId.slice(-8).toUpperCase()}</strong>
            </p>
            <span className={`status-badge ${result.status}`}>
              {result.status.replaceAll('_', ' ')}
            </span>
            <p className="muted">
              {messages.auth.lastUpdated}: {new Date(result.updatedAt).toLocaleDateString('en-IN')}
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export function PublicOrderStatus() {
  const query = useSearchParams();
  const [token, setToken] = useState(query.get('token') ?? '');
  const [result, setResult] = useState<OrderState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function lookup(value = token) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await apiGet<OrderState>(
          `/v1/public/orders/status?token=${encodeURIComponent(value.trim())}`,
        ),
      );
    } catch {
      setError(messages.auth.invalidTrackingToken);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const value = query.get('token');
    if (value) void lookup(value);
  }, [query]);
  return (
    <main className="portal public-status-page">
      <section className="card">
        <p className="eyebrow">{messages.shell.partnerWorkspace}</p>
        <h1>{messages.auth.orderStatusTitle}</h1>
        <p className="muted">
          Open the secure tracking link from your service confirmation, or paste its token below.
        </p>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup();
          }}
        >
          <label className="field">
            <span>{messages.auth.trackingToken}</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <button className="button" disabled={busy}>
            {busy ? messages.auth.loading : messages.auth.lookupStatus}
          </button>
        </form>
        {result ? (
          <section className="status-result" aria-live="polite">
            <div className="status-result-heading">
              <div>
                <p className="eyebrow">{result.orderNumber}</p>
                <h2>{result.serviceName}</h2>
              </div>
              <span className={`status-badge ${result.status}`}>
                {result.status.replaceAll('_', ' ')}
              </span>
            </div>
            <ol className="timeline">
              {result.events.map((event, index) => (
                <li key={`${event.date}-${index}`}>
                  <strong>{event.status.replaceAll('_', ' ')}</strong>
                  <span>{event.note}</span>
                  <time>{new Date(event.date).toLocaleDateString('en-IN')}</time>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </section>
    </main>
  );
}
