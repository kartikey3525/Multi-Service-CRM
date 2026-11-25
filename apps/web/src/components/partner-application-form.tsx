'use client';

import { useState } from 'react';
import messages from '../messages/en.json';
import { apiGet, apiPost, requestCsrfToken } from '../lib/api-client';

type Tier = 'master_distributor' | 'distributor' | 'retailer';
type FormValues = {
  applicantName: string;
  email: string;
  mobile: string;
  businessName: string;
  legalType: string;
  city: string;
  state: string;
  pin: string;
  requestedTier: Tier;
};

const initialValues: FormValues = {
  applicantName: '',
  email: '',
  mobile: '',
  businessName: '',
  legalType: '',
  city: '',
  state: '',
  pin: '',
  requestedTier: 'retailer',
};

export function PartnerApplicationForm() {
  const [values, setValues] = useState(initialValues);
  const [availability, setAvailability] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kycFile, setKycFile] = useState<File>();
  const [docType, setDocType] = useState('identity_proof');

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === 'pin' || key === 'state') setAvailability('');
  }

  async function checkAvailability() {
    setError('');
    setAvailability('');
    try {
      const query = new URLSearchParams({ state: values.state, pin: values.pin });
      const response = await apiGet<{ available: boolean }>(
        `/v1/public/territories/availability?${query.toString()}`,
      );
      setAvailability(response.available ? messages.apply.available : messages.apply.unavailable);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.apply.error);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult('');
    try {
      const csrf = await requestCsrfToken();
      const submitted = await apiPost<{ applicationId: string; uploadToken: string }>(
        '/v1/public/applications',
        values,
        csrf,
      );
      let resultText = messages.apply.submitted;
      if (kycFile) {
        const uploadCsrf = await requestCsrfToken();
        const form = new FormData();
        form.set('uploadToken', submitted.uploadToken);
        form.set('docType', docType);
        form.set('file', kycFile);
        const response = await fetch(`/api/v1/files/kyc/applications/${submitted.applicationId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'x-csrf-token': uploadCsrf },
          body: form,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(
            `Application received, but KYC upload failed: ${body?.message ?? `HTTP ${response.status}`}`,
          );
        }
        resultText =
          'Application received. Your KYC file was uploaded privately. Check your email for verification.';
      }
      setResult(resultText);
      setValues(initialValues);
      setKycFile(undefined);
      setAvailability('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.apply.error);
    } finally {
      setBusy(false);
    }
  }

  if (result) return <p role="status">{result}</p>;

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>{messages.apply.applicantName}</span>
        <input
          value={values.applicantName}
          onChange={(event) => update('applicantName', event.target.value)}
          required
          maxLength={120}
        />
      </label>
      <label className="field">
        <span>KYC document type</span>
        <select value={docType} onChange={(event) => setDocType(event.target.value)}>
          <option value="identity_proof">Identity proof</option>
          <option value="pan_card">PAN card</option>
          <option value="gst_certificate">GST certificate</option>
          <option value="address_proof">Address proof</option>
          <option value="bank_proof">Bank proof</option>
        </select>
      </label>
      <label className="field">
        <span>Optional KYC file (PDF, JPEG, PNG; maximum 10 MiB)</span>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => setKycFile(event.target.files?.[0])}
        />
      </label>
      <label className="field">
        <span>{messages.apply.email}</span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        <span>{messages.apply.mobile}</span>
        <input
          type="tel"
          value={values.mobile}
          onChange={(event) => update('mobile', event.target.value)}
          required
          maxLength={16}
        />
      </label>
      <label className="field">
        <span>{messages.apply.businessName}</span>
        <input
          value={values.businessName}
          onChange={(event) => update('businessName', event.target.value)}
          required
          maxLength={160}
        />
      </label>
      <label className="field">
        <span>{messages.apply.legalType}</span>
        <input
          value={values.legalType}
          onChange={(event) => update('legalType', event.target.value)}
          required
          maxLength={80}
        />
      </label>
      <label className="field">
        <span>{messages.apply.city}</span>
        <input
          value={values.city}
          onChange={(event) => update('city', event.target.value)}
          required
          maxLength={100}
        />
      </label>
      <label className="field">
        <span>{messages.apply.state}</span>
        <input
          value={values.state}
          onChange={(event) => update('state', event.target.value)}
          required
          maxLength={100}
        />
      </label>
      <label className="field">
        <span>{messages.apply.pin}</span>
        <input
          inputMode="numeric"
          pattern="[1-9][0-9]{5}"
          value={values.pin}
          onChange={(event) => update('pin', event.target.value)}
          required
          maxLength={6}
        />
      </label>
      <label className="field">
        <span>{messages.apply.tier}</span>
        <select
          value={values.requestedTier}
          onChange={(event) => update('requestedTier', event.target.value as Tier)}
        >
          <option value="retailer">{messages.apply.retailer}</option>
          <option value="distributor">{messages.apply.distributor}</option>
          <option value="master_distributor">{messages.apply.masterDistributor}</option>
        </select>
      </label>
      <button className="button button-secondary" type="button" onClick={checkAvailability}>
        {messages.apply.checkAvailability}
      </button>
      {availability ? <p role="status">{availability}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button"
        type="submit"
        disabled={busy || availability === messages.apply.unavailable}
      >
        {busy ? messages.apply.submitting : messages.apply.submit}
      </button>
    </form>
  );
}
