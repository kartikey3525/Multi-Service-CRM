import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose from 'mongoose';
import {
  InvoiceNumberService,
  financialYearFor,
} from '../src/modules/billing/invoice-number.service';
import { InvoiceRepository } from '../src/modules/billing/invoice.repository';
import { InvoiceModel, NumberSequenceModel, PaymentModel } from '../src/modules/billing/models';
import type { Actor } from '../src/common/actor';

const testUri = process.env.MONGODB_TEST_URI;

test(
  'parallel invoice issuing allocates gapless unique numbers in the invoice transaction',
  { skip: testUri ? false : 'Set MONGODB_TEST_URI to a test-only MongoDB replica set.' },
  async () => {
    if (!testUri) throw new Error('MONGODB_TEST_URI is required.');
    const parsedUri = new URL(testUri);
    assert.match(parsedUri.pathname, /(?:^|_)test(?:_|$)/i);
    const databaseName = `crm_test_billing_${randomUUID().replaceAll('-', '')}`;
    parsedUri.pathname = `/${databaseName}`;
    await mongoose.connect(parsedUri.toString());
    try {
      await Promise.all([InvoiceModel.init(), NumberSequenceModel.init(), PaymentModel.init()]);
      const repository = new InvoiceRepository();
      const service = new InvoiceNumberService(repository);
      const issuedAt = new Date('2026-11-26T12:00:00.000Z');
      const financialYear = financialYearFor(issuedAt);
      const partnerId = new mongoose.Types.ObjectId().toHexString();
      const actor: Actor = {
        userId: new mongoose.Types.ObjectId().toHexString(),
        kind: 'partner',
        roleKeys: ['retailer'],
        permissions: new Set(['invoices.issue', 'invoices.read']),
        partnerId,
        partnerPath: [partnerId],
      };
      const issueCount = 30;
      const issued = await Promise.all(
        Array.from({ length: issueCount }, (_, index) =>
          service.issueInvoice(
            actor,
            {
              kind: 'plan',
              partnerId,
              subtotalPaise: 10_000 + index,
              taxPaise: 1_800,
              totalPaise: 11_800 + index,
              lines: [
                {
                  description: `Plan ${index}`,
                  quantity: 1,
                  unitPaise: 10_000 + index,
                  gstRateBp: 1_800,
                },
              ],
            },
            issuedAt,
          ),
        ),
      );
      const numbers = issued.map((invoice) => invoice.number).sort();
      assert.equal(new Set(numbers).size, issueCount);
      assert.deepEqual(
        numbers,
        Array.from(
          { length: issueCount },
          (_, index) => `${financialYear}/${String(index + 1).padStart(6, '0')}`,
        ),
      );
      const otherPartnerId = new mongoose.Types.ObjectId().toHexString();
      const otherActor: Actor = {
        ...actor,
        userId: new mongoose.Types.ObjectId().toHexString(),
        partnerId: otherPartnerId,
        partnerPath: [otherPartnerId],
      };
      await service.issueInvoice(
        otherActor,
        {
          kind: 'plan',
          partnerId: otherPartnerId,
          subtotalPaise: 1_000,
          taxPaise: 180,
          totalPaise: 1_180,
          lines: [
            { description: 'Other partner plan', quantity: 1, unitPaise: 1_000, gstRateBp: 1_800 },
          ],
        },
        issuedAt,
      );
      assert.equal(await InvoiceModel.countDocuments({}), issueCount + 1);
      const visibleInvoices = await repository.listInvoices(actor).lean();
      assert.equal(visibleInvoices.length, issueCount);
      assert.equal(
        visibleInvoices.some((invoice) => String(invoice.partnerId) === otherPartnerId),
        false,
      );
      await PaymentModel.create([
        {
          invoiceId: issued[0]!._id,
          partnerId: new mongoose.Types.ObjectId(partnerId),
          amountPaise: 11_800,
          method: 'bank_transfer',
          reference: 'OWN-REFERENCE',
          recordedBy: new mongoose.Types.ObjectId(actor.userId),
          paidAt: issuedAt,
        },
        {
          invoiceId: (await InvoiceModel.findOne({ partnerId: otherPartnerId }))!._id,
          partnerId: new mongoose.Types.ObjectId(otherPartnerId),
          amountPaise: 1_180,
          method: 'bank_transfer',
          reference: 'OTHER-REFERENCE',
          recordedBy: new mongoose.Types.ObjectId(otherActor.userId),
          paidAt: issuedAt,
        },
      ]);
      const visiblePayments = await repository
        .listPayments({ ...actor, permissions: new Set(['payments.read']) })
        .lean();
      assert.equal(visiblePayments.length, 1);
      assert.equal(String(visiblePayments[0]!.partnerId), partnerId);
      assert.equal(await NumberSequenceModel.countDocuments(), 1);
      assert.equal(
        (await NumberSequenceModel.findOne({ key: 'invoice', financialYear }))?.nextValue,
        issueCount + 1,
      );
    } finally {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);
