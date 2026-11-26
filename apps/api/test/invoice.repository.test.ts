import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { scopeToActor } from '../src/common/actor';
import { InvoiceRepository } from '../src/modules/billing/invoice.repository';

test('invoice repository denies actors without billing read permission', () => {
  const repository = new InvoiceRepository();
  assert.throws(
    () =>
      repository.listInvoices({
        userId: 'partner-user',
        kind: 'partner',
        roleKeys: ['retailer'],
        permissions: new Set(),
        partnerId: 'partner-a',
        partnerPath: ['partner-a'],
      }),
    ForbiddenException,
  );
});

test('invoice and payment Mongo filters constrain results to the actor subtree', () => {
  const actor = {
    userId: 'partner-user',
    kind: 'partner' as const,
    roleKeys: ['distributor'],
    permissions: new Set(['invoices.read']),
    partnerId: 'partner-root',
    partnerPath: ['partner-root', 'partner-child'],
  };
  assert.deepEqual(scopeToActor(actor, { status: 'issued' }, 'partnerId'), {
    $and: [{ status: 'issued' }, { partnerId: { $in: ['partner-root', 'partner-child'] } }],
  });
});
