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
