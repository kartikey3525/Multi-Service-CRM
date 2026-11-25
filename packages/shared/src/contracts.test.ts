import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvoiceClientSchema,
  LearningProgressSchema,
  PartnerLeadPageSchema,
  PartnerLeadSchema,
  PartnerToolInvoiceSchema,
  PartnerUserSchema,
} from './domain.js';
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

test('partner leads, public capture pages, and learning progress have stable shared contracts', () => {
  const now = '2026-11-25T10:00:00.000Z';
  const partnerId = '64a100000000000000000003';
  assert.equal(
    PartnerLeadSchema.parse({
      _id: '64ac00000000000000000001',
      partnerId,
      name: 'Asha Rao',
      businessName: 'Rao Textiles',
      mobile: '+919800112233',
      source: 'Referral',
      stage: 'new',
      createdAt: now,
      updatedAt: now,
    }).stage,
    'new',
  );
  assert.equal(
    PartnerLeadPageSchema.parse({
      _id: '64ad00000000000000000001',
      partnerId,
      title: 'GST help',
      headline: 'Support for your GST registration',
      description: 'Tell us what help you need.',
      slug: 'gst-help-12345',
      status: 'published',
      createdAt: now,
    }).status,
    'published',
  );
  assert.equal(
    LearningProgressSchema.parse({
      userId: '64a100000000000000000002',
      completed: ['onboarding', 'documents'],
    }).completed.length,
    2,
  );
  assert.equal(PartnerLeadPageSchema.safeParse({ slug: '../private' }).success, false);
  for (const stage of ['new', 'contacted', 'qualified', 'won', 'lost'])
    assert.equal(
      PartnerLeadSchema.safeParse({
        _id: '64ac00000000000000000001',
        partnerId,
        name: 'Asha Rao',
        businessName: 'Rao Textiles',
        mobile: '+919800112233',
        source: 'Referral',
        stage,
        createdAt: now,
        updatedAt: now,
      }).success,
      true,
    );
  assert.equal(
    LearningProgressSchema.parse({ userId: partnerId, completed: [] }).quizScores.length,
    0,
  );
  assert.equal(
    PartnerLeadSchema.safeParse({
      _id: '64ac00000000000000000001',
      partnerId,
      name: 'Asha Rao',
      businessName: 'Rao Textiles',
      mobile: '+919800112233',
      source: 'Referral',
      stage: 'converted',
      createdAt: now,
      updatedAt: now,
    }).success,
    false,
  );
  assert.equal(
    InvoiceClientSchema.parse({
      _id: '64b000000000000000000001',
      partnerId,
      name: 'Anaya Deshmukh',
      businessName: 'Anaya Studio',
      email: null,
      mobile: '+919876540001',
      state: 'Maharashtra',
      gstin: null,
      createdAt: now,
      updatedAt: now,
    }).state,
    'Maharashtra',
  );
  assert.equal(
    PartnerToolInvoiceSchema.parse({
      _id: '64b100000000000000000001',
      partnerId,
      clientId: '64b000000000000000000001',
      number: 'SN-MH-2048/2026-27/0001',
      issueDate: '2026-04-10',
      lines: [{ description: 'Service', quantity: 1, unitAmountPaise: 10001, gstRateBps: 1800 }],
      subtotalPaise: 10001,
      cgstPaise: 900,
      sgstPaise: 900,
      igstPaise: 0,
      totalPaise: 11801,
      createdAt: now,
    }).totalPaise,
    11801,
  );
});
