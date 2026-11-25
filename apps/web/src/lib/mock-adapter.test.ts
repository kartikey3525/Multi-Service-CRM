import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import {
  AuditRecordSchema,
  CustomerSchema,
  KycDocumentSchema,
  LedgerEntrySchema,
  NotificationSchema,
  OrderEventSchema,
  OrderSchema,
  PartnerSchema,
  PayoutSchema,
  ServiceSchema,
  TicketSchema,
  WalletSchema,
} from '@franchise-crm/shared';
import { mockApiFetch } from './mock-adapter';
import { demoApplications, demoDocuments, demoLoginUsers, demoPartners } from './demo-fixtures';
import {
  demoAudit,
  demoCustomers,
  demoLedger,
  demoNotifications,
  demoOrderEvents,
  demoOrders,
  demoPayouts,
  demoServices,
  demoTickets,
  demoWallets,
} from './demo-business-fixtures';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage, location: { reload() {} } },
});

async function call(path: string, method = 'GET', body?: unknown) {
  const response = await mockApiFetch(`http://demo.local/api/v1${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('franchise-crm-mock-error-rate', '0');
});

test('mock seed contains 150 orders and rejects unauthenticated admin and partner access', async () => {
  assert.equal((await call('/orders')).status, 401);
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const orders = await call('/orders?pageSize=200');
  assert.equal(orders.status, 200);
  assert.equal((orders.body as { total: number }).total, 150);
  assert.equal((await call('/admin/audit')).status, 403);
});

test('mock partner can create an order which debits integer paise and appends immutable history', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const services = await call('/services');
  const serviceId = (services.body as { items: Array<{ _id: string }> }).items[0]!._id;
  const created = await call('/orders', 'POST', {
    serviceId,
    customerName: 'Asha Kulkarni',
    amountPaise: 45_000,
  });
  assert.equal(created.status, 201);
  const order = (created.body as { order: { _id: string; amountPaise: number; status: string } })
    .order;
  assert.equal(order.amountPaise, 45_000);
  assert.equal(order.status, 'submitted');
  const ledger = await call('/partner/wallet/ledger');
  assert.ok(
    (ledger.body as { items: Array<{ referenceId: string; type: string }> }).items.some(
      (entry) => entry.referenceId === order._id && entry.type === 'debit',
    ),
  );
  assert.equal(
    (await call(`/orders/${order._id}/status`, 'PUT', { status: 'completed' })).status,
    403,
  );
});

test('admin transitions an order only through the roadmap lifecycle and audits the action', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const services = await call('/services');
  const serviceId = (services.body as { items: Array<{ _id: string }> }).items[0]!._id;
  const created = await call('/orders', 'POST', { serviceId, amountPaise: 45_000 });
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const id = (created.body as { order: { _id: string } }).order._id;
  assert.equal((await call(`/orders/${id}/status`, 'PUT', { status: 'completed' })).status, 409);
  assert.equal((await call(`/orders/${id}/status`, 'PUT', { status: 'assigned' })).status, 200);
  const audit = await call('/admin/audit');
  assert.ok(
    (audit.body as { items: Array<{ action: string; entityId: string }> }).items.some(
      (item) => item.action === 'order.status_changed' && item.entityId === id,
    ),
  );
});

test('mock partner network is scoped to its own hierarchy', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000001');
  const network = await call('/partner/network');
  assert.equal(network.status, 200);
  assert.ok(
    (network.body as { items: Array<{ id: string }> }).items.every(
      (partner) => partner.id !== '64a100000000000000000003',
    ),
  );
});

test('seed fixtures match shared Mongo record schemas and roadmap counts', () => {
  assert.equal(demoLoginUsers.filter((user) => user.kind === 'admin').length, 6);
  assert.equal(demoPartners.filter((partner) => partner.tier === 'master_distributor').length, 2);
  assert.equal(demoPartners.filter((partner) => partner.tier === 'distributor').length, 6);
  assert.equal(demoPartners.filter((partner) => partner.tier === 'retailer').length, 25);
  assert.equal(demoOrders.length, 150);
  assert.equal(demoLedger.length, 99);
  for (const item of demoPartners)
    PartnerSchema.parse({
      ...item,
      _id: item.id,
      legalName: item.businessName,
      ownerUserId: demoLoginUsers[0]!.id,
      pin: '411001',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-25T00:00:00.000Z',
      path: [],
    });
  for (const item of demoOrders) OrderSchema.parse(item);
  for (const item of demoWallets) WalletSchema.parse(item);
  for (const item of demoLedger) LedgerEntrySchema.parse(item);
  for (const item of demoServices) ServiceSchema.parse(item);
  for (const item of demoPayouts) PayoutSchema.parse(item);
  for (const item of demoTickets) TicketSchema.parse(item);
  for (const item of demoCustomers) CustomerSchema.parse(item);
  for (const item of demoOrderEvents) OrderEventSchema.parse(item);
  for (const item of demoNotifications) NotificationSchema.parse(item);
  for (const item of demoAudit) AuditRecordSchema.parse(item);
  for (const item of demoDocuments)
    KycDocumentSchema.parse({
      _id: item.id,
      ownerType: 'partner',
      ownerId: demoPartners[0]!.id,
      docType: item.docType,
      objectKey: `private/${item.id}`,
      contentType: item.contentType,
      sizeBytes: item.sizeBytes,
      status: item.status,
      expiresAt: item.expiresAt ?? null,
      createdAt: '2026-11-20T10:00:00.000Z',
    });
  assert.ok(demoApplications.length >= 3);
});

test('approved wallet top-ups update balance through a new ledger credit and audit record', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const original = ((await call('/partner/wallet')).body as { wallet: { balancePaise: number } })
    .wallet.balancePaise;
  const requested = await call('/partner/wallet/topups', 'POST', {
    amountPaise: 80_000,
    reference: 'BANK-TEST-1',
  });
  assert.equal(requested.status, 201);
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const topups = await call('/admin/wallet/topups');
  const topupId = (requested.body as { topup: { id: string } }).topup.id;
  const pending = (topups.body as { items: Array<{ id: string }> }).items.find(
    (item) => item.id === topupId,
  )!;
  assert.equal((await call(`/admin/wallet/topups/${pending.id}/approve`, 'POST')).status, 201);
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  assert.equal(
    ((await call('/partner/wallet')).body as { wallet: { balancePaise: number } }).wallet
      .balancePaise,
    original + 80_000,
  );
  const ledger = await call('/partner/wallet/ledger');
  assert.ok(
    (ledger.body as { items: Array<{ referenceId: string; type: string }> }).items.some(
      (entry) => entry.referenceId === pending.id && entry.type === 'credit',
    ),
  );
});

test('admin workspace mock endpoints expose operations data and persist audited settings/content', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const [orders, commissions, ledger, payouts, tickets, roles, content] = await Promise.all([
    call('/admin/orders'),
    call('/admin/commissions'),
    call('/admin/ledger'),
    call('/admin/payouts'),
    call('/admin/tickets'),
    call('/admin/roles?kind=admin'),
    call('/admin/content'),
  ]);
  assert.equal((orders.body as { total: number }).total, 150);
  assert.ok((commissions.body as { items: unknown[] }).items.length > 0);
  assert.ok((ledger.body as { items: unknown[] }).items.length > 0);
  assert.ok((payouts.body as { items: unknown[] }).items.length > 0);
  assert.ok((tickets.body as { items: unknown[] }).items.length > 0);
  assert.equal((roles.body as unknown as unknown[]).length, 6);
  assert.ok((content.body as { items: unknown[] }).items.length > 0);
  assert.equal(
    (
      await call('/admin/content', 'POST', {
        title: 'Holiday hours',
        body: 'Support closes at 4 PM.',
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call('/admin/settings', 'PUT', {
        gstin: '27AABCS1234F1Z5',
        gstRateBps: 1800,
        intraState: true,
        invoicePrefix: 'SN',
      })
    ).status,
    200,
  );
  const audit = await call('/admin/audit');
  const actions = (audit.body as { items: Array<{ action: string }> }).items.map(
    (item) => item.action,
  );
  assert.ok(actions.includes('content.notice_published'));
  assert.ok(actions.includes('settings.updated'));
  assert.equal(
    (await call('/admin/settings', 'PUT', { gstin: 'invalid', gstRateBps: 1800 })).status,
    400,
  );
});

test('admin catalogue, commission, support, payout, and private order document actions persist and audit', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const services = (await call('/services')).body as { items: Array<{ _id: string }> };
  const serviceId = services.items[0]!._id;
  assert.equal(
    (
      await call(`/admin/services/${serviceId}`, 'PATCH', {
        basePricePaise: 51_000,
        gstRateBps: 1800,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('/admin/commissions/rules', 'PUT', {
        items: [{ tier: 'retailer', basisPoints: 225 }],
      })
    ).status,
    200,
  );
  const tickets = (await call('/admin/tickets')).body as { items: Array<{ _id: string }> };
  assert.equal(
    (await call(`/admin/tickets/${tickets.items[0]!._id}`, 'PATCH', { status: 'resolved' })).status,
    200,
  );
  const payouts = (await call('/admin/payouts')).body as {
    items: Array<{ _id: string; status: string }>;
  };
  const batched = payouts.items.find((item) => item.status === 'batched')!;
  assert.equal((await call(`/admin/payouts/${batched._id}/paid`, 'POST', {})).status, 201);
  const orders = (await call('/admin/orders')).body as {
    items: Array<{ _id: string; status: string }>;
  };
  const unassigned = orders.items.find((item) => item.status === 'submitted')!;
  assert.equal((await call(`/admin/orders/${unassigned._id}/assign`, 'POST', {})).status, 200);
  const fileBody = new FormData();
  fileBody.set('file', new File(['demo'], 'decision.pdf', { type: 'application/pdf' }));
  const uploaded = await mockApiFetch(
    `http://demo.local/api/v1/orders/${unassigned._id}/documents`,
    {
      method: 'POST',
      body: fileBody,
    },
  );
  assert.equal(uploaded.status, 201);
  const attachment = (await uploaded.json()) as {
    attachment: { visibility: string; name: string };
  };
  assert.equal(attachment.attachment.visibility, 'private');
  assert.equal(attachment.attachment.name, 'decision.pdf');
  const audit = (await call('/admin/audit')).body as { items: Array<{ action: string }> };
  for (const action of [
    'service.pricing_updated',
    'commission.rules_updated',
    'ticket.status_changed',
    'payout.marked_paid',
    'order.assigned',
    'order.document_attached',
  ])
    assert.ok(
      audit.items.some((item) => item.action === action),
      `${action} should be audited`,
    );
});

test('partner mock flows scope team, customer, ticket, notice, and KYC actions and audit mutations/views', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  assert.equal((await call('/partner/notices')).status, 200);
  const member = await call('/partner/team', 'POST', {
    name: 'Nikhil Rao',
    email: 'nikhil@example.demo',
    staffPermissions: ['orders.read'],
  });
  assert.equal(member.status, 201);
  const createdCustomer = await call('/partner/customers', 'POST', {
    fullName: 'Sana Merchant',
    mobile: '+919876543219',
    consent: true,
  });
  assert.equal(createdCustomer.status, 201);
  const ticket = await call('/partner/tickets', 'POST', {
    subject: 'Need help with documents',
    message: 'Please confirm file types.',
    category: 'service',
  });
  assert.equal(ticket.status, 201);
  assert.equal(
    (await call('/partner/customers', 'POST', { fullName: 'No consent', mobile: '+919876543218' }))
      .status,
    400,
  );

  const upload = new FormData();
  upload.set('ownerType', 'partner');
  upload.set(
    'ownerId',
    demoLoginUsers.find((item) => item.id === '64a100000000000000000002')!.partner!.id,
  );
  upload.set('docType', 'identity_proof');
  upload.set('file', new File(['proof'], 'identity.pdf', { type: 'application/pdf' }));
  const uploaded = await mockApiFetch('http://demo.local/api/v1/files/kyc', {
    method: 'POST',
    body: upload,
  });
  assert.equal(uploaded.status, 201);
  const documentId = ((await uploaded.json()) as { documentId: string }).documentId;
  const downloaded = await mockApiFetch(`http://demo.local/api/v1/files/kyc/${documentId}`);
  assert.equal(downloaded.status, 200);

  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000002');
  assert.equal(
    (
      await call('/partner/team', 'POST', {
        name: 'No authority',
        email: 'denied@example.demo',
        staffPermissions: ['orders.read'],
      })
    ).status,
    403,
  );
  assert.equal(
    (await mockApiFetch(`http://demo.local/api/v1/files/kyc/${documentId}`)).status,
    404,
  );

  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const audit = (await call('/admin/audit')).body as { items: Array<{ action: string }> };
  for (const action of [
    'partner.staff_invited',
    'customer.created',
    'ticket.created',
    'kyc.document_uploaded',
    'kyc.document_viewed',
  ])
    assert.ok(
      audit.items.some((item) => item.action === action),
      `${action} should be audited`,
    );
});
