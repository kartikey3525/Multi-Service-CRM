'use client';

import { useCallback, useEffect, useState } from 'react';
import messages from '../messages/en.json';
import { apiGet, apiPost } from '../lib/api-client';

type Status = 'pending_email_verification' | 'submitted' | 'needs_info' | 'approved' | 'rejected';
type Application = {
  _id: string;
  applicantName: string;
  email: string;
  mobile: string;
  businessName: string;
  legalType: string;
  city: string;
  state: string;
  pin: string;
  requestedTier: string;
  status: Status;
  createdAt: string;
  decisionReason?: string;
};
type Document = {
  _id: string;
  docType: string;
  contentType: string;
  sizeBytes: number;
  status: string;
};
type ApplicationPage = { items: Application[]; total: number };
type Detail = { application: Application; documents: Document[] };
type Access = { user: { permissions: string[] } };
type ParentOption = { id: string; code: string; businessName: string; city: string; state: string };

export function AdminApplications() {
  const [items, setItems] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [status, setStatus] = useState('submitted');
  const [reason, setReason] = useState('');
  const [parentId, setParentId] = useState('');
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const result = await apiGet<ApplicationPage>(`/v1/admin/applications${query}`);
      setItems(result.items);
      if (selected && !result.items.some((item) => item._id === selected.application._id))
        setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.applications.error);
    }
  }, [status, selected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    apiGet<Access>('/v1/auth/me')
      .then(({ user }) => setPermissions(user.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

  async function openApplication(application: Application) {
    setError('');
    setNotice('');
    try {
      setSelected(await apiGet<Detail>(`/v1/admin/applications/${application._id}`));
      setReason(application.decisionReason ?? '');
      setParentId('');
      const parentTier =
        application.requestedTier === 'retailer'
          ? 'distributor'
          : application.requestedTier === 'distributor'
            ? 'master_distributor'
            : '';
      setParents(
        parentTier
          ? await apiGet<ParentOption[]>(
              `/v1/admin/applications/eligible-parents?tier=${parentTier}`,
            )
          : [],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.applications.error);
    }
  }

  async function act(action: 'approve' | 'reject' | 'request-info') {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = action === 'approve' ? (parentId ? { parentId } : {}) : { reason };
      const result = await apiPost<{ status?: string }>(
        `/v1/admin/applications/${selected.application._id}/${action}`,
        body,
      );
      setNotice(
        action === 'approve'
          ? messages.applications.approvedResult
          : messages.applications.updatedResult,
      );
      if (action === 'approve' && result.status)
        setNotice(`${messages.applications.approvedResult} (${result.status})`);
      setSelected(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.applications.error);
    } finally {
      setBusy(false);
    }
  }

  const application = selected?.application;
  const canReview = permissions.includes('applications.review');
  const needsParent =
    application?.requestedTier === 'distributor' || application?.requestedTier === 'retailer';

  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>{messages.applications.title}</h1>
        <p>{messages.applications.description}</p>
        <label className="field search-field">
          <span>{messages.applications.status}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{messages.applications.allStatuses}</option>
            <option value="submitted">{messages.applications.submitted}</option>
            <option value="needs_info">{messages.applications.needsInfo}</option>
            <option value="approved">{messages.applications.approved}</option>
            <option value="rejected">{messages.applications.rejected}</option>
          </select>
        </label>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{messages.applications.applicant}</th>
                <th>{messages.applications.business}</th>
                <th>{messages.applications.email}</th>
                <th>{messages.applications.tier}</th>
                <th>{messages.applications.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.applicantName}</td>
                  <td>{item.businessName}</td>
                  <td>{item.email}</td>
                  <td>{item.requestedTier.replaceAll('_', ' ')}</td>
                  <td>{item.status.replaceAll('_', ' ')}</td>
                  <td>
                    <button className="text-button" onClick={() => void openApplication(item)}>
                      {messages.applications.open}
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6}>{messages.applications.none}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {selected ? (
        <section className="card" aria-labelledby="application-detail-heading">
          <h2 id="application-detail-heading">{application?.businessName}</h2>
          <dl className="detail-grid">
            <dt>{messages.applications.applicant}</dt>
            <dd>{application?.applicantName}</dd>
            <dt>{messages.applications.email}</dt>
            <dd>{application?.email}</dd>
            <dt>{messages.applications.phone}</dt>
            <dd>{application?.mobile}</dd>
            <dt>{messages.applications.legalType}</dt>
            <dd>{application?.legalType}</dd>
            <dt>{messages.applications.territory}</dt>
            <dd>
              {application?.city}, {application?.state} {application?.pin}
            </dd>
            <dt>{messages.applications.tier}</dt>
            <dd>{application?.requestedTier.replaceAll('_', ' ')}</dd>
          </dl>
          <h3>{messages.applications.documents}</h3>
          {selected.documents.length ? (
            <ul>
              {selected.documents.map((doc) => (
                <li key={doc._id}>
                  {doc.docType} · {doc.contentType} · {Math.ceil(doc.sizeBytes / 1024)} KB ·{' '}
                  {doc.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>{messages.applications.noDocuments}</p>
          )}
          {canReview &&
          (application?.status === 'submitted' || application?.status === 'needs_info') ? (
            <>
              <label className="field">
                <span>{messages.applications.reviewReason}</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={1000}
                />
              </label>
              {needsParent ? (
                <label className="field">
                  <span>{messages.applications.parentPartnerId}</span>
                  <select
                    value={parentId}
                    onChange={(event) => setParentId(event.target.value)}
                    required
                  >
                    <option value="">{messages.applications.selectParent}</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.code} · {parent.businessName} · {parent.city}, {parent.state}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="actions">
                <button
                  className="button"
                  disabled={busy || (needsParent && !parentId)}
                  onClick={() => void act('approve')}
                >
                  {messages.applications.approve}
                </button>
                <button
                  className="button secondary"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => void act('request-info')}
                >
                  {messages.applications.requestInfo}
                </button>
                <button
                  className="button secondary"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => void act('reject')}
                >
                  {messages.applications.reject}
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
