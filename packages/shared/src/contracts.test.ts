import assert from 'node:assert/strict';
import test from 'node:test';
import { PartnerUserSchema } from './domain.js';
import { Permission } from './permissions';
import {
  ApplicationStatus,
  InvoiceStatus,
  OrderStatus,
  PartnerStatus,
  PayoutStatus,
  TopupStatus,
} from './status';

test('permission keys remain unique and resource-action shaped', () => {
  const keys = Object.values(Permission);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^[a-z_]+\.[a-z_]+$/);
});

test('workflow status values preserve the roadmap contract', () => {
  assert.deepEqual(Object.values(ApplicationStatus), [
    'submitted',
    'needs_info',
    'approved',
    'rejected',
  ]);
  assert.deepEqual(Object.values(PartnerStatus), [
    'pending_payment',
    'active',
    'suspended',
    'closed',
  ]);
  assert.deepEqual(Object.values(InvoiceStatus), ['draft', 'issued', 'paid', 'void']);
  assert.deepEqual(Object.values(TopupStatus), ['pending', 'approved', 'rejected']);
  assert.deepEqual(Object.values(OrderStatus), [
    'draft',
    'submitted',
    'assigned',
    'in_process',
    'query',
    'completed',
    'rejected',
    'cancelled',
    'refunded',
  ]);
  assert.deepEqual(Object.values(PayoutStatus), ['requested', 'batched', 'paid', 'rejected']);
});

test('partner user membership validates the Mongo partner_users record shape', () => {
  assert.equal(
    PartnerUserSchema.parse({
      _id: '64ab00000000000000000001',
      partnerId: '64a100000000000000000003',
      userId: '64a100000000000000000002',
      role: 'staff',
      staffPermissions: ['orders.read', 'wallet.read'],
      status: 'disabled',
      createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-11-25T10:00:00.000Z',
    }).status,
    'disabled',
  );
  assert.equal(PartnerUserSchema.safeParse({ role: 'owner', staffPermissions: [] }).success, false);
});
