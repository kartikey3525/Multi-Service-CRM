import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import {
  AuditRecordSchema,
  CustomerSchema,
  KycDocumentSchema,
  LedgerEntrySchema,
  LearningProgressSchema,
  InvoiceClientSchema,
  PartnerToolInvoiceSchema,
  NotificationSchema,
  OrderEventSchema,
  OrderSchema,
  PartnerLeadPageSchema,
  PartnerLeadSchema,
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

async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
) {
  const response = await mockApiFetch(`http://demo.local/api/v1${path}`, {
    method,
    ...(headers ? { headers } : {}),
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

test('dashboard data endpoints return seeded summaries and role-scoped partner records', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const [partnerOrders, wallet, partnerTickets] = await Promise.all([
    call('/orders?pageSize=100'),
    call('/partner/wallet'),
    call('/partner/tickets'),
  ]);
  assert.equal(partnerOrders.status, 200);
  assert.ok((partnerOrders.body as { items: unknown[] }).items.length > 0);
  assert.equal(wallet.status, 200);
  assert.ok((wallet.body as { wallet: { balancePaise: number } }).wallet.balancePaise >= 0);
  assert.equal(partnerTickets.status, 200);

  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const [partners, applications, orders, topups, tickets] = await Promise.all([
    call('/admin/partners'),
    call('/admin/applications'),
    call('/admin/orders'),
    call('/admin/wallet/topups'),
    call('/admin/tickets'),
  ]);
  for (const response of [partners, applications, orders, topups, tickets])
    assert.equal(response.status, 200);
  assert.ok((orders.body as { items: unknown[] }).items.length > 0);
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

test('partner leads, learning progress, and lead pages persist with permission, scope, and audit checks', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');

  const initialLeads = await call('/partner/leads');
  assert.equal(initialLeads.status, 200);
  assert.equal((initialLeads.body as { total: number }).total, 3);
  for (const lead of (initialLeads.body as { items: unknown[] }).items)
    PartnerLeadSchema.parse(lead);
  assert.equal(
    (
      await call('/partner/leads', 'POST', {
        name: 'Maya Nair',
        businessName: 'Nair Studio',
        mobile: '+919876541234',
        consent: false,
      })
    ).status,
    400,
  );
  const created = await call('/partner/leads', 'POST', {
    name: 'Maya Nair',
    businessName: 'Nair Studio',
    mobile: '+919876541234',
    source: 'Referral',
    consent: true,
  });
  assert.equal(created.status, 201);
  const leadId = (created.body as { lead: { _id: string } }).lead._id;
  PartnerLeadSchema.parse((created.body as { lead: unknown }).lead);
  assert.equal(
    (await call(`/partner/leads/${leadId}`, 'PATCH', { stage: 'contacted' })).status,
    200,
  );

  const createdPage = await call('/partner/lead-pages', 'POST', {
    title: 'GST support',
    headline: 'Get help with your GST registration',
    description: 'Share your details and we will explain the next steps.',
  });
  assert.equal(createdPage.status, 201);
  const page = (createdPage.body as { page: { _id: string; slug: string } }).page;
  PartnerLeadPageSchema.parse(page);
  assert.match(page.slug, /^gst-support-/);
  assert.equal((await call(`/public/lead-pages/${page.slug}`)).status, 404);
  assert.equal(
    (await call(`/partner/lead-pages/${page._id}`, 'PATCH', { status: 'published' })).status,
    200,
  );
  assert.equal((await call(`/public/lead-pages/${page.slug}`)).status, 200);
  assert.equal(
    (
      await call(`/public/lead-pages/${page.slug}/leads`, 'POST', {
        name: 'Public visitor',
        businessName: 'Visitor Trading',
        mobile: '+919800223344',
        consent: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/public/lead-pages/${page.slug}/leads`, 'POST', {
        name: 'Public visitor',
        businessName: 'Visitor Trading',
        mobile: '+919800223344',
        consent: true,
      })
    ).status,
    201,
  );

  const progress = await call('/partner/learning/progress', 'POST', { lessonId: 'documents' });
  assert.equal(progress.status, 201);
  assert.deepEqual((progress.body as { completed: string[] }).completed, ['documents']);
  LearningProgressSchema.parse({
    userId: '64a100000000000000000002',
    completed: (progress.body as { completed: string[] }).completed,
  });

  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
  const auditActions = (await call('/admin/audit')).body as { items: Array<{ action: string }> };
  for (const expected of [
    'lead.created',
    'lead.stage_changed',
    'lead_page.created',
    'lead_page.published',
    'lead.public_enquiry_received',
    'learning.lesson_completed',
  ])
    assert.ok(auditActions.items.some((item) => item.action === expected));

  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000002');
  const otherPartnerLeads = await call('/partner/leads');
  assert.equal(otherPartnerLeads.status, 200);
  assert.equal((otherPartnerLeads.body as { total: number }).total, 0);
  assert.equal(
    (await call(`/partner/leads/${leadId}`, 'PATCH', { stage: 'qualified' })).status,
    404,
  );
  assert.equal((await call('/partner/lead-pages')).status, 200);
  assert.equal(((await call('/partner/lead-pages')).body as { total: number }).total, 0);
});

test('public lead capture silently discards honeypots, enforces consent and both rate limits, and assigns ownership', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const makePublishedPage = async (title: string) => {
    const created = await call('/partner/lead-pages', 'POST', {
      title,
      headline: `Talk to us about ${title}`,
      description: 'A partner can explain the available service steps.',
    });
    const page = (created.body as { page: { _id: string; slug: string } }).page;
    assert.equal(created.status, 201);
    assert.equal(
      (await call(`/partner/lead-pages/${page._id}`, 'PATCH', { status: 'published' })).status,
      200,
    );
    return page;
  };
  const first = await makePublishedPage('Rate test first');
  const second = await makePublishedPage('Rate test second');
  const third = await makePublishedPage('Rate test third');
  const fourth = await makePublishedPage('Rate test fourth');
  const payload = {
    name: 'Public visitor',
    businessName: 'Visitor Trading',
    mobile: '+919800223344',
    consent: true,
  };

  const before = ((await call('/partner/leads')).body as { total: number }).total;
  const trap = await call(`/public/lead-pages/${first.slug}/leads`, 'POST', {
    ...payload,
    website: 'https://spam.invalid',
  });
  assert.equal(trap.status, 201);
  assert.equal(((await call('/partner/leads')).body as { total: number }).total, before);
  assert.equal(
    (
      await call(`/public/lead-pages/${first.slug}/leads`, 'POST', {
        ...payload,
        consent: false,
      })
    ).status,
    400,
  );

  for (let index = 0; index < 3; index += 1) {
    const accepted = await call(`/public/lead-pages/${first.slug}/leads`, 'POST', payload, {
      'x-forwarded-for': `198.51.100.${index + 10}`,
    });
    assert.equal(accepted.status, 201);
  }
  const slugLimited = await call(`/public/lead-pages/${first.slug}/leads`, 'POST', payload, {
    'x-forwarded-for': '198.51.100.30',
  });
  assert.equal(slugLimited.status, 429);
  assert.equal(slugLimited.body.code, 'RATE_LIMITED');
  assert.equal(typeof slugLimited.body.message, 'string');

  const ip = '203.0.113.77';
  for (const page of [second, third, fourth])
    assert.equal(
      (
        await call(`/public/lead-pages/${page.slug}/leads`, 'POST', payload, {
          'x-forwarded-for': ip,
        })
      ).status,
      201,
    );
  const ipLimited = await call(`/public/lead-pages/${first.slug}/leads`, 'POST', payload, {
    'x-forwarded-for': ip,
  });
  assert.equal(ipLimited.status, 429);
  assert.equal(ipLimited.body.code, 'RATE_LIMITED');

  const ownerLeads = (await call('/partner/leads')).body as {
    items: Array<{ partnerId: string; source: string }>;
  };
  assert.ok(ownerLeads.items.some((lead) => lead.partnerId === '64a100000000000000000003'));
  assert.ok(ownerLeads.items.every((lead) => lead.partnerId === '64a100000000000000000003'));
});

test('lead lifecycle permits ordered stages, lost from any active stage, and terminal won/lost outcomes', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const createLead = async (name: string) => {
    const response = await call('/partner/leads', 'POST', {
      name,
      businessName: `${name} Trading`,
      mobile: '+919876541234',
      consent: true,
    });
    return (response.body as { lead: { _id: string } }).lead._id;
  };
  const advance = async (id: string, stage: string) =>
    call(`/partner/leads/${id}`, 'PATCH', { stage });

  const won = await createLead('Lead Won');
  assert.equal((await advance(won, 'qualified')).status, 409);
  assert.equal((await advance(won, 'contacted')).status, 200);
  assert.equal((await advance(won, 'qualified')).status, 200);
  assert.equal((await advance(won, 'won')).status, 200);
  assert.equal((await advance(won, 'lost')).status, 409);
  assert.equal((await advance(won, 'new')).status, 409);
  assert.equal((await advance(won, 'converted')).status, 400);

  const newLost = await createLead('Lead Lost New');
  const contactedLost = await createLead('Lead Lost Contacted');
  const qualifiedLost = await createLead('Lead Lost Qualified');
  assert.equal((await advance(newLost, 'lost')).status, 200);
  assert.equal((await advance(contactedLost, 'contacted')).status, 200);
  assert.equal((await advance(contactedLost, 'lost')).status, 200);
  assert.equal((await advance(qualifiedLost, 'contacted')).status, 200);
  assert.equal((await advance(qualifiedLost, 'qualified')).status, 200);
  assert.equal((await advance(qualifiedLost, 'lost')).status, 200);
  assert.equal((await advance(newLost, 'qualified')).status, 409);
});

test('partner staff without lead permissions receives 403 and other partner leads stay invisible', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a900000000000000000001');
  assert.equal((await call('/partner/leads')).status, 403);
  assert.equal((await call('/partner/lead-pages')).status, 403);

  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const ownLead = (await call('/partner/leads')).body as {
    items: Array<{ _id: string }>;
  };
  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000002');
  assert.equal(
    (await call(`/partner/leads/${ownLead.items[0]!._id}`, 'PATCH', { stage: 'contacted' })).status,
    404,
  );
});

test('partner invoice clients, financial-year numbering, GST, history, and print data are persistent and scoped', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const clientResponse = await call('/partner/invoice-clients', 'POST', {
    name: 'Asha Kulkarni',
    businessName: 'Asha Design Studio',
    email: 'asha@example.demo',
    mobile: '+919876543210',
    state: 'Kerala',
    gstin: '',
  });
  assert.equal(clientResponse.status, 201);
  const client = (clientResponse.body as { client: unknown }).client;
  InvoiceClientSchema.parse(client);
  const clientId = (client as { _id: string })._id;
  const issue = () =>
    call('/partner/invoices', 'POST', {
      clientId,
      issueDate: '2026-04-10',
      lines: [
        {
          description: 'Registration assistance',
          quantity: 1,
          unitAmountPaise: 10001,
          gstRateBps: 1800,
        },
      ],
    });
  const invoices = await Promise.all([issue(), issue(), issue()]);
  assert.ok(invoices.every((invoice) => invoice.status === 201));
  const records = invoices.map((invoice) => {
    const record = (invoice.body as { invoice: unknown }).invoice;
    PartnerToolInvoiceSchema.parse(record);
    return record as {
      number: string;
      igstPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      totalPaise: number;
    };
  });
  assert.deepEqual(records.map((record) => record.number).sort(), [
    'SN-MH-2048/2026-27/0001',
    'SN-MH-2048/2026-27/0002',
    'SN-MH-2048/2026-27/0003',
  ]);
  assert.ok(records.every((record) => record.igstPaise === 1800));
  assert.ok(records.every((record) => record.cgstPaise === 0 && record.sgstPaise === 0));
  assert.ok(records.every((record) => record.totalPaise === 11801));
  const localClientResponse = await call('/partner/invoice-clients', 'POST', {
    name: 'Anaya Deshmukh',
    businessName: 'Anaya Studio',
    email: '',
    mobile: '+919876543211',
    state: 'Maharashtra',
    gstin: '',
  });
  const localClientId = (localClientResponse.body as { client: { _id: string } }).client._id;
  const localIssue = (date: string) =>
    call('/partner/invoices', 'POST', {
      clientId: localClientId,
      issueDate: date,
      lines: [{ description: 'Tax filing', quantity: 1, unitAmountPaise: 10003, gstRateBps: 1800 }],
    });
  const localInvoice = await localIssue('2027-03-31');
  const localRecord = (
    localInvoice.body as {
      invoice: { number: string; cgstPaise: number; sgstPaise: number; igstPaise: number };
    }
  ).invoice;
  assert.equal(localRecord.number, 'SN-MH-2048/2026-27/0004');
  assert.equal(localRecord.cgstPaise, 900);
  assert.equal(localRecord.sgstPaise, 901);
  assert.equal(localRecord.igstPaise, 0);
  const nextYear = await localIssue('2027-04-01');
  assert.equal(
    (nextYear.body as { invoice: { number: string } }).invoice.number,
    'SN-MH-2048/2027-28/0001',
  );
  const history = await call('/partner/invoices');
  assert.equal((history.body as { total: number }).total, 5);
  assert.equal((await call('/partner/invoice-clients')).status, 200);

  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000002');
  assert.equal(((await call('/partner/invoices')).body as { total: number }).total, 0);
  const otherClients = (await call('/partner/invoice-clients')).body as {
    items: Array<{ partnerId: string }>;
  };
  assert.ok(otherClients.items.length > 0);
  assert.ok(otherClients.items.every((item) => item.partnerId === '64a100000000000000000105'));
  const secondPartnerInvoice = await call('/partner/invoices', 'POST', {
    clientId: (otherClients.items[0] as unknown as { _id: string })._id,
    issueDate: '2026-04-10',
    lines: [{ description: 'Tax filing', quantity: 1, unitAmountPaise: 10001, gstRateBps: 1800 }],
  });
  assert.equal(secondPartnerInvoice.status, 201);
  assert.match(
    (secondPartnerInvoice.body as { invoice: { number: string } }).invoice.number,
    /^SN-MH-4085\/2026-27\/0001$/,
  );
});

test('learning quizzes persist scores per demo user and issue one printable certificate only after completion', async () => {
  localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
  const before = await call('/partner/learning/progress');
  assert.equal((before.body as { certificateAvailable: boolean }).certificateAvailable, false);
  assert.equal((await call('/partner/learning/certificate', 'POST', {})).status, 409);
  for (const lessonId of ['onboarding', 'documents', 'wallet-orders'])
    assert.equal((await call('/partner/learning/progress', 'POST', { lessonId })).status, 201);
  const failedQuiz = await call('/partner/learning/quizzes/onboarding', 'POST', {
    answers: { consent: 'skip', followup: 'call' },
  });
  assert.equal(failedQuiz.status, 200);
  assert.equal((failedQuiz.body as { score: number }).score, 50);
  assert.equal((failedQuiz.body as { passed: boolean }).passed, false);
  const correctAnswers = [
    ['consent', 'ask'],
    ['followup', 'call'],
    ['documents', 'checklist'],
    ['identity', 'verify'],
    ['balance', 'ledger'],
    ['status', 'tracking'],
  ];
  for (const lessonId of ['onboarding', 'documents', 'wallet-orders']) {
    const answers = Object.fromEntries(
      correctAnswers.slice(
        lessonId === 'onboarding' ? 0 : lessonId === 'documents' ? 2 : 4,
        lessonId === 'onboarding' ? 2 : lessonId === 'documents' ? 4 : 6,
      ),
    );
    const result = await call(`/partner/learning/quizzes/${lessonId}`, 'POST', { answers });
    assert.equal(result.status, 200);
    assert.equal((result.body as { passed: boolean }).passed, true);
  }
  const progress = await call('/partner/learning/progress');
  const learning = progress.body as {
    quizScores: Array<{ score: number }>;
    certificateAvailable: boolean;
  };
  assert.equal(learning.quizScores.length, 3);
  assert.equal(learning.certificateAvailable, true);
  const issued = await call('/partner/learning/certificate', 'POST', {});
  assert.equal(issued.status, 201);
  assert.equal(
    (issued.body as { certificate: { printable: boolean } }).certificate.printable,
    true,
  );
  assert.equal((await call('/partner/learning/certificate', 'POST', {})).status, 409);

  localStorage.setItem('franchise-crm-demo-user', '64a800000000000000000002');
  const otherUser = await call('/partner/learning/progress');
  assert.deepEqual((otherUser.body as { completed: string[] }).completed, []);
  assert.equal((otherUser.body as { certificateAvailable: boolean }).certificateAvailable, false);
});
