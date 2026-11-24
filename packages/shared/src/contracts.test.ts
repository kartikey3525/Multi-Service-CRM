import assert from 'node:assert/strict';
import test from 'node:test';
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
