'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiUpload } from '../lib/api-client';

type Profile = {
  user: {
    partner?: { id: string; code: string; tier: string; status: string; businessName: string };
  };
};
type KycDocument = {
  id: string;
  docType: string;
  contentType: string;
  sizeBytes: number;
  status: string;
};

export function PartnerProfile() {
  const [profile, setProfile] = useState<Profile['user']['partner']>();
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [docType, setDocType] = useState('pan_card');
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [identity, docs] = await Promise.all([
        apiGet<Profile>('/v1/auth/me'),
        apiGet<KycDocument[]>('/v1/files/kyc/mine'),
      ]);
      setProfile(identity.user.partner);
      setDocuments(docs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the partner profile.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !file) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.set('ownerType', 'partner');
      form.set('ownerId', profile.id);
      form.set('docType', docType);
      form.set('file', file);
      await apiUpload('/v1/files/kyc', form);
      setFile(undefined);
      setNotice('KYC document uploaded securely for review.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'KYC upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="portal admin-page">
      <section className="card">
        <h1>Partner profile and KYC</h1>
        {profile ? (
          <dl className="detail-grid">
            <dt>Business</dt>
            <dd>{profile.businessName}</dd>
            <dt>Partner code</dt>
            <dd>{profile.code}</dd>
            <dt>Tier</dt>
            <dd>{profile.tier.replaceAll('_', ' ')}</dd>
            <dt>Status</dt>
            <dd>{profile.status.replaceAll('_', ' ')}</dd>
          </dl>
        ) : (
          <p>Partner membership is not available for this account.</p>
        )}
      </section>
      <section className="card">
        <h2>Upload a KYC document</h2>
        <p>
          PDF, JPEG, or PNG only. Maximum size 10 MiB. Files are stored privately and viewed through
          the authenticated CRM.
        </p>
        <form className="form" onSubmit={upload}>
          <label className="field">
            <span>Document type</span>
            <select value={docType} onChange={(event) => setDocType(event.target.value)}>
              <option value="pan_card">PAN card</option>
              <option value="gst_certificate">GST certificate</option>
              <option value="identity_proof">Identity proof</option>
              <option value="address_proof">Address proof</option>
              <option value="bank_proof">Bank proof</option>
            </select>
          </label>
          <label className="field">
            <span>File</span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0])}
              required
            />
          </label>
          <button
            className="button"
            disabled={
              !profile || !file || busy || !['active', 'pending_payment'].includes(profile.status)
            }
          >
            {busy ? 'Uploading…' : 'Upload privately'}
          </button>
        </form>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section className="card">
        <h2>Submitted documents</h2>
        {documents.length ? (
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>
                {doc.docType.replaceAll('_', ' ')} · {doc.contentType} ·{' '}
                {Math.ceil(doc.sizeBytes / 1024)} KB · {doc.status} ·{' '}
                <a href={`/api/v1/files/kyc/${doc.id}`} target="_blank" rel="noreferrer">
                  View (audited)
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No documents uploaded yet.</p>
        )}
      </section>
    </main>
  );
}
