'use client';

import { useEffect, useState } from 'react';
import messages from '../messages/en.json';
import { apiGet } from '../lib/api-client';

type AuditEntry = {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  actorUserId?: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
};
type AuditResponse = { items: AuditEntry[]; total: number };

export function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiGet<AuditResponse>('/v1/admin/audit?page=1&pageSize=100')
      .then((result) => setEntries(result.items))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : messages.auth.error);
      });
  }, []);
  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>{messages.admin.audit}</h1>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{messages.admin.date}</th>
                <th>{messages.admin.action}</th>
                <th>{messages.admin.entity}</th>
                <th>{messages.admin.id}</th>
                <th>{messages.admin.actor}</th>
                <th>{messages.admin.change}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.action}</td>
                  <td>{entry.entity}</td>
                  <td>{entry.entityId ?? '—'}</td>
                  <td>{entry.actorUserId ?? messages.admin.system}</td>
                  <td>
                    <details>
                      <summary>{messages.admin.view}</summary>
                      <pre>
                        {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
              {!entries.length && !error ? (
                <tr>
                  <td colSpan={6}>{messages.admin.noAudit}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
