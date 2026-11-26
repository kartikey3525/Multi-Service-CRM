import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceModel, PlanModel } from '../src/modules/billing/models';

test('plans and invoices reject fractional paise and invalid invoice totals', async () => {
  const plan = new PlanModel({
    key: 'retailer',
    name: 'Retailer',
    tier: 'retailer',
    priceMinPaise: 10_000.5,
    priceMaxPaise: 20_000,
    gstRateBp: 1_800,
    features: {},
    active: true,
  });
  const planError = await plan.validate().then(
    () => null,
    (error: { errors: Record<string, unknown> }) => error,
  );
  assert.ok(planError?.errors.priceMinPaise);

  const invoice = new InvoiceModel({
    number: '2026-27/000001',
    financialYear: '2026-27',
    kind: 'plan',
    partnerId: '6a33b6b6b6b6b6b6b6b6b6b6',
    lines: [{ description: 'Retailer', quantity: 1, unitPaise: 1_000, gstRateBp: 1_800 }],
    subtotalPaise: 1_000,
    taxPaise: 180,
    totalPaise: 1_181,
    status: 'issued',
    issuedAt: new Date('2026-11-26T12:00:00.000Z'),
  });
  const invoiceError = await invoice.validate().then(
    () => null,
    (error: { errors: Record<string, { message: string }> }) => error,
  );
  assert.match(invoiceError?.errors.totalPaise?.message ?? '', /subtotal plus tax/);
});
