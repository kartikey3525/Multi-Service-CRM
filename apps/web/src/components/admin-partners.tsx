'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPut } from '../lib/api-client';

type Partner = {
  _id: string;
  code: string;
  path: string[];
  tier: string;
  status: string;
  businessName: string;
  email: string;
  city: string;
  state: string;
  parentId?: string;
};
type KycDocument = {
  _id: string;
  docType: string;
  contentType: string;
  sizeBytes: number;
  status: string;
};
type Detail = { partner: Partner; documents: KycDocument[]; downlineCount: number };

export function AdminPartners() {
  const [items, setItems] = useState<Partner[]>([]);
  const [detail, setDetail] = useState<Detail>();
  const [fields, setFields] = useState({
    pan: '',
    gstin: '',
    address: '',
    bankAccount: '',
    bankIfsc: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await apiGet<Partner[]>('/v1/admin/partners'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load partners.');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function open(partner: Partner) {
    try {
      setDetail(await apiGet<Detail>(`/v1/admin/partners/${partner._id}`));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load partner.');
    }
  }
  async function changeStatus() {
    if (!detail) return;
    try {
      const status = detail.partner.status === 'active' ? 'suspended' : 'active';
      await apiPut(`/v1/admin/partners/${detail.partner._id}/status`, { status });
      setNotice(`Partner ${status === 'active' ? 'reactivated' : 'suspended'}.`);
      await refresh();
      await open({ ...detail.partner, status });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update partner status.');
    }
  }
  async function saveKyc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const data = Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()));
    try {
      const result = await apiPatch<{ masked: Record<string, string> }>(
        `/v1/admin/partners/${detail.partner._id}/kyc-fields`,
        data,
      );
      setFields({ pan: '', gstin: '', address: '', bankAccount: '', bankIfsc: '' });
      setNotice(
        `Encrypted KYC fields saved. Masked values: ${Object.entries(result.masked)
          .map(([key, value]) => `${key} ${value}`)
          .join(' · ')}`,
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save encrypted fields.');
    }
  }

  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>Partners</h1>
        <p>Review partner status, network position, and KYC documents.</p>
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
                <th>Code</th>
                <th>Business</th>
                <th>Tier</th>
                <th>Location</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((partner) => (
                <tr key={partner._id}>
                  <td>{partner.code}</td>
                  <td
                    style={{ paddingLeft: `${Math.max(0, partner.path.length - 1) * 20 + 12}px` }}
                  >
                    {partner.businessName}
                  </td>
                  <td>{partner.tier.replaceAll('_', ' ')}</td>
                  <td>
                    {partner.city}, {partner.state}
                  </td>
                  <td>{partner.status.replaceAll('_', ' ')}</td>
                  <td>
                    <button className="text-button" onClick={() => void open(partner)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6}>No partners yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {detail ? (
        <section className="card">
          <h2>
            {detail.partner.businessName} · {detail.partner.code}
          </h2>
          <p>
            {detail.partner.tier.replaceAll('_', ' ')} ·{' '}
            {detail.partner.status.replaceAll('_', ' ')} · {detail.downlineCount} direct downline
            partners
          </p>
          <button
            className="button secondary"
            disabled={!['active', 'suspended'].includes(detail.partner.status)}
            onClick={() => void changeStatus()}
          >
            {detail.partner.status === 'active'
              ? 'Suspend partner and revoke sessions'
              : 'Reactivate partner'}
          </button>
          <h3>KYC documents</h3>
          {detail.documents.length ? (
            <ul>
              {detail.documents.map((doc) => (
                <li key={doc._id}>
                  {doc.docType} · {doc.contentType} · {Math.ceil(doc.sizeBytes / 1024)} KB ·{' '}
                  {doc.status} ·{' '}
                  <a href={`/api/v1/files/kyc/${doc._id}`} target="_blank" rel="noreferrer">
                    View (audited)
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No KYC files.</p>
          )}
          <form className="form" onSubmit={saveKyc}>
            <h3>Encrypted KYC fields</h3>
            <p>
              Values are encrypted before storage; this form never reads or displays raw values
              after saving.
            </p>
            <label className="field">
              <span>PAN</span>
              <input
                value={fields.pan}
                onChange={(e) => setFields({ ...fields, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
              />
            </label>
            <label className="field">
              <span>GSTIN</span>
              <input
                value={fields.gstin}
                onChange={(e) => setFields({ ...fields, gstin: e.target.value.toUpperCase() })}
                placeholder="15 characters"
              />
            </label>
            <label className="field">
              <span>Address</span>
              <textarea
                value={fields.address}
                onChange={(e) => setFields({ ...fields, address: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Bank account</span>
              <input
                value={fields.bankAccount}
                onChange={(e) => setFields({ ...fields, bankAccount: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Bank IFSC</span>
              <input
                value={fields.bankIfsc}
                onChange={(e) => setFields({ ...fields, bankIfsc: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
              />
            </label>
            <button
              className="button"
              disabled={!Object.values(fields).some((value) => value.trim())}
            >
              Encrypt and save
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
