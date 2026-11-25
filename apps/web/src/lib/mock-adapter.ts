import type { DemoUser } from './contracts';
import {
  demoApplications,
  demoAuditEvents,
  demoDocuments,
  demoPartners,
  demoRoles,
  demoUsers,
} from './demo-fixtures';

const sessionKey = 'franchise-crm-demo-user';
let csrfToken = 'demo-csrf-token';

function currentDemoUser(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  const kind = window.localStorage.getItem(sessionKey);
  return kind === 'admin' || kind === 'partner' ? demoUsers[kind] : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function readBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function mockApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    'http://demo.local',
  );
  const path = url.pathname.replace(/^\/api(?=\/)/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  const body = readBody(init.body);

  if (path === '/v1/auth/csrf') return json({ csrfToken });
  if (path === '/v1/auth/login' || path === '/v1/auth/admin/login') {
    const kind = path.includes('/admin/') ? 'admin' : 'partner';
    if (typeof body.email !== 'string' || !body.email.includes('@'))
      return json({ message: 'Enter a valid email address.' }, 400);
    if (kind === 'partner') window.localStorage.setItem(sessionKey, kind);
    return json(
      kind === 'admin' ? { requiresTotp: true, status: 'totp_required' } : { status: 'signed_in' },
      201,
    );
  }
  if (path === '/v1/auth/2fa/setup' && method === 'POST')
    return json(
      {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl:
          'otpauth://totp/Service%20Network:admin%40servicenetwork.demo?secret=JBSWY3DPEHPK3PXP&issuer=Service%20Network',
      },
      201,
    );
  if (path === '/v1/auth/2fa/verify' && method === 'POST') {
    const user = currentDemoUser();
    if (user?.kind === 'admin' || !user) window.localStorage.setItem(sessionKey, 'admin');
    return json(
      { status: 'verified', recoveryCodes: ['DEMO-4F7K-2Q9M', 'DEMO-8R3P-1V6X', 'DEMO-5C2N-7H4L'] },
      201,
    );
  }
  if (path === '/v1/auth/me') {
    const user = currentDemoUser();
    if (!user) return json({ message: 'Sign in to continue.' }, 401);
    return json({ user });
  }
  if (path === '/v1/auth/logout' && method === 'POST') {
    window.localStorage.removeItem(sessionKey);
    return json({ status: 'signed_out' }, 201);
  }
  if (path === '/v1/auth/password/forgot' && method === 'POST')
    return json({ accepted: true }, 201);
  if (path === '/v1/auth/password/reset' && method === 'POST')
    return json({ status: 'password_updated' }, 201);
  if (path === '/v1/public/territories')
    return json([
      {
        id: '64a600000000000000000001',
        name: 'Pune Urban',
        state: 'Maharashtra',
        pinPrefixes: ['41', '42'],
        exclusive: true,
      },
    ]);
  if (path === '/v1/public/territories/availability')
    return json({
      available: url.searchParams.get('pin')?.startsWith('4') ?? false,
      territory: { id: '64a600000000000000000001', name: 'Pune Urban' },
    });
  if (path === '/v1/public/applications/verify-email')
    return url.searchParams.has('token')
      ? json({ verified: true })
      : json({ message: 'Verification token is missing.' }, 400);
  if (path === '/v1/public/applications' && method === 'POST')
    return json(
      {
        accepted: true,
        verificationRequired: true,
        applicationId: '64a200000000000000000099',
        uploadToken: 'demo-upload-token-not-valid-outside-demo',
      },
      201,
    );
  if (path === '/v1/admin/applications' && method === 'GET') {
    const status = url.searchParams.get('status');
    const items = demoApplications
      .filter((item) => !status || item.status === status)
      .map((item) => ({
        _id: item.id,
        ...item,
        mobile: '+91 98765 43210',
        legalType: 'Sole proprietorship',
        city: 'Pune',
        state: 'Maharashtra',
        pin: '411001',
        createdAt: item.receivedAt,
      }));
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  }
  if (path.endsWith('/eligible-parents'))
    return json(
      demoPartners
        .filter((partner) => partner.status === 'active')
        .map((partner) => ({
          id: partner.id,
          code: partner.code,
          businessName: partner.businessName,
          city: partner.city,
          state: partner.state,
        })),
    );
  if (path.startsWith('/v1/admin/applications/') && method === 'GET') {
    const id = path.split('/').at(-1);
    const item =
      demoApplications.find((application) => application.id === id) ?? demoApplications[0];
    if (!item) return json({ message: 'Application not found.' }, 404);
    return json({
      application: {
        _id: item.id,
        ...item,
        mobile: '+91 98765 43210',
        legalType: 'Sole proprietorship',
        city: 'Pune',
        state: 'Maharashtra',
        pin: '411001',
        createdAt: item.receivedAt,
      },
      documents: [
        demoDocuments[0] ? { _id: demoDocuments[0].id, ...demoDocuments[0] } : null,
      ].filter(Boolean),
    });
  }
  if (path.startsWith('/v1/admin/applications/') && method === 'POST')
    return json({ status: path.endsWith('/approve') ? 'pending_payment' : 'updated' }, 201);
  if (path === '/v1/admin/partners' && method === 'GET')
    return json(
      demoPartners.map((partner) => ({
        _id: partner.id,
        ...partner,
        path: Array.from(
          { length: partner.depth + 1 },
          (_, index) => `64a10000000000000000000${index + 3}`,
        ),
        email: 'partner@example.demo',
        mobile: '+91 98765 43210',
        pin: '411001',
      })),
    );
  if (path.startsWith('/v1/admin/partners/') && path.endsWith('/status') && method === 'PUT')
    return json({ status: body.status, id: path.split('/')[4] });
  if (path.startsWith('/v1/admin/partners/') && path.endsWith('/kyc-fields') && method === 'PATCH')
    return json({ updated: true, masked: { pan: '••••••234F', gstin: '•••••••••••1Z5' } });
  if (path.startsWith('/v1/admin/partners/') && method === 'GET') {
    const partnerId = path.split('/').at(-1);
    const partner = demoPartners.find((item) => item.id === partnerId) ?? demoPartners[0];
    if (!partner) return json({ message: 'Partner not found.' }, 404);
    return json({
      partner: {
        _id: partner.id,
        ...partner,
        path: [],
        email: 'partner@example.demo',
        mobile: '+91 98765 43210',
        pin: '411001',
      },
      documents: demoDocuments.map((doc) => ({ _id: doc.id, ...doc })),
      downlineCount: demoPartners.filter((item) => item.parentId === partnerId).length,
    });
  }
  if (path === '/v1/admin/users' && method === 'GET')
    return json({
      items: [
        {
          _id: demoUsers.admin.id,
          email: demoUsers.admin.email,
          name: demoUsers.admin.name,
          kind: 'admin',
          status: 'active',
          roleIds: [demoRoles[3]?._id],
        },
        {
          _id: demoUsers.partner.id,
          email: demoUsers.partner.email,
          name: demoUsers.partner.name,
          kind: 'partner',
          status: 'active',
          roleIds: [demoRoles[2]?._id],
        },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
    });
  if (path === '/v1/admin/roles' && method === 'GET')
    return json(
      demoRoles.filter((role) => role.kind === (url.searchParams.get('kind') ?? 'admin')),
    );
  if (path === '/v1/admin/audit')
    return json({ items: demoAuditEvents, total: demoAuditEvents.length });
  if (path === '/v1/files/kyc/mine')
    return json(
      demoDocuments.map((doc) => ({ ...doc, id: doc.id, createdAt: '2026-11-20T10:00:00.000Z' })),
    );
  if (path === '/v1/partner/network')
    return json({
      total: 3,
      countsByTier: { retailer: 1, distributor: 2, master_distributor: 0 },
      items: demoPartners
        .slice(1)
        .map((partner) => ({ ...partner, depth: partner.depth, id: partner.id })),
    });
  if (path.startsWith('/v1/files/kyc/'))
    return new Response('%PDF-1.7\nDemo KYC document\n%%EOF', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });
  if (method !== 'GET') return json({ status: 'saved' }, 201);
  return json({ message: 'This action is not available in the local demo.' }, 404);
}

export function getMockCsrfToken(): string {
  return csrfToken;
}

export function resetMockSession(): void {
  csrfToken = 'demo-csrf-token';
}
