'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeading } from './app-shell';
import { apiGet, apiPatch, apiPost } from '../lib/api-client';
import {
  Money,
  type OrderRecord,
  type ServiceRecord,
  type WalletRecord,
} from '@franchise-crm/shared';

type Row = Record<string, unknown> & { _id?: string; id?: string };
type Rows = { items: Row[]; total: number };
type User = {
  name: string;
  partner?: { id: string; tier: string; status: string; businessName: string };
};
const money = (value: unknown) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100)
    : '—';
const label = (value: unknown) => String(value ?? '—').replaceAll('_', ' ');
const when = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString('en-IN') : '—';

const viewConfig: Record<string, { title: string; description: string; endpoint?: string }> = {
  services: {
    title: 'Services',
    description: 'Choose a service and create an order for your customer.',
  },
  orders: {
    title: 'Your orders',
    description: 'Follow every request from submission through fulfilment.',
    endpoint: '/v1/orders?pageSize=100',
  },
  wallet: {
    title: 'Wallet and statements',
    description: 'Review available funds, request a top-up, and inspect the immutable ledger.',
  },
  commissions: {
    title: 'Commissions',
    description: 'Track earnings across your eligible service orders.',
    endpoint: '/v1/partner/commissions',
  },
  payouts: {
    title: 'Payout history',
    description: 'Review submitted and settled partner payouts.',
    endpoint: '/v1/partner/payouts',
  },
  customers: {
    title: 'Customers',
    description: 'Keep a consent-based book of customers you serve.',
    endpoint: '/v1/partner/customers',
  },
  tickets: {
    title: 'Support',
    description: 'Raise a request and follow up with the operations team.',
    endpoint: '/v1/partner/tickets',
  },
  notices: {
    title: 'Partner notices',
    description: 'Updates from the head office for your network.',
  },
  team: {
    title: 'Team and network',
    description: 'Invite eligible partners and review your own downline.',
  },
};

export function PartnerWorkspace({ view }: { view: string }) {
  const config = viewConfig[view];
  const [user, setUser] = useState<User>();
  const [rows, setRows] = useState<Row[]>([]);
  const [team, setTeam] = useState<Row[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [wallet, setWallet] = useState<WalletRecord>();
  const [ledger, setLedger] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const identity = await apiGet<{ user: User }>('/v1/auth/me');
      setUser(identity.user);
      if (view === 'dashboard') {
        const [orders, balance, tickets] = await Promise.all([
          apiGet<{ items: OrderRecord[]; total: number }>('/v1/orders?pageSize=100'),
          apiGet<{ wallet: WalletRecord }>('/v1/partner/wallet'),
          apiGet<Rows>('/v1/partner/tickets'),
        ]);
        setRows(orders.items.slice(0, 6));
        setWallet(balance.wallet);
        setLedger([
          { metric: 'Orders', value: orders.total },
          {
            metric: 'Open tickets',
            value: tickets.items.filter(
              (item) => item.status === 'open' || item.status === 'in_progress',
            ).length,
          },
        ]);
      } else if (view === 'services') {
        const result = await apiGet<{ items: ServiceRecord[] }>('/v1/services');
        setServices(result.items);
        const balance = await apiGet<{ wallet: WalletRecord }>('/v1/partner/wallet');
        setWallet(balance.wallet);
      } else if (view === 'wallet') {
        const [balance, entries] = await Promise.all([
          apiGet<{ wallet: WalletRecord }>('/v1/partner/wallet'),
          apiGet<Rows>('/v1/partner/wallet/ledger'),
        ]);
        setWallet(balance.wallet);
        setRows(entries.items);
        setLedger(entries.items);
      } else if (view === 'team') {
        const [network, members] = await Promise.all([
          apiGet<{ items: Row[] }>('/v1/partner/network'),
          apiGet<{ items: Row[] }>('/v1/partner/team'),
        ]);
        setRows(network.items);
        setTeam(members.items);
      } else if (view === 'notices') {
        const result = await apiGet<{ items: Row[] }>('/v1/partner/notices');
        setRows(result.items);
      } else if (config?.endpoint) {
        const result = await apiGet<Rows | Row[]>(config.endpoint);
        setRows(Array.isArray(result) ? result : result.items);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this partner workspace.');
    }
  }, [config, view]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const service = services.find((item) => item._id === form.get('serviceId'));
    if (!service) {
      setBusy(false);
      setError('Choose an available service.');
      return;
    }
    try {
      const result = await apiPost<{ order: OrderRecord; trackingToken: string }>('/v1/orders', {
        serviceId: service._id,
        customerName: form.get('customerName'),
        amountPaise: service.basePricePaise,
      });
      setNotice(
        `Order ${result.order.orderNumber} placed. Customer tracking token: ${result.trackingToken}`,
      );
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place order.');
    } finally {
      setBusy(false);
    }
  }

  async function requestTopup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      const amountPaise = Money.fromRupeesString(String(form.get('amount') ?? '')).paise;
      await apiPost('/v1/partner/wallet/topups', { amountPaise, reference: form.get('reference') });
      setNotice('Top-up request sent to finance for review.');
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit top-up request.');
    } finally {
      setBusy(false);
    }
  }

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    try {
      await apiPost('/v1/partner/customers', {
        fullName: form.get('fullName'),
        mobile: form.get('mobile'),
        email: form.get('email'),
        consent: form.get('consent') === 'on',
      });
      setNotice('Customer added to your book.');
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add customer.');
    }
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    try {
      await apiPost('/v1/partner/tickets', {
        subject: form.get('subject'),
        category: form.get('category'),
        message: form.get('message'),
      });
      setNotice('Support request created.');
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create support request.');
    }
  }

  async function invitePartner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    try {
      const result = await apiPost<{ applicationId: string }>('/v1/partner/invites', {
        businessName: form.get('businessName'),
        ownerName: form.get('ownerName'),
        email: form.get('email'),
        mobile: form.get('mobile'),
        tier: form.get('tier'),
      });
      setNotice(
        `Partner invitation created. Application ${result.applicationId} is ready for email verification.`,
      );
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not invite partner.');
    }
  }

  async function inviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    try {
      const result = await apiPost<{ invitationToken: string }>('/v1/partner/team', {
        name: form.get('name'),
        email: form.get('email'),
        staffPermissions: form.getAll('staffPermissions'),
      });
      setNotice(
        `Staff invitation is ready. Demo invitation token: ${result.invitationToken}. Email delivery is simulated.`,
      );
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not invite team member.');
    }
  }

  async function toggleStaff(row: Row) {
    const status = row.status === 'active' ? 'disabled' : 'active';
    try {
      await apiPatch(`/v1/partner/team/${String(row._id)}`, { status });
      setNotice(
        `${String(row.email)} ${status === 'active' ? 'activated in the demo' : 'disabled'}.`,
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update team member.');
    }
  }

  async function transitionOrder(row: Row) {
    if (row.status !== 'query') return;
    const answer = window.prompt('Add your response to the operations query');
    if (!answer?.trim()) return;
    try {
      await apiPost(`/v1/orders/${String(row._id)}/query`, { response: answer.trim() });
      setNotice('Your response was sent to operations.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send response.');
    }
  }

  if (!config && view !== 'dashboard')
    return (
      <main className="portal">
        <div className="empty-state">
          <strong>Page not found</strong>
          <a href="/partner">Return to your dashboard</a>
        </div>
      </main>
    );
  const filteredRows = rows.filter(
    (row) => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="portal admin-page">
      {view === 'dashboard' ? (
        <>
          <PageHeading
            eyebrow="Partner workspace"
            title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
            description="Your service desk at a glance. Pick up where you left off with customers and orders."
            breadcrumb={['Partner', 'Home']}
          />
          <section className="partner-summary-grid">
            <article className="card">
              <span>Available wallet</span>
              <strong>{money(wallet?.balancePaise)}</strong>
              <small>{user?.partner?.businessName ?? 'Partner account'}</small>
            </article>
            <article className="card">
              <span>Orders</span>
              <strong>
                {String(ledger.find((item) => item.metric === 'Orders')?.value ?? '—')}
              </strong>
              <small>Across your authorized network</small>
            </article>
            <article className="card">
              <span>Open support</span>
              <strong>
                {String(ledger.find((item) => item.metric === 'Open tickets')?.value ?? '—')}
              </strong>
              <small>Requests needing follow-up</small>
            </article>
          </section>
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Recent orders</h2>
                <p>Latest requests in your network.</p>
              </div>
              <a className="text-button" href="/partner/orders">
                All orders →
              </a>
            </div>
            <GenericTable
              rows={rows}
              columns={['orderNumber', 'customerName', 'status', 'totalPaise', 'updatedAt']}
            />
          </section>
          <div className="partner-quick-links">
            {[
              ['/partner/services', 'Place an order'],
              ['/partner/wallet', 'Request a top-up'],
              ['/partner/customers', 'Add a customer'],
              ['/partner/tickets', 'Contact support'],
            ].map(([href, text]) => (
              <a className="card" key={href} href={href}>
                {text} <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <>
          <PageHeading
            eyebrow="Partner workspace"
            title={config!.title}
            description={config!.description}
            breadcrumb={['Partner', config!.title]}
          />
          {notice ? <p role="status">{notice}</p> : null}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {view === 'services' ? (
            <section className="partner-service-grid">
              {services.map((service) => (
                <article className="card partner-service-card" key={service._id}>
                  <span className="eyebrow">{service.category}</span>
                  <h2>{service.name}</h2>
                  <p className="muted">Service request · GST {service.gstRateBps / 100}%</p>
                  <strong>{money(service.basePricePaise)}</strong>
                  <form className="form" onSubmit={createOrder}>
                    <input type="hidden" name="serviceId" value={service._id} />
                    <label className="field">
                      <span>Customer name</span>
                      <input name="customerName" minLength={2} maxLength={120} required />
                    </label>
                    <button
                      className="button"
                      disabled={busy || !wallet || wallet.balancePaise < service.basePricePaise}
                    >
                      {busy ? 'Placing…' : 'Place order'}
                    </button>
                    {wallet && wallet.balancePaise < service.basePricePaise ? (
                      <small className="muted">Top up your wallet to order this service.</small>
                    ) : null}
                  </form>
                </article>
              ))}
            </section>
          ) : null}
          {view === 'wallet' ? (
            <>
              <section className="partner-summary-grid">
                <article className="card">
                  <span>Wallet balance</span>
                  <strong>{money(wallet?.balancePaise)}</strong>
                  <small>INR · integer paise ledger</small>
                </article>
                <article className="card">
                  <span>Ledger entries</span>
                  <strong>{ledger.length}</strong>
                  <small>Credits and debits append to history</small>
                </article>
              </section>
              <section className="card">
                <h2>Request a top-up</h2>
                <form className="form inline-form" onSubmit={requestTopup}>
                  <label className="field">
                    <span>Amount (₹)</span>
                    <input name="amount" type="number" min="1" step="0.01" required />
                  </label>
                  <label className="field">
                    <span>Bank reference</span>
                    <input name="reference" maxLength={80} required />
                  </label>
                  <button className="button" disabled={busy}>
                    Send for approval
                  </button>
                </form>
              </section>
              <section className="card">
                <h2>Wallet statement</h2>
                <GenericTable
                  rows={ledger}
                  columns={[
                    'createdAt',
                    'type',
                    'description',
                    'amountPaise',
                    'balanceAfterPaise',
                    'referenceId',
                  ]}
                />
              </section>
            </>
          ) : null}
          {view === 'orders' ? (
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Order book</h2>
                  <p>
                    {filteredRows.length} of {rows.length} orders
                  </p>
                </div>
                <a className="button secondary small" href="/partner/services">
                  New order
                </a>
              </div>
              <label className="field search-field">
                <span>Search orders</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order number, customer, or status"
                />
              </label>
              <GenericTable
                rows={filteredRows}
                columns={[
                  'orderNumber',
                  'customerName',
                  'serviceId',
                  'status',
                  'totalPaise',
                  'updatedAt',
                ]}
                renderAction={(row) =>
                  row.status === 'query' ? (
                    <button className="text-button" onClick={() => void transitionOrder(row)}>
                      Respond to query
                    </button>
                  ) : (
                    <a
                      className="text-button"
                      href={`/order-status?token=demo-order-${String(row._id)}`}
                    >
                      Track
                    </a>
                  )
                }
              />
            </section>
          ) : null}
          {view === 'customers' ? (
            <>
              <section className="card">
                <h2>Add a customer</h2>
                <form className="form inline-form" onSubmit={createCustomer}>
                  <label className="field">
                    <span>Full name</span>
                    <input name="fullName" minLength={2} required />
                  </label>
                  <label className="field">
                    <span>Mobile</span>
                    <input name="mobile" type="tel" pattern="\+?[0-9 ]{10,16}" required />
                  </label>
                  <label className="field">
                    <span>Email (optional)</span>
                    <input name="email" type="email" />
                  </label>
                  <label className="check-field">
                    <input name="consent" type="checkbox" required /> Customer consent recorded
                  </label>
                  <button className="button">Add customer</button>
                </form>
              </section>
              <section className="card">
                <h2>Customer book</h2>
                <label className="field search-field">
                  <span>Search customers</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
                <GenericTable
                  rows={filteredRows}
                  columns={['fullName', 'mobile', 'email', 'createdAt']}
                />
              </section>
            </>
          ) : null}
          {view === 'tickets' ? (
            <>
              <section className="card">
                <h2>Open a support request</h2>
                <form className="form" onSubmit={createTicket}>
                  <label className="field">
                    <span>Subject</span>
                    <input name="subject" maxLength={160} required />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select name="category">
                      <option value="payments">Payments</option>
                      <option value="service">Service request</option>
                      <option value="technical">Technical</option>
                      <option value="account">Account</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Details</span>
                    <textarea name="message" maxLength={2000} required />
                  </label>
                  <button className="button">Create ticket</button>
                </form>
              </section>
              <section className="card">
                <h2>Recent support requests</h2>
                <GenericTable
                  rows={rows}
                  columns={['ticketNumber', 'subject', 'priority', 'status', 'createdAt']}
                />
              </section>
            </>
          ) : null}
          {view === 'team' ? (
            <>
              <section className="card">
                <h2>Invite a lower-tier partner</h2>
                <p className="muted">
                  Invitations are limited to the next tier in your hierarchy. The applicant
                  completes their own public application.
                </p>
                <form className="form inline-form" onSubmit={invitePartner}>
                  <label className="field">
                    <span>Business name</span>
                    <input name="businessName" required />
                  </label>
                  <label className="field">
                    <span>Owner name</span>
                    <input name="ownerName" required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" required />
                  </label>
                  <label className="field">
                    <span>Mobile</span>
                    <input name="mobile" type="tel" required />
                  </label>
                  <label className="field">
                    <span>Partner tier</span>
                    <select name="tier">
                      <option
                        value={
                          user?.partner?.tier === 'master_distributor' ? 'distributor' : 'retailer'
                        }
                      >
                        {user?.partner?.tier === 'master_distributor' ? 'Distributor' : 'Retailer'}
                      </option>
                    </select>
                  </label>
                  <button className="button">Send invitation</button>
                </form>
              </section>
              <section className="card">
                <h2>Invite staff</h2>
                <p className="muted">
                  Choose a limited permission set. Invitation delivery is simulated in this browser
                  demo.
                </p>
                <form className="form inline-form" onSubmit={inviteStaff}>
                  <label className="field">
                    <span>Team member name</span>
                    <input name="name" minLength={2} required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" required />
                  </label>
                  <fieldset className="permission-checks">
                    <legend>Staff access</legend>
                    {[
                      ['orders.read', 'View orders'],
                      ['orders.create', 'Create orders'],
                      ['wallet.read', 'View wallet'],
                      ['customers.read', 'View customers'],
                      ['tickets.read', 'View support'],
                    ].map(([permission, title]) => (
                      <label key={permission}>
                        <input type="checkbox" name="staffPermissions" value={permission} />
                        {title}
                      </label>
                    ))}
                  </fieldset>
                  <button className="button">Create staff invitation</button>
                </form>
                <GenericTable
                  rows={team}
                  columns={['name', 'email', 'role', 'status', 'createdAt']}
                  renderAction={(row) =>
                    row.role === 'owner' ? (
                      'Owner'
                    ) : (
                      <button className="text-button" onClick={() => void toggleStaff(row)}>
                        {row.status === 'active' ? 'Disable' : 'Activate demo user'}
                      </button>
                    )
                  }
                />
              </section>
              <section className="card">
                <h2>Your network</h2>
                <GenericTable
                  rows={rows}
                  columns={['businessName', 'code', 'tier', 'city', 'status']}
                />
              </section>
            </>
          ) : null}
          {view === 'notices' ? (
            <section className="partner-notice-list">
              {rows.map((row) => (
                <article className="card" key={String(row.id ?? row._id)}>
                  <span className="eyebrow">Head office notice · {when(row.createdAt)}</span>
                  <h2>{String(row.title)}</h2>
                  <p>{String(row.body)}</p>
                </article>
              ))}
              {!rows.length ? (
                <div className="empty-state">
                  <strong>No new notices</strong>
                  <span>Head office updates will appear here.</span>
                </div>
              ) : null}
            </section>
          ) : null}
          {view === 'commissions' || view === 'payouts' ? (
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>{config!.title}</h2>
                  <p>{rows.length} records</p>
                </div>
              </div>
              <GenericTable rows={rows} />
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

function GenericTable({
  rows,
  columns,
  renderAction,
}: {
  rows: Row[];
  columns?: string[];
  renderAction?: (row: Row) => React.ReactNode;
}) {
  const keys =
    columns ??
    Object.keys(rows[0] ?? {})
      .filter((key) => !['partnerId', 'path', 'metadata'].includes(key))
      .slice(0, 7);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{label(key)}</th>
            ))}
            {renderAction ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row._id ?? row.id ?? index)}>
              {keys.map((key) => (
                <td key={key}>
                  {key.toLowerCase().includes('paise') ||
                  key.toLowerCase().includes('amount') ||
                  key.toLowerCase().includes('balance') ? (
                    money(row[key])
                  ) : key.toLowerCase().includes('date') || key.toLowerCase().includes('at') ? (
                    when(row[key])
                  ) : key.toLowerCase().includes('status') ||
                    key.toLowerCase().includes('priority') ? (
                    <span className={`status-badge ${String(row[key])}`}>{label(row[key])}</span>
                  ) : (
                    label(row[key])
                  )}
                </td>
              ))}
              {renderAction ? <td>{renderAction(row)}</td> : null}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={keys.length + (renderAction ? 1 : 0)}>
                <div className="empty-state">
                  <strong>No records yet</strong>
                  <span>Your activity will appear here as it happens.</span>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
