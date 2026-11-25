'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateLineGst, Money } from '@franchise-crm/shared';
import { apiGet, apiPatch, apiPost } from '../lib/api-client';
import messages from '../messages/en.json';
import { PageHeading } from './app-shell';

type Row = Record<string, unknown> & { id?: string; _id?: string };
type QuizScore = { lessonId: string; score: number; passed: boolean };
type View = 'leads' | 'learning' | 'invoice' | 'lead-pages';

const copy = messages.partnerGrowth;
const lessons = copy.learning.lessons;
const views: Record<View, { title: string; description: string }> = {
  leads: copy.views.leads,
  learning: copy.views.learning,
  invoice: copy.views.invoice,
  'lead-pages': copy.views.leadPages,
};

export function PartnerGrowthTools({ view }: { view: View }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [certificateAvailable, setCertificateAvailable] = useState(false);
  const [certificateIssuedAt, setCertificateIssuedAt] = useState('');
  const [clients, setClients] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [subtotal, setSubtotal] = useState(copy.invoice.defaultSubtotal);
  const [rate, setRate] = useState(copy.invoice.defaultRate);
  const [description, setDescription] = useState(copy.invoice.defaultDescription);
  const [calculation, setCalculation] = useState<ReturnType<typeof calculateLineGst>>();
  const [invoiceToPrint, setInvoiceToPrint] = useState<Row>();
  const [invoiceDate, setInvoiceDate] = useState(copy.invoice.defaultDate);
  const selectedInvoiceClient = clients.find((client) => client._id === selectedClientId);
  const invoiceIntraState = selectedInvoiceClient
    ? String(selectedInvoiceClient.state).toLowerCase() === 'maharashtra'
    : true;

  const refresh = useCallback(async () => {
    setError('');
    try {
      if (view === 'leads' || view === 'lead-pages') {
        const result = await apiGet<{ items: Row[] }>(`/v1/partner/${view}`);
        setRows(result.items);
      }
      if (view === 'learning') {
        const result = await apiGet<{
          userId: string;
          completed: string[];
          quizScores: QuizScore[];
          certificateAvailable: boolean;
          certificateIssuedAt: string | null;
        }>('/v1/partner/learning/progress');
        setCompleted(result.completed);
        setQuizScores(result.quizScores);
        setCertificateAvailable(result.certificateAvailable);
        setCertificateIssuedAt(result.certificateIssuedAt ?? '');
      }
      if (view === 'invoice') {
        const [clientResult, invoiceResult] = await Promise.all([
          apiGet<{ items: Row[] }>('/v1/partner/invoice-clients'),
          apiGet<{ items: Row[] }>('/v1/partner/invoices'),
        ]);
        setClients(clientResult.items);
        setInvoices(invoiceResult.items);
        if (!selectedClientId && clientResult.items[0]?._id)
          setSelectedClientId(String(clientResult.items[0]._id));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.messages.loadError);
    }
  }, [selectedClientId, view]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await apiPost('/v1/partner/leads', {
        name: form.get('name'),
        businessName: form.get('businessName'),
        mobile: form.get('mobile'),
        source: form.get('source'),
        consent: form.get('consent') === 'on',
      });
      event.currentTarget.reset();
      setNotice(copy.messages.leadSaved);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.saveLead);
    }
  }

  async function advanceLead(row: Row) {
    const stages = ['new', 'contacted', 'qualified', 'won'];
    const current = stages.indexOf(String(row.stage));
    if (current < 0 || current === stages.length - 1) return;
    try {
      await apiPatch(`/v1/partner/leads/${String(row._id)}`, { stage: stages[current + 1] });
      setNotice(copy.messages.leadMoved.replace('{stage}', stageLabel(stages[current + 1] ?? '')));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.updateLead);
    }
  }

  async function markLeadLost(row: Row) {
    try {
      await apiPatch(`/v1/partner/leads/${String(row._id)}`, { stage: 'lost' });
      setNotice(copy.messages.leadMoved.replace('{stage}', copy.leads.lost));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.updateLead);
    }
  }

  async function completeLesson(lessonId: string) {
    try {
      const result = await apiPost<{ completed: string[] }>('/v1/partner/learning/progress', {
        lessonId,
      });
      setCompleted(result.completed);
      setNotice(copy.messages.lessonComplete);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.saveProgress);
    }
  }

  async function submitQuiz(lessonId: string) {
    try {
      const result = await apiPost<{ score: number; passed: boolean }>(
        `/v1/partner/learning/quizzes/${lessonId}`,
        { answers: quizAnswers[lessonId] ?? {} },
      );
      await refresh();
      const message = result.passed ? copy.messages.quizPassed : copy.messages.quizFailed;
      setNotice(message.replace('{score}', String(result.score)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.quiz);
    }
  }

  async function issueCertificate() {
    try {
      const result = await apiPost<{ certificate: { certificateIssuedAt: string } }>(
        '/v1/partner/learning/certificate',
        {},
      );
      setCertificateIssuedAt(result.certificate.certificateIssuedAt);
      setNotice(copy.messages.certificateIssued);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.certificate);
    }
  }

  async function saveInvoiceClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiPost<{ client: Row }>('/v1/partner/invoice-clients', {
        name: form.get('name'),
        businessName: form.get('businessName'),
        email: form.get('email'),
        mobile: form.get('mobile'),
        state: form.get('state'),
        gstin: form.get('gstin'),
      });
      setClients((current) => [result.client, ...current]);
      setSelectedClientId(String(result.client._id));
      event.currentTarget.reset();
      setNotice(copy.invoice.clientSaved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.invoice.invalidClient);
    }
  }

  function invoiceRateBasisPoints(): number {
    const match = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(rate.trim());
    if (!match) throw new RangeError(copy.errors.invalidRate);
    const basisPoints = Number(
      BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0'),
    );
    if (basisPoints > 2800) throw new RangeError(copy.errors.rateRange);
    return basisPoints;
  }

  async function saveInvoice() {
    const selectedClient = clients.find((client) => client._id === selectedClientId);
    if (!selectedClient) {
      setError(copy.invoice.saveClientError);
      return;
    }
    try {
      const result = await apiPost<{ invoice: Row }>('/v1/partner/invoices', {
        clientId: selectedClientId,
        issueDate: invoiceDate,
        lines: [
          {
            description,
            quantity: 1,
            unitAmountPaise: Money.fromRupeesString(subtotal).paise,
            gstRateBps: invoiceRateBasisPoints(),
          },
        ],
      });
      setInvoices((current) => [result.invoice, ...current]);
      setNotice(copy.messages.invoiceSaved.replace('{number}', String(result.invoice.number)));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.invoice);
    }
  }

  async function createPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiPost<{ page: Row }>('/v1/partner/lead-pages', {
        title: form.get('title'),
        headline: form.get('headline'),
        description: form.get('description'),
      });
      setNotice(copy.messages.pageCreated.replace('{title}', String(result.page.title)));
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.createPage);
    }
  }

  async function publishPage(page: Row) {
    try {
      await apiPatch(`/v1/partner/lead-pages/${String(page._id)}`, { status: 'published' });
      setNotice(copy.messages.pagePublished);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.publishPage);
    }
  }

  async function capturePageLead(event: React.FormEvent<HTMLFormElement>, page: Row) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiPost('/v1/partner/leads', {
        name: form.get('name'),
        businessName: form.get('businessName'),
        mobile: form.get('mobile'),
        source: `lead_page:${String(page.slug)}`,
        consent: form.get('consent') === 'on',
      });
      setNotice(copy.messages.enquiryReceived);
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.errors.captureLead);
    }
  }

  function calculateInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInvoiceToPrint(undefined);
    try {
      const amount = Money.fromRupeesString(subtotal);
      const rateBasisPoints = invoiceRateBasisPoints();
      setCalculation(calculateLineGst([{ subtotal: amount, rateBasisPoints }], invoiceIntraState));
    } catch (cause) {
      setCalculation(undefined);
      setError(cause instanceof Error ? cause.message : copy.errors.invalidInvoice);
    }
  }

  function printSavedInvoice(invoice: Row) {
    setInvoiceToPrint(invoice);
    window.setTimeout(() => window.print(), 100);
  }

  function downloadAsset(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const config = views[view];
  return (
    <main className="portal admin-page">
      <PageHeading
        eyebrow={copy.labels.workspace}
        title={config.title}
        description={config.description}
        breadcrumb={[copy.labels.breadcrumbPartner, config.title]}
      />
      {notice ? <p role="status">{notice}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {view === 'leads' ? (
        <>
          <section className="card">
            <h2>{copy.actions.addProspect}</h2>
            <form className="form inline-form" onSubmit={createLead}>
              <label className="field">
                <span>{copy.publicLead.name}</span>
                <input name="name" minLength={2} required />
              </label>
              <label className="field">
                <span>{copy.publicLead.business}</span>
                <input name="businessName" required />
              </label>
              <label className="field">
                <span>{copy.publicLead.mobile}</span>
                <input name="mobile" type="tel" pattern="\+?[0-9 ]{10,16}" required />
              </label>
              <label className="field">
                <span>{copy.labels.source}</span>
                <select name="source">
                  <option>{copy.leads.walkIn}</option>
                  <option>{copy.leads.referral}</option>
                  <option>{copy.leads.leadPage}</option>
                  <option>{copy.leads.campaign}</option>
                </select>
              </label>
              <label className="check-field">
                <input name="consent" type="checkbox" required /> {copy.labels.consent}
              </label>
              <button className="button">{copy.actions.saveLead}</button>
            </form>
          </section>
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>{copy.labels.leadPipeline}</h2>
                <p>{copy.leads.prospectCount.replace('{count}', String(rows.length))}</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{copy.leads.contact}</th>
                    <th>{copy.publicLead.business}</th>
                    <th>{copy.publicLead.mobile}</th>
                    <th>{copy.labels.source}</th>
                    <th>{copy.labels.currentStatus}</th>
                    <th>{copy.labels.followUp}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row._id)}>
                      <td>{String(row.name)}</td>
                      <td>{String(row.businessName)}</td>
                      <td>{String(row.mobile)}</td>
                      <td>{String(row.source)}</td>
                      <td>
                        <span className={`status-badge ${String(row.stage)}`}>
                          {stageLabel(String(row.stage))}
                        </span>
                      </td>
                      <td>
                        {row.stage !== 'won' && row.stage !== 'lost' ? (
                          <div className="actions">
                            <button className="text-button" onClick={() => void advanceLead(row)}>
                              {copy.labels.nextStage}
                            </button>
                            <button className="text-button" onClick={() => void markLeadLost(row)}>
                              {copy.labels.markLost}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 ? (
                <div className="empty-state">
                  <strong>{copy.labels.noLeads}</strong>
                  <span>{copy.labels.noLeadsHint}</span>
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {view === 'learning' ? (
        <>
          <section className="partner-summary-grid">
            <article className="card">
              <span>{copy.labels.learningPath}</span>
              <strong>
                {completed.length} / {lessons.length}
              </strong>
              <small>{copy.labels.completedByUser}</small>
            </article>
            <article className="card">
              <span>{copy.labels.marketingKit}</span>
              <strong>{copy.labels.resources}</strong>
              <small>{copy.labels.readyResources}</small>
            </article>
          </section>
          <section className="partner-growth-grid">
            {lessons.map((lesson, index) => (
              <article className="card growth-card" key={lesson.id}>
                <span className="eyebrow">
                  {copy.labels.module.replace('{number}', String(index + 1))}
                </span>
                <h2>{lesson.title}</h2>
                <p>{lesson.detail}</p>
                <span
                  className={`status-badge ${completed.includes(lesson.id) ? 'active' : 'pending'}`}
                >
                  {completed.includes(lesson.id) ? copy.leads.complete : copy.leads.notStarted}
                </span>
                <button
                  className="button secondary"
                  disabled={completed.includes(lesson.id)}
                  onClick={() => void completeLesson(lesson.id)}
                >
                  {completed.includes(lesson.id)
                    ? copy.actions.completed
                    : copy.actions.markComplete}
                </button>
                <form
                  className="learning-quiz"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitQuiz(lesson.id);
                  }}
                >
                  <h3>{copy.learning.quizTitle}</h3>
                  {lesson.questions.map((question) => (
                    <fieldset key={question.id}>
                      <legend>{question.question}</legend>
                      {question.choices.map((choice) => (
                        <label className="check-field" key={choice.value}>
                          <input
                            type="radio"
                            name={`${lesson.id}-${question.id}`}
                            value={choice.value}
                            checked={quizAnswers[lesson.id]?.[question.id] === choice.value}
                            onChange={() =>
                              setQuizAnswers((current) => ({
                                ...current,
                                [lesson.id]: { ...current[lesson.id], [question.id]: choice.value },
                              }))
                            }
                          />
                          {choice.label}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button className="button secondary">{copy.actions.submitQuiz}</button>
                  {quizScores.find((score) => score.lessonId === lesson.id) ? (
                    <p className="muted">
                      {copy.learning.lastScore.replace(
                        '{score}',
                        String(quizScores.find((score) => score.lessonId === lesson.id)?.score),
                      )}
                      {quizScores.find((score) => score.lessonId === lesson.id)?.passed
                        ? copy.learning.passedSuffix
                        : copy.learning.retrySuffix}
                    </p>
                  ) : null}
                </form>
              </article>
            ))}
          </section>
          {certificateAvailable && !certificateIssuedAt ? (
            <button className="button" onClick={() => void issueCertificate()}>
              {copy.actions.issueCertificate}
            </button>
          ) : null}
          {certificateIssuedAt ? (
            <section className="card completion-certificate" aria-label={copy.labels.certificate}>
              <span className="eyebrow">{copy.labels.certificate}</span>
              <h2>{messages.brand}</h2>
              <p>{copy.learning.certificateBody}</p>
              <strong>{copy.learning.certificateHolder}</strong>
              <small>
                {copy.learning.certificateDate.replace(
                  '{date}',
                  new Date(certificateIssuedAt).toLocaleDateString('en-IN'),
                )}
              </small>
              <button className="button secondary no-print" onClick={() => window.print()}>
                {copy.actions.printCertificate}
              </button>
            </section>
          ) : null}
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>{copy.labels.marketingKit}</h2>
                <p>{copy.learning.marketingIntro}</p>
              </div>
            </div>
            <div className="partner-growth-grid">
              {copy.learning.marketing.map((asset) => (
                <article className="growth-resource" key={asset.file}>
                  <h3>{asset.title}</h3>
                  <p>{asset.description}</p>
                  <button
                    className="text-button"
                    onClick={() => downloadAsset(asset.file, asset.copy)}
                  >
                    {copy.actions.downloadCopy}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {view === 'invoice' ? (
        <>
          <section className="card">
            <h2>{copy.invoice.savedClients}</h2>
            <form className="form inline-form" onSubmit={saveInvoiceClient}>
              <label className="field">
                <span>{copy.invoice.clientName}</span>
                <input name="name" required />
              </label>
              <label className="field">
                <span>{copy.invoice.clientBusiness}</span>
                <input name="businessName" required />
              </label>
              <label className="field">
                <span>{copy.invoice.clientEmail}</span>
                <input name="email" type="email" />
              </label>
              <label className="field">
                <span>{copy.invoice.clientMobile}</span>
                <input name="mobile" type="tel" required />
              </label>
              <label className="field">
                <span>{copy.invoice.clientState}</span>
                <input name="state" required />
              </label>
              <label className="field">
                <span>{copy.invoice.clientGstin}</span>
                <input name="gstin" />
              </label>
              <button className="button secondary">{copy.invoice.saveClient}</button>
            </form>
            <label className="field">
              <span>{copy.invoice.chooseClient}</span>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="">{copy.invoice.chooseClient}</option>
                {clients.map((client) => (
                  <option value={String(client._id)} key={String(client._id)}>
                    {String(client.businessName)} · {String(client.state)}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="card">
            <h2>{copy.labels.invoiceDetails}</h2>
            <p className="muted">{copy.labels.invoiceEstimate}</p>
            <form className="form inline-form" onSubmit={calculateInvoice}>
              <label className="field">
                <span>{copy.labels.description}</span>
                <input
                  aria-label={copy.labels.description}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.labels.taxableAmount}</span>
                <input
                  aria-label={copy.labels.taxableAmount}
                  inputMode="decimal"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>{copy.labels.gstRate}</span>
                <input
                  aria-label={copy.labels.gstRate}
                  type="number"
                  min="0"
                  max="28"
                  step="0.01"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>{copy.invoice.issueDate}</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  required
                />
              </label>
              <p className="muted">
                {selectedInvoiceClient
                  ? invoiceIntraState
                    ? copy.invoice.intraState
                    : copy.invoice.interState
                  : copy.invoice.chooseClient}
              </p>
              <button className="button">{copy.actions.calculate}</button>
            </form>
          </section>
          {calculation || invoiceToPrint ? (
            <section className="card invoice-preview" aria-label={copy.labels.invoicePreview}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {String(invoiceToPrint?.number ?? copy.labels.draftNotIssued)}
                  </span>
                  <h2>{copy.labels.invoicePreview}</h2>
                  <p>
                    {invoiceToPrint
                      ? String(
                          (invoiceToPrint.lines as Array<{ description: string }>)[0]
                            ?.description ?? '',
                        )
                      : description || copy.labels.description}
                  </p>
                </div>
                <div className="actions no-print">
                  <button className="button secondary" onClick={() => window.print()}>
                    {copy.actions.printPreview}
                  </button>
                  {!invoiceToPrint ? (
                    <button className="button" onClick={() => void saveInvoice()}>
                      {copy.actions.saveInvoice}
                    </button>
                  ) : null}
                </div>
              </div>
              {invoiceToPrint ? <p>{String(invoiceToPrint.issueDate)}</p> : null}
              <dl>
                <div>
                  <dt>{copy.labels.taxable}</dt>
                  <dd>
                    {rupees(
                      Number(invoiceToPrint?.subtotalPaise ?? calculation?.subtotal.paise ?? 0),
                    )}
                  </dd>
                </div>
                {Number(invoiceToPrint?.igstPaise ?? calculation?.igst.paise ?? 0) === 0 ? (
                  <>
                    <div>
                      <dt>{copy.labels.cgst}</dt>
                      <dd>
                        {rupees(Number(invoiceToPrint?.cgstPaise ?? calculation?.cgst.paise ?? 0))}
                      </dd>
                    </div>
                    <div>
                      <dt>{copy.labels.sgst}</dt>
                      <dd>
                        {rupees(Number(invoiceToPrint?.sgstPaise ?? calculation?.sgst.paise ?? 0))}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>{copy.labels.igst}</dt>
                    <dd>
                      {rupees(Number(invoiceToPrint?.igstPaise ?? calculation?.igst.paise ?? 0))}
                    </dd>
                  </div>
                )}
                <div className="invoice-total">
                  <dt>{copy.labels.total}</dt>
                  <dd>
                    {rupees(Number(invoiceToPrint?.totalPaise ?? calculation?.total.paise ?? 0))}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
          <section className="card">
            <h2>{copy.invoice.savedInvoices}</h2>
            {invoices.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{copy.labels.currentStatus}</th>
                      <th>{copy.invoice.issueDate}</th>
                      <th>{copy.labels.total}</th>
                      <th>{messages.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={String(invoice._id)}>
                        <td>{String(invoice.number)}</td>
                        <td>{String(invoice.issueDate)}</td>
                        <td>{rupees(Number(invoice.totalPaise))}</td>
                        <td>
                          <button
                            className="text-button no-print"
                            onClick={() => printSavedInvoice(invoice)}
                          >
                            {copy.actions.print}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">{copy.invoice.noInvoices}</p>
            )}
          </section>
        </>
      ) : null}

      {view === 'lead-pages' ? (
        <>
          <section className="card">
            <h2>{copy.leadPages.createTitle}</h2>
            <form className="form" onSubmit={createPage}>
              <label className="field">
                <span>{copy.leadPages.pageName}</span>
                <input name="title" maxLength={80} required />
              </label>
              <label className="field">
                <span>{copy.leadPages.headline}</span>
                <input name="headline" maxLength={120} required />
              </label>
              <label className="field">
                <span>{copy.leadPages.supportingText}</span>
                <textarea name="description" maxLength={400} required />
              </label>
              <button className="button">{copy.actions.createPreview}</button>
            </form>
          </section>
          <section className="partner-growth-grid">
            {rows.map((page) => (
              <article className="card growth-card" id={String(page.slug)} key={String(page._id)}>
                <span className={`status-badge ${String(page.status)}`}>{String(page.status)}</span>
                <h2>{String(page.headline)}</h2>
                <p>{String(page.description)}</p>
                <small>{copy.leadPages.publicLink.replace('{slug}', String(page.slug))}</small>
                <div className="actions">
                  {page.status === 'published' ? (
                    <Link
                      className="button secondary"
                      href={`/p/${String(page.slug)}`}
                      target="_blank"
                    >
                      {copy.leadPages.open}
                    </Link>
                  ) : (
                    <button className="button secondary" onClick={() => void publishPage(page)}>
                      {copy.leadPages.publish}
                    </button>
                  )}
                </div>
                <form
                  className="form lead-capture-preview"
                  onSubmit={(event) => void capturePageLead(event, page)}
                >
                  <h3>{copy.leadPages.preview}</h3>
                  <label className="field">
                    <span>{copy.publicLead.name}</span>
                    <input name="name" required />
                  </label>
                  <label className="field">
                    <span>{copy.publicLead.business}</span>
                    <input name="businessName" required />
                  </label>
                  <label className="field">
                    <span>{copy.publicLead.mobile}</span>
                    <input name="mobile" type="tel" required />
                  </label>
                  <label className="check-field">
                    <input name="consent" type="checkbox" required /> {copy.leadPages.consent}
                  </label>
                  <button className="button secondary">{copy.leadPages.submitSample}</button>
                </form>
              </article>
            ))}
            {rows.length === 0 ? (
              <div className="empty-state">
                <strong>{copy.leadPages.noPages}</strong>
                <span>{copy.leadPages.noPagesHint}</span>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function rupees(paise: number) {
  const value = BigInt(paise);
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const major = Number(magnitude / 100n);
  const minor = String(magnitude % 100n).padStart(2, '0');
  const formattedMajor = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(major);
  return `${negative ? '-' : ''}₹${formattedMajor}.${minor}`;
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    new: copy.leads.stageNew,
    contacted: copy.leads.contacted,
    qualified: copy.leads.qualified,
    won: copy.leads.won,
    lost: copy.leads.lost,
  };
  return labels[stage] ?? stage;
}
