import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendLedgerEntry,
  authorizeMockAction,
  canTransitionOrder,
  scopedPartnerIds,
} from './mock-rules.js';
import { OrderStatus } from './status.js';

test('mock adapter permission contract returns 401 and 403 for forbidden actions', () => {
  assert.equal(authorizeMockAction(null, 'orders.create')?.status, 401);
  assert.equal(
    authorizeMockAction({ id: 'u1', permissions: ['orders.read'] }, 'orders.create')?.status,
    403,
  );
  assert.equal(
    authorizeMockAction({ id: 'u1', permissions: ['orders.create'] }, 'orders.create'),
    null,
  );
});

test('partner data is restricted to the actor subtree', () => {
  const partners = [
    { id: 'self', path: ['root', 'self'] },
    { id: 'child', path: ['root', 'self', 'child'] },
    { id: 'other', path: ['root', 'other'] },
  ];
  assert.deepEqual(scopedPartnerIds('self', partners), ['self', 'child']);
});

test('order lifecycle only allows roadmap transitions', () => {
  assert.equal(canTransitionOrder(OrderStatus.submitted, OrderStatus.inProcess), true);
  assert.equal(canTransitionOrder(OrderStatus.submitted, OrderStatus.completed), false);
  assert.equal(canTransitionOrder(OrderStatus.completed, OrderStatus.cancelled), false);
});

test('ledger entries append immutable positive paise and reject duplicate IDs', () => {
  const first = { id: 'l1', direction: 'credit' as const, amountPaise: 25_000, referenceId: 'r1' };
  const ledger = appendLedgerEntry([], first);
  assert.equal(ledger.length, 1);
  assert.ok(Object.isFrozen(ledger[0]));
  assert.throws(() => appendLedgerEntry(ledger, first), /unique/);
  assert.throws(
    () => appendLedgerEntry(ledger, { ...first, id: 'l2', amountPaise: 0 }),
    /positive integer paise/,
  );
});
