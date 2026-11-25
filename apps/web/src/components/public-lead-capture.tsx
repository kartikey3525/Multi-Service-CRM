'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api-client';
import messages from '../messages/en.json';
import { PageHeading } from './app-shell';

type LeadPage = { title: string; headline: string; description: string; status: string };

export function PublicLeadCapture({ slug }: { slug: string }) {
  const [page, setPage] = useState<LeadPage>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ page: LeadPage }>(`/v1/public/lead-pages/${encodeURIComponent(slug)}`)
      .then((result) => setPage(result.page))
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : messages.partnerGrowth.publicLead.invalidPage,
        ),
      );
  }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      await apiPost(`/v1/public/lead-pages/${encodeURIComponent(slug)}/leads`, {
        name: form.get('name'),
        businessName: form.get('businessName'),
        mobile: form.get('mobile'),
        consent: form.get('consent') === 'on',
        website: form.get('website'),
      });
      setNotice(messages.partnerGrowth.messages.leadCaptureSuccess);
      event.currentTarget.reset();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : messages.partnerGrowth.errors.submitEnquiry,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="portal public-page lead-capture-page">
      {page ? (
        <>
          <PageHeading
            eyebrow={page.title}
            title={page.headline}
            description={page.description}
            breadcrumb={[messages.partnerGrowth.labels.home, messages.partnerGrowth.labels.enquiry]}
          />
          {notice ? <p role="status">{notice}</p> : null}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <section className="card lead-capture-card">
            <h2>{messages.partnerGrowth.labels.tellReach}</h2>
            <p className="muted">{messages.partnerGrowth.publicLead.privacy}</p>
            <form className="form" onSubmit={submit}>
              <label className="honeypot-field" aria-hidden="true">
                <span>{messages.partnerGrowth.publicLead.honey}</span>
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <label className="field">
                <span>{messages.partnerGrowth.publicLead.name}</span>
                <input name="name" minLength={2} maxLength={120} autoComplete="name" required />
              </label>
              <label className="field">
                <span>{messages.partnerGrowth.publicLead.business}</span>
                <input name="businessName" maxLength={160} autoComplete="organization" required />
              </label>
              <label className="field">
                <span>{messages.partnerGrowth.publicLead.mobile}</span>
                <input
                  name="mobile"
                  type="tel"
                  pattern="\+?[0-9 ]{10,16}"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className="check-field">
                <input name="consent" type="checkbox" required />{' '}
                {messages.partnerGrowth.publicLead.consent}
              </label>
              <button className="button" disabled={busy}>
                {busy
                  ? messages.partnerGrowth.publicLead.sending
                  : messages.partnerGrowth.publicLead.send}
              </button>
            </form>
          </section>
          <p className="muted lead-capture-footnote">
            {messages.partnerGrowth.publicLead.demoNotice}
          </p>
        </>
      ) : error ? (
        <section className="empty-state" role="alert">
          <strong>{messages.partnerGrowth.labels.unavailable}</strong>
          <span>{error}</span>
        </section>
      ) : (
        <p role="status">{messages.partnerGrowth.publicLead.loading}</p>
      )}
    </main>
  );
}
