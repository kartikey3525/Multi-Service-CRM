import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeToActor } from '../src/common/actor';

test('admin queries preserve their existing criteria', () => {
  const criteria = { status: 'active' };
  assert.equal(
    scopeToActor(
      { userId: 'admin', kind: 'admin', roleKeys: ['super_admin'], permissions: new Set() },
      criteria,
    ),
    criteria,
  );
});

test('partner query scope includes only its authorized path', () => {
  const actor = {
    userId: 'partner-user',
    kind: 'partner' as const,
    roleKeys: ['distributor'],
    permissions: new Set<string>(),
    partnerPath: ['root', 'self', 'child'],
  };
  assert.deepEqual(scopeToActor(actor, { status: 'active' }), {
    $and: [{ status: 'active' }, { partnerId: { $in: ['root', 'self', 'child'] } }],
  });
});

test('partner scope fails closed until M2 resolves its hierarchy', () => {
  const actor = {
    userId: 'partner-user',
    kind: 'partner' as const,
    roleKeys: ['retailer'],
    permissions: new Set<string>(),
  };
  assert.deepEqual(scopeToActor(actor, { status: 'active' }), {
    $and: [{ status: 'active' }, { partnerId: { $in: [] } }],
  });
});
