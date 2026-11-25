'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeading } from './app-shell';
import { apiGet, apiPatch, apiPost, apiPut, apiUpload } from '../lib/api-client';
import { Money } from '@franchise-crm/shared';

type Row = Record<string, unknown> & { _id?: string; id?: string };
type PageData = { items: Row[]; total?: number };

const views: Record<string, { title: string; description: string; endpoint: string }> = {
  orders: {
    title: 'Order operations',
    description: 'Review service requests and move each case through its approved workflow.',
    endpoint: '/v1/admin/orders',
  },
  services: {
    title: 'Service catalogue',
    description: 'Review the live catalogue, customer pricing, and GST rates.',
    endpoint: '/v1/services',
  },
  commissions: {
    title: 'Commission rules',
    description: 'Review accrued and payable partner commissions.',
    endpoint: '/v1/admin/commissions/rules',
  },
  topups: {
    title: 'Wallet approvals',
    description: 'Approve or decline pending partner funding requests.',
    endpoint: '/v1/admin/wallet/topups',
  },
  ledger: {
    title: 'Immutable ledger',
    description: 'Search the append-only record of wallet credits and debits.',
    endpoint: '/v1/admin/ledger',
  },
  payouts: {
    title: 'Payout runs',
    description: 'Review partner payout requests and settlement references.',
    endpoint: '/v1/admin/payouts',
  },
  tickets: {
    title: 'Support queue',
    description: 'Track partner support cases by priority and status.',
    endpoint: '/v1/admin/tickets',
  },
  reports: {
    title: 'Business reports',
    description: 'Download a snapshot of seeded orders, revenue, and partner activity.',
    endpoint: '/v1/admin/reports',
  },
  content: {
    title: 'Content and notices',
    description: 'Publish a short notice to the partner portal demo.',
    endpoint: '/v1/admin/content',
  },
  roles: {
    title: 'Staff roles',
    description: 'Review role permissions used by the demo accounts.',
    endpoint: '/v1/admin/roles?kind=admin',
  },
  settings: {
    title: 'Portal settings',
    description: 'Review GST and invoice defaults for the demo environment.',
    endpoint: '/v1/admin/settings',
  },
};

const money = (paise: unknown) =>
  typeof paise === 'number'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
    : '—';
const label = (value: unknown) => String(value ?? '—').replaceAll('_', ' ');
const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString('en-IN') : '—';

export function AdminWorkspace({ view }: { view: string }) {
  const config = views[view];
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [orderBreakdown, setOrderBreakdown] = useState<Array<{ status: string; count: number }>>(
    [],
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busyId, setBusyId] = useState('');
  const [reportRows, setReportRows] = useState<Row[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [settings, setSettings] = useState({
    gstin: '27AABCS1234F1Z5',
    gstRateBps: 1800,
    intraState: true,
    invoicePrefix: 'SN',
  });
  const [commissionRules, setCommissionRules] = useState<
    Array<{ tier: string; basisPoints: number }>
  >([]);

  const refresh = useCallback(async () => {
    if (!config && view !== 'home') return;
    setError('');
    try {
      if (view === 'home') {
        const [partners, applications, orders, topups, tickets] = await Promise.all([
          apiGet<Row[]>('/v1/admin/partners'),
          apiGet<PageData>('/v1/admin/applications'),
          apiGet<PageData>('/v1/admin/orders'),
          apiGet<PageData>('/v1/admin/wallet/topups'),
          apiGet<PageData>('/v1/admin/tickets'),
        ]);
        const counts = new Map<string, number>();
        for (const order of orders.items)
          counts.set(String(order.status), (counts.get(String(order.status)) ?? 0) + 1);
        setOrderBreakdown([...counts].map(([status, count]) => ({ status, count })));
        setSummary({
          partners: partners.length,
          applications: applications.items.filter((item) =>
            ['submitted', 'needs_info'].includes(String(item.status)),
          ).length,
          orders: orders.total ?? orders.items.length,
          pendingTopups: topups.items.filter((row) => row.status === 'pending').length,
          openTickets: tickets.items.filter(
            (row) => row.status === 'open' || row.status === 'in_progress',
          ).length,
        });
        setRows(orders.items.slice(0, 8));
      } else if (view === 'reports') {
        const [orders, partners] = await Promise.all([
          apiGet<PageData>('/v1/admin/orders'),
          apiGet<Row[]>('/v1/admin/partners'),
        ]);
        const byStatus = new Map<string, number>();
        for (const row of orders.items)
          byStatus.set(String(row.status), (byStatus.get(String(row.status)) ?? 0) + 1);
        const report = [...byStatus].map(([status, count]) => ({
          status,
          count,
          valuePaise: orders.items
            .filter((row) => row.status === status)
            .reduce((sum, row) => sum + Number(row.totalPaise ?? 0), 0),
        }));
        setRows(report);
        setReportRows([
          { metric: 'Total orders', value: orders.total ?? orders.items.length },
          { metric: 'Partners', value: partners.length },
          {
            metric: 'Completed orders',
            value: orders.items.filter((row) => row.status === 'completed').length,
          },
        ]);
      } else if (view === 'content') {
        const result = await apiGet<{ items: Row[] }>(config!.endpoint);
        setRows(result.items);
      } else if (view === 'settings') {
        const result = await apiGet<{ settings: typeof settings }>(config!.endpoint);
        setSettings(result.settings);
      } else if (view === 'commissions') {
        const result = await apiGet<{ items: typeof commissionRules }>(config!.endpoint);
        setCommissionRules(result.items);
      } else {
        const result = await apiGet<PageData | Row[]>(config!.endpoint);
        setRows(Array.isArray(result) ? result : result.items);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this workspace.');
    }
  }, [config, view]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    apiGet<{ user: { permissions: string[] } }>('/v1/auth/me')
      .then(({ user }) => setPermissions(user.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

  async function decideTopup(row: Row, action: 'approve' | 'reject') {
    const amount = money(row.amountPaise);
    if (
      !window.confirm(
        `${action === 'approve' ? 'Approve' : 'Decline'} this ${amount} top-up request?`,
      )
    )
      return;
    const id = String(row.id ?? row._id ?? '');
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await apiPost(`/v1/admin/wallet/topups/${id}/${action}`);
      setNotice(
        `Top-up ${action === 'approve' ? 'approved' : 'declined'}; the action was recorded in the audit log.`,
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update top-up.');
    } finally {
      setBusyId('');
    }
  }

  async function advanceOrder(row: Row) {
    const transitions: Record<string, string> = {
      submitted: 'assigned',
      assigned: 'in_process',
      in_process: 'completed',
    };
    const next = transitions[String(row.status)];
    if (!next) return;
    const id = String(row._id ?? '');
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await apiPut(`/v1/orders/${id}/status`, { status: next, note: 'Updated in operations demo' });
      setNotice(`Order ${String(row.orderNumber)} moved to ${label(next)}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not advance order.');
    } finally {
      setBusyId('');
    }
  }

  async function assignOrder(row: Row) {
    const id = String(row._id ?? '');
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await apiPost(`/v1/admin/orders/${id}/assign`, {});
      setNotice(`Order ${String(row.orderNumber)} was assigned to you.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not assign order.');
    } finally {
      setBusyId('');
    }
  }

  async function attachOrderFile(orderId: string, file?: File) {
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    setBusyId(orderId);
    setError('');
    setNotice('');
    try {
      await apiUpload(`/v1/orders/${orderId}/documents`, form);
      setNotice(`${file.name} attached to the order as a private document.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not attach document.');
    } finally {
      setBusyId('');
    }
  }

  async function saveService(row: Row, form: FormData) {
    let basePricePaise: number;
    try {
      basePricePaise = Money.fromRupeesString(String(form.get('price') ?? '')).paise;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid price.');
      return;
    }
    const gstRateBps = Number(form.get('gstRateBps'));
    try {
      await apiPatch(`/v1/admin/services/${String(row._id)}`, {
        basePricePaise,
        gstRateBps,
      });
      setNotice(`${String(row.name)} pricing saved and audited.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update service pricing.');
    }
  }

  async function saveCommissionRules(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiPut('/v1/admin/commissions/rules', { items: commissionRules });
      setNotice('Commission rates saved and audited.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save commission rates.');
    }
  }

  async function updateTicket(row: Row, status: string) {
    try {
      await apiPatch(`/v1/admin/tickets/${String(row._id)}`, { status });
      setNotice(`${String(row.ticketNumber)} updated to ${status.replaceAll('_', ' ')}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update ticket.');
    }
  }

  async function markPayoutPaid(row: Row) {
    const amount = money(row.amountPaise);
    if (!window.confirm(`Mark the ${amount} payout as paid? This will be added to the audit log.`))
      return;
    try {
      await apiPost(`/v1/admin/payouts/${String(row._id)}/paid`, {});
      setNotice(`Payout ${String(row._id)} marked paid.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update payout.');
    }
  }

  async function publishNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiPost('/v1/admin/content', { title: noticeTitle, body: noticeBody });
      setNotice('Notice published to the partner demo.');
      setNoticeTitle('');
      setNoticeBody('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish notice.');
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await apiPut('/v1/admin/settings', settings);
      setNotice('Portal settings saved and audited.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save settings.');
    }
  }

  function exportCsv() {
    const content = [
      Object.keys(reportRows[0] ?? {}).join(','),
      ...reportRows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'franchise-demo-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (view === 'home')
    return (
      <main className="portal admin-page">
        <PageHeading
          eyebrow="Operations overview"
          title="Good morning, Avery"
          description="A live snapshot of the franchise network and work that needs attention."
          breadcrumb={['Admin', 'Overview']}
        />
        <section className="admin-kpi-grid" aria-label="Network summary">
          {[
            ['Active network', summary.partners, 'Partners across three tiers'],
            ['Applications', summary.applications, 'Submitted for review'],
            ['Orders', summary.orders, 'Across all service lines'],
            ['Top-ups awaiting review', summary.pendingTopups, 'Finance queue'],
            ['Open support tickets', summary.openTickets, 'Partner care queue'],
          ].map(([title, value, detail]) => (
            <article className="card admin-kpi" key={String(title)}>
              <span>{title}</span>
              <strong>{value ?? '—'}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>
        <section className="card admin-breakdown" aria-label="Order status chart">
          <div className="section-heading">
            <div>
              <h2>Orders by status</h2>
              <p>Current demo queue · {summary.orders ?? 0} total orders</p>
            </div>
          </div>
          <ul>
            {orderBreakdown.map((item) => (
              <li key={item.status}>
                <span>{label(item.status)}</span>
                <span className="admin-bar-track">
                  <span
                    style={{
                      width: `${Math.round((item.count / Math.max(summary.orders ?? 1, 1)) * 100)}%`,
                    }}
                  />
                </span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="card admin-chart-card">
          <div className="section-heading">
            <div>
              <h2>Order activity</h2>
              <p>Latest operational cases across the network</p>
            </div>
            <a className="text-button" href="/admin/orders">
              Open order queue →
            </a>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Service</th>
                  <th>Partner</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row._id)}>
                    <td>{String(row.orderNumber ?? row._id)}</td>
                    <td>{String(row.serviceName ?? row.serviceId)}</td>
                    <td>{String(row.partnerName ?? row.partnerId)}</td>
                    <td>
                      <span className={`status-badge ${String(row.status)}`}>
                        {label(row.status)}
                      </span>
                    </td>
                    <td>{money(row.totalPaise)}</td>
                    <td>{date(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    );

  if (!config)
    return (
      <main className="portal admin-page">
        <div className="empty-state">
          <strong>Admin screen not found</strong>
          <a href="/admin">Return to overview</a>
        </div>
      </main>
    );

  return (
    <main className="portal admin-page">
      <PageHeading
        eyebrow="Control centre"
        title={config.title}
        description={config.description}
        breadcrumb={['Admin', config.title]}
      />
      {notice ? <p role="status">{notice}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {view === 'content' ? (
        <section className="card">
          <h2>Partner notices</h2>
          {permissions.includes('content.manage') ? (
            <form className="form" onSubmit={publishNotice}>
              <label className="field">
                <span>Notice title</span>
                <input
                  value={noticeTitle}
                  onChange={(event) => setNoticeTitle(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label className="field">
                <span>Message</span>
                <textarea
                  value={noticeBody}
                  onChange={(event) => setNoticeBody(event.target.value)}
                  maxLength={1000}
                  required
                />
              </label>
              <button className="button">Publish notice</button>
            </form>
          ) : (
            <p className="muted">Your role has read-only access to partner notices.</p>
          )}
          <Table rows={rows} columns={['title', 'body', 'status', 'createdAt']} />
        </section>
      ) : null}
      {view === 'settings' ? (
        <section className="card">
          <h2>Tax and invoice defaults</h2>
          <form className="form" onSubmit={saveSettings}>
            <label className="field">
              <span>Company GSTIN</span>
              <input
                value={settings.gstin}
                onChange={(event) =>
                  setSettings({ ...settings, gstin: event.target.value.toUpperCase() })
                }
                readOnly={!permissions.includes('settings.manage')}
                maxLength={15}
                required
              />
            </label>
            <label className="field">
              <span>Default GST rate (basis points)</span>
              <input
                type="number"
                min={0}
                max={2800}
                value={settings.gstRateBps}
                onChange={(event) =>
                  setSettings({ ...settings, gstRateBps: Number(event.target.value) })
                }
                readOnly={!permissions.includes('settings.manage')}
                required
              />
            </label>
            <label className="field">
              <span>Invoice prefix</span>
              <input
                value={settings.invoicePrefix}
                onChange={(event) =>
                  setSettings({ ...settings, invoicePrefix: event.target.value.toUpperCase() })
                }
                readOnly={!permissions.includes('settings.manage')}
                maxLength={8}
                required
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={settings.intraState}
                disabled={!permissions.includes('settings.manage')}
                onChange={(event) => setSettings({ ...settings, intraState: event.target.checked })}
              />{' '}
              Default to intra-state GST split (CGST + SGST)
            </label>
            {permissions.includes('settings.manage') ? (
              <button className="button">Save settings</button>
            ) : (
              <p className="muted">Your role has read-only access to portal settings.</p>
            )}
          </form>
        </section>
      ) : null}
      {view === 'reports' ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Orders by status</h2>
              <p>Aggregated from the current mock order set.</p>
            </div>
            <button
              className="button secondary small"
              onClick={exportCsv}
              disabled={!reportRows.length}
            >
              Export CSV
            </button>
          </div>
          <Table rows={rows} columns={['status', 'count', 'valuePaise']} />
        </section>
      ) : null}
      {view === 'commissions' ? (
        <section className="card">
          <h2>Default commission rates</h2>
          <p className="muted">
            Rates are stored in basis points and applied to eligible order value.
          </p>
          {permissions.includes('commissions.manage') ? (
            <form className="form" onSubmit={saveCommissionRules}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Partner tier</th>
                      <th>Rate (%)</th>
                      <th>Basis points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionRules.map((rule, index) => (
                      <tr key={rule.tier}>
                        <td>{label(rule.tier)}</td>
                        <td>
                          <label className="sr-only" htmlFor={`commission-${rule.tier}`}>
                            Rate for {label(rule.tier)}
                          </label>
                          <input
                            id={`commission-${rule.tier}`}
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={rule.basisPoints / 100}
                            onChange={(event) =>
                              setCommissionRules(
                                commissionRules.map((item, position) =>
                                  position === index
                                    ? {
                                        ...item,
                                        basisPoints: Math.round(Number(event.target.value) * 100),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>{rule.basisPoints.toLocaleString('en-IN')} bps</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="button">Save commission rates</button>
            </form>
          ) : (
            <p className="muted">Your role has read-only access to commission settings.</p>
          )}
        </section>
      ) : null}
      {view !== 'content' && view !== 'settings' && view !== 'reports' && view !== 'commissions' ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>{config.title}</h2>
              <p>{rows.length} records in this view</p>
            </div>
          </div>
          <WorkspaceTable
            view={view}
            rows={rows}
            busyId={busyId}
            onTopup={(row, action) => void decideTopup(row, action)}
            onAdvance={(row) => void advanceOrder(row)}
            onAssign={(row) => void assignOrder(row)}
            onAttach={(id, file) => void attachOrderFile(id, file)}
            onServiceSave={(row, form) => void saveService(row, form)}
            onTicketUpdate={(row, status) => void updateTicket(row, status)}
            onPayoutPaid={(row) => void markPayoutPaid(row)}
            permissions={permissions}
          />
        </section>
      ) : null}
    </main>
  );
}

function Table({ rows, columns }: { rows: Row[]; columns?: string[] }) {
  const keys =
    columns ??
    Object.keys(rows[0] ?? {})
      .filter((key) => !['path', 'permissions', 'metadata'].includes(key))
      .slice(0, 7);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{label(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row._id ?? row.id ?? index)}>
              {keys.map((key) => (
                <td key={key}>
                  {key.toLowerCase().includes('paise') ||
                  key.toLowerCase().includes('amount') ||
                  key.toLowerCase().includes('balance')
                    ? money(row[key])
                    : key.toLowerCase().includes('date') || key.toLowerCase().includes('at')
                      ? date(row[key])
                      : label(row[key])}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={keys.length || 1}>No records match this view.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function WorkspaceTable({
  view,
  rows,
  busyId,
  onTopup,
  onAdvance,
  onAssign,
  onAttach,
  onServiceSave,
  onTicketUpdate,
  onPayoutPaid,
  permissions,
}: {
  view: string;
  rows: Row[];
  busyId: string;
  onTopup: (row: Row, action: 'approve' | 'reject') => void;
  onAdvance: (row: Row) => void;
  onAssign: (row: Row) => void;
  onAttach: (id: string, file?: File) => void;
  onServiceSave: (row: Row, form: FormData) => void;
  onTicketUpdate: (row: Row, status: string) => void;
  onPayoutPaid: (row: Row) => void;
  permissions: string[];
}) {
  if (view === 'services')
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Base price (₹)</th>
              <th>GST (bps)</th>
              <th>Status</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row._id)}>
                <td>{String(row.name)}</td>
                <td>{String(row.category)}</td>
                <td colSpan={4}>
                  <form
                    className="service-edit-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onServiceSave(row, new FormData(event.currentTarget));
                    }}
                  >
                    <label className="sr-only" htmlFor={`price-${String(row._id)}`}>
                      Price for {String(row.name)}
                    </label>
                    <input
                      id={`price-${String(row._id)}`}
                      name="price"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={Number(row.basePricePaise) / 100}
                      readOnly={!permissions.includes('services.manage')}
                      required
                    />
                    <label className="sr-only" htmlFor={`gst-${String(row._id)}`}>
                      GST rate in basis points for {String(row.name)}
                    </label>
                    <input
                      id={`gst-${String(row._id)}`}
                      name="gstRateBps"
                      type="number"
                      min={0}
                      max={2800}
                      step={100}
                      defaultValue={Number(row.gstRateBps)}
                      readOnly={!permissions.includes('services.manage')}
                      required
                    />
                    <span className={`status-badge ${row.active ? 'active' : 'disabled'}`}>
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                    {permissions.includes('services.manage') ? (
                      <button className="button small">Save</button>
                    ) : (
                      <span className="muted">Read only</span>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (view === 'payouts')
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Amount</th>
              <th>Requested</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row._id)}>
                <td>{String(row.partnerName ?? row.partnerId)}</td>
                <td>{money(row.amountPaise)}</td>
                <td>{date(row.requestedAt)}</td>
                <td>{String(row.reference ?? '—')}</td>
                <td>
                  <span className={`status-badge ${String(row.status)}`}>{label(row.status)}</span>
                </td>
                <td>
                  {row.status === 'batched' && permissions.includes('payouts.manage') ? (
                    <button className="button secondary small" onClick={() => onPayoutPaid(row)}>
                      Mark paid
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (view === 'tickets')
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Partner</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row._id)}>
                <td>{String(row.ticketNumber)}</td>
                <td>{String(row.subject)}</td>
                <td>
                  <span className={`status-badge ${String(row.priority)}`}>
                    {label(row.priority)}
                  </span>
                </td>
                <td>{String(row.partnerId)}</td>
                <td>{date(row.createdAt)}</td>
                <td>
                  {permissions.includes('tickets.manage') ? (
                    <>
                      <label className="sr-only" htmlFor={`ticket-${String(row._id)}`}>
                        Status for ticket {String(row.ticketNumber)}
                      </label>
                      <select
                        id={`ticket-${String(row._id)}`}
                        value={String(row.status)}
                        disabled={!permissions.includes('tickets.manage')}
                        onChange={(event) => onTicketUpdate(row, event.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </>
                  ) : (
                    <span className={`status-badge ${String(row.status)}`}>
                      {label(row.status)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (view === 'topups')
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Reference</th>
              <th>Requested</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.partnerName ?? row.partnerId)}</td>
                <td>{String(row.reference ?? '—')}</td>
                <td>{money(row.amountPaise)}</td>
                <td>{date(row.createdAt)}</td>
                <td>
                  <span className={`status-badge ${String(row.status)}`}>{label(row.status)}</span>
                </td>
                <td>
                  {row.status === 'pending' && permissions.includes('wallet.topup_approve') ? (
                    <div className="actions">
                      <button
                        className="button small"
                        disabled={
                          busyId === row.id || !permissions.includes('wallet.topup_approve')
                        }
                        onClick={() => onTopup(row, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="button secondary small"
                        disabled={
                          busyId === row.id || !permissions.includes('wallet.topup_approve')
                        }
                        onClick={() => onTopup(row, 'reject')}
                      >
                        Decline
                      </button>
                    </div>
                  ) : row.status === 'pending' ? (
                    'Pending review'
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6}>No top-up requests.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  if (view === 'orders')
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Partner</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Operations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row._id)}>
                <td>{String(row.orderNumber)}</td>
                <td>{String(row.customerName)}</td>
                <td>{String(row.serviceName ?? row.serviceId)}</td>
                <td>{String(row.partnerName ?? row.partnerId)}</td>
                <td>{money(row.totalPaise)}</td>
                <td>
                  <span className={`status-badge ${String(row.status)}`}>{label(row.status)}</span>
                </td>
                <td>
                  <div className="actions">
                    {row.status === 'submitted' && permissions.includes('orders.process') ? (
                      <button
                        className="text-button"
                        disabled={busyId === row._id}
                        onClick={() => onAssign(row)}
                      >
                        Assign to me
                      </button>
                    ) : null}
                    {['assigned', 'in_process'].includes(String(row.status)) &&
                    permissions.includes('orders.process') ? (
                      <button
                        className="text-button"
                        disabled={busyId === row._id}
                        onClick={() => onAdvance(row)}
                      >
                        Advance →
                      </button>
                    ) : null}
                    {permissions.includes('orders.process') ? (
                      <label className="file-action">
                        Attach doc
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          disabled={busyId === row._id}
                          onChange={(event) => onAttach(String(row._id), event.target.files?.[0])}
                        />
                      </label>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return <Table rows={rows} />;
}
