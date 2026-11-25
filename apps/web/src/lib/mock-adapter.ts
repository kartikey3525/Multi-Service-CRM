import type { DemoUser } from './contracts';
import {
  appendLedgerEntry,
  authorizeMockAction,
  calculateLineGst,
  canTransitionOrder,
  Money,
  scopedPartnerIds,
  type OrderStatusValue,
} from '@franchise-crm/shared';
import { OrderStatus } from '@franchise-crm/shared';
import {
  demoApplications,
  demoDocuments,
  demoPartners,
  demoRoles,
  demoLoginUsers,
  demoUsers,
} from './demo-fixtures';
import {
  demoApplications as allDemoApplications,
  demoPartners as allDemoPartners,
} from './demo-fixtures';
import {
  demoAudit,
  demoCommissions,
  demoCustomers,
  demoLedger,
  demoNotifications,
  demoOrderEvents,
  demoOrders,
  demoPayouts,
  demoServices,
  demoTickets,
  demoTopups,
  demoWallets,
} from './demo-business-fixtures';

const sessionKey = 'franchise-crm-demo-user';
let csrfToken = 'demo-csrf-token';
const dataKey = 'franchise-crm-demo-store';

function currentDemoUser(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(sessionKey);
  if (stored === 'admin' || stored === 'partner') return demoUsers[stored];
  return demoLoginUsers.find((user) => user.id === stored) ?? null;
}

function requiredPermission(path: string, method: string): string | null {
  if (path.startsWith('/v1/admin/applications'))
    return method === 'GET' ? 'applications.read' : 'applications.review';
  if (path.startsWith('/v1/admin/partners'))
    return method === 'GET' ? 'partners.read' : 'partners.manage';
  if (path.startsWith('/v1/admin/users'))
    return method === 'GET' ? 'admin_users.read' : 'admin_users.write';
  if (path.startsWith('/v1/admin/roles')) return method === 'GET' ? 'roles.read' : 'roles.manage';
  if (path.startsWith('/v1/admin/commissions'))
    return method === 'GET' ? 'commissions.read' : 'commissions.manage';
  if (path.startsWith('/v1/admin/payouts'))
    return method === 'GET' ? 'payouts.read' : 'payouts.manage';
  if (path.startsWith('/v1/admin/tickets'))
    return method === 'GET' ? 'tickets.read' : 'tickets.manage';
  if (path.startsWith('/v1/admin/services'))
    return method === 'GET' ? 'services.read' : 'services.manage';
  if (path.startsWith('/v1/admin/audit')) return 'audit.read';
  if (path.startsWith('/v1/notifications') || path.startsWith('/v1/search')) return 'identity.me';
  if (path.startsWith('/v1/partner/network')) return 'team.read';
  if (path.startsWith('/v1/partner/invites')) return 'team.manage';
  if (path.startsWith('/v1/partner/team')) return method === 'GET' ? 'team.read' : 'team.manage';
  if (path.startsWith('/v1/partner/notices')) return 'content.read';
  if (path.startsWith('/v1/partner/customers'))
    return method === 'GET' ? 'customers.read' : 'customers.manage';
  if (path.startsWith('/v1/files/kyc')) return method === 'GET' ? 'files.download' : 'files.upload';
  if (path.startsWith('/v1/orders/') && path.endsWith('/documents')) return 'orders.process';
  if (path.startsWith('/v1/orders/') && path.endsWith('/query')) return 'orders.create';
  if (path.startsWith('/v1/orders'))
    return method === 'GET'
      ? 'orders.read'
      : method === 'POST'
        ? 'orders.create'
        : 'orders.process';
  if (path.startsWith('/v1/admin/orders'))
    return method === 'GET' ? 'orders.read' : 'orders.process';
  if (path.startsWith('/v1/partner/wallet'))
    return method === 'GET' ? 'wallet.read' : 'wallet.topup_request';
  if (path.startsWith('/v1/admin/wallet/topups'))
    return method === 'GET' ? 'wallet.read' : 'wallet.topup_approve';
  if (path.startsWith('/v1/partner/payouts')) return 'payouts.read';
  if (path.startsWith('/v1/partner/commissions')) return 'commissions.read';
  if (path.startsWith('/v1/partner/tickets'))
    return method === 'GET' ? 'tickets.read' : 'tickets.manage';
  if (path.startsWith('/v1/services')) return 'services.read';
  if (path.startsWith('/v1/admin/reports')) return 'reports.read';
  if (path.startsWith('/v1/admin/content'))
    return method === 'GET' ? 'content.read' : 'content.manage';
  if (path.startsWith('/v1/admin/settings'))
    return method === 'GET' ? 'settings.read' : 'settings.manage';
  if (path.startsWith('/v1/admin') || path.startsWith('/v1/partner')) return 'identity.me';
  return null;
}

function partnerPath(partnerId: string, partners: typeof allDemoPartners): string[] {
  const path: string[] = [];
  let partner = partners.find((item) => item.id === partnerId);
  while (partner) {
    path.unshift(partner.id);
    partner = partner.parentId ? partners.find((item) => item.id === partner!.parentId) : undefined;
  }
  return path;
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
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.floor(Math.random() * 301)));
  const faultRate = Number(window.localStorage.getItem('franchise-crm-mock-error-rate') ?? '0.01');
  if (Number.isFinite(faultRate) && faultRate > 0 && Math.random() < faultRate)
    return json({ message: 'A temporary demo service issue occurred. Please try again.' }, 503);
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    'http://demo.local',
  );
  const path = url.pathname.replace(/^\/api(?=\/)/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  const body = readBody(init.body);

  const permission =
    path.startsWith('/v1/files/kyc/applications/') && method === 'POST'
      ? null
      : requiredPermission(path, method);
  if (permission) {
    const denied = authorizeMockAction(currentDemoUser(), permission);
    if (denied)
      return json(
        { message: denied.message, code: denied.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN' },
        denied.status,
      );
  }

  if (path === '/v1/auth/csrf') return json({ csrfToken });
  if (path === '/v1/auth/login' || path === '/v1/auth/admin/login') {
    const kind = path.includes('/admin/') ? 'admin' : 'partner';
    const user = demoLoginUsers.find(
      (candidate) =>
        candidate.email.toLowerCase() === String(body.email ?? '').toLowerCase() &&
        candidate.kind === kind,
    );
    if (!user) return json({ message: 'Use one of the demo accounts listed on this screen.' }, 401);
    if (typeof body.password !== 'string' || !body.password)
      return json({ message: 'Enter your password.' }, 400);
    if (kind === 'partner') window.localStorage.setItem(sessionKey, user.id);
    else window.localStorage.setItem('franchise-crm-demo-pending-user', user.id);
    return json(
      kind === 'admin'
        ? { requiresTotp: true, status: 'totp_required' }
        : user.mustChangePassword &&
            window.localStorage.getItem(`crm-demo-password-changed:${user.id}`) !== 'yes'
          ? { requiresPasswordChange: true, status: 'password_change_required' }
          : { status: 'signed_in' },
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
    const pendingUser =
      window.localStorage.getItem('franchise-crm-demo-pending-user') ?? demoUsers.admin.id;
    window.localStorage.setItem(sessionKey, pendingUser);
    window.localStorage.removeItem('franchise-crm-demo-pending-user');
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
  if (path === '/v1/auth/password/change' && method === 'POST') {
    const user = currentDemoUser();
    if (!user || typeof body.newPassword !== 'string' || body.newPassword.length < 12)
      return json({ message: 'Use a new password with at least 12 characters.' }, 400);
    window.localStorage.setItem(`crm-demo-password-changed:${user.id}`, 'yes');
    writeAudit('identity.password_changed', 'user', user.id);
    return json({ status: 'password_updated' }, 201);
  }
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
  if (path === '/v1/public/applications/status') {
    const token = url.searchParams.get('token');
    const application = readMockData().applications.find((item) => item.id === token);
    return application
      ? json({
          applicationId: application.id,
          status: application.status,
          updatedAt: application.receivedAt,
        })
      : json({ message: 'Application status link is invalid or expired.' }, 404);
  }
  if (path === '/v1/public/orders/status') {
    const token = url.searchParams.get('token') ?? '';
    const orderId = token.startsWith('demo-order-') ? token.slice('demo-order-'.length) : '';
    const order = readMockData().orders.find((item) => item._id === orderId);
    if (!order) return json({ message: 'Order tracking link is invalid or expired.' }, 404);
    const service = demoServices.find((item) => item._id === order.serviceId);
    return json({
      orderNumber: order.orderNumber,
      status: order.status,
      serviceName: service?.name ?? 'Service request',
      updatedAt: order.updatedAt,
      events: readMockData()
        .orderEvents.filter((event) => event.orderId === order._id)
        .map((event) => ({ status: event.toStatus, date: event.createdAt, note: event.note })),
    });
  }
  if (path === '/v1/public/applications' && method === 'POST') {
    const applicationId = BigInt(Date.now()).toString(16).padStart(24, '0');
    const applicant = {
      id: applicationId,
      applicantName: String(body.applicantName ?? body.fullName ?? 'New applicant'),
      email: String(body.email ?? 'applicant@example.demo'),
      businessName: String(body.businessName ?? 'New local business'),
      requestedTier: String(
        body.requestedTier ?? 'retailer',
      ) as (typeof allDemoApplications)[number]['requestedTier'],
      status: 'pending_email_verification' as const,
      receivedAt: new Date().toISOString(),
    };
    updateMockData((data) => ({
      ...data,
      applications: [{ ...applicant, status: 'submitted' }, ...data.applications],
    }));
    writeAudit('application.submitted', 'application', applicationId);
    return json(
      {
        accepted: true,
        verificationRequired: true,
        applicationId,
        uploadToken: 'demo-upload-token-not-valid-outside-demo',
      },
      201,
    );
  }
  if (path === '/v1/admin/applications' && method === 'GET') {
    const status = url.searchParams.get('status');
    const applications = readMockData().applications;
    const items = applications
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
  if (path.startsWith('/v1/admin/applications/') && method === 'POST') {
    const id = path.split('/').at(-2);
    const action = path.split('/').at(-1);
    const status =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_info';
    updateMockData((data) => ({
      ...data,
      applications: data.applications.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
    writeAudit(`application.${action}`, 'application', id ?? '');
    return json({ status: action === 'approve' ? 'pending_payment' : 'updated' }, 201);
  }
  if (path === '/v1/admin/partners' && method === 'GET')
    return json(
      readMockData().partners.map((partner) => ({
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
  if (path.startsWith('/v1/admin/partners/') && path.endsWith('/status') && method === 'PUT') {
    const id = path.split('/')[4] ?? '';
    updateMockData((data) => ({
      ...data,
      partners: data.partners.map((item) =>
        item.id === id ? { ...item, status: body.status as typeof item.status } : item,
      ),
    }));
    writeAudit(`partner.${String(body.status)}`, 'partner', id);
    return json({ status: body.status, id });
  }
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
      items: demoLoginUsers.map((user) => ({
        _id: user.id,
        email: user.email,
        name: user.name,
        kind: user.kind,
        status: 'active',
        roleIds: [],
        roleNames: user.roleNames,
      })),
      total: demoLoginUsers.length,
      page: 1,
      pageSize: 100,
    });
  if (path === '/v1/admin/roles' && method === 'GET')
    return json(
      demoRoles.filter((role) => role.kind === (url.searchParams.get('kind') ?? 'admin')),
    );
  if (path === '/v1/admin/audit')
    return json({ items: readMockData().audit, total: readMockData().audit.length });
  if (path === '/v1/notifications' && method === 'GET') {
    const userId = currentDemoUser()?.id;
    const items = readMockData().notifications.filter((item) => item.userId === userId);
    return json({ items, total: items.length });
  }
  if (path === '/v1/notifications/read' && method === 'POST') {
    const userId = currentDemoUser()?.id;
    const id = String(body.id ?? '');
    const now = new Date().toISOString();
    updateMockData((data) => ({
      ...data,
      notifications: data.notifications.map((item) =>
        item.userId === userId && (id === 'all' || item._id === id)
          ? { ...item, readAt: now }
          : item,
      ),
    }));
    writeAudit('notification.read', 'notification', id || 'all');
    return json({ updated: true });
  }
  if (path === '/v1/search' && method === 'GET') {
    const term = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    if (term.length < 2) return json({ items: [] });
    const actor = currentDemoUser()!;
    const data = readMockData();
    const allowed = actor.partner
      ? new Set(
          scopedPartnerIds(
            actor.partner.id,
            data.partners.map((partner) => ({
              id: partner.id,
              path: partnerPath(partner.id, data.partners),
            })),
          ),
        )
      : null;
    const items = [
      ...data.partners
        .filter(
          (partner) =>
            (!allowed || allowed.has(partner.id)) &&
            `${partner.businessName} ${partner.code} ${partner.city}`.toLowerCase().includes(term),
        )
        .map((partner) => ({
          type: 'Partner',
          title: partner.businessName,
          detail: `${partner.code} · ${partner.city}`,
          href: actor.kind === 'admin' ? '/admin/partners' : '/partner/network',
        })),
      ...data.orders
        .filter(
          (order) =>
            (!allowed || allowed.has(order.partnerId)) &&
            `${order.orderNumber} ${order.customerName} ${order.status}`
              .toLowerCase()
              .includes(term),
        )
        .map((order) => ({
          type: 'Order',
          title: order.orderNumber,
          detail: `${order.customerName} · ${order.status}`,
          href: actor.kind === 'admin' ? '/admin/orders' : '/partner/orders',
        })),
      ...data.services
        .filter((service) => `${service.name} ${service.category}`.toLowerCase().includes(term))
        .map((service) => ({
          type: 'Service',
          title: service.name,
          detail: service.category,
          href: actor.kind === 'admin' ? '/admin/services' : '/partner/services',
        })),
    ].slice(0, 12);
    return json({ items });
  }
  if (path.startsWith('/v1/admin/orders/') && path.endsWith('/assign') && method === 'POST') {
    const id = path.split('/').at(-2) ?? '';
    const data = readMockData();
    const order = data.orders.find((item) => item._id === id);
    if (!order) return json({ message: 'Order not found.' }, 404);
    if (order.status !== 'submitted')
      return json({ message: 'Only new orders can be assigned.' }, 409);
    const now = new Date().toISOString();
    updateMockData((state) => ({
      ...state,
      orders: state.orders.map((item) =>
        item._id === id
          ? {
              ...item,
              assignedTo: currentDemoUser()?.id ?? null,
              status: OrderStatus.assigned,
              updatedAt: now,
            }
          : item,
      ),
      orderEvents: [
        {
          _id: BigInt(Date.now()).toString(16).padStart(24, '0'),
          orderId: id,
          fromStatus: OrderStatus.submitted,
          toStatus: OrderStatus.assigned,
          note: 'Assigned to operations',
          actorUserId: currentDemoUser()?.id ?? demoUsers.admin.id,
          createdAt: now,
        },
        ...state.orderEvents,
      ],
    }));
    writeAudit('order.assigned', 'order', id);
    return json({ status: 'assigned' });
  }
  if (path === '/v1/admin/orders' && method === 'GET') {
    const data = readMockData();
    return json({
      items: data.orders.map((order) => ({
        ...order,
        partnerName: data.partners.find((partner) => partner.id === order.partnerId)?.businessName,
        serviceName: demoServices.find((service) => service._id === order.serviceId)?.name,
      })),
      total: data.orders.length,
      page: 1,
      pageSize: data.orders.length,
    });
  }
  if (path === '/v1/admin/commissions' && method === 'GET')
    return json({ items: demoCommissions, total: demoCommissions.length });
  if (path === '/v1/admin/commissions/rules' && method === 'GET')
    return json({ items: readMockData().commissionRules });
  if (path === '/v1/admin/commissions/rules' && method === 'PUT') {
    const rules = Array.isArray(body.items) ? body.items : [];
    if (
      rules.some(
        (rule) =>
          !rule ||
          typeof rule.tier !== 'string' ||
          !Number.isInteger(rule.basisPoints) ||
          rule.basisPoints < 0 ||
          rule.basisPoints > 10000,
      )
    )
      return json(
        { message: 'Commission rates must be whole basis points from 0 to 10,000.' },
        400,
      );
    updateMockData((data) => ({ ...data, commissionRules: rules }));
    writeAudit('commission.rules_updated', 'commission_rules', 'default');
    return json({ items: rules });
  }
  if (path === '/v1/admin/ledger' && method === 'GET')
    return json({ items: readMockData().ledger, total: readMockData().ledger.length });
  if (path === '/v1/admin/payouts' && method === 'GET')
    return json({ items: readMockData().payouts, total: readMockData().payouts.length });
  if (path.startsWith('/v1/admin/payouts/') && path.endsWith('/paid') && method === 'POST') {
    const id = path.split('/').at(-2) ?? '';
    const payout = readMockData().payouts.find((item) => item._id === id);
    if (!payout || payout.status !== 'batched')
      return json({ message: 'Batched payout not found.' }, 409);
    updateMockData((data) => ({
      ...data,
      payouts: data.payouts.map((item) =>
        item._id === id
          ? {
              ...item,
              status: 'paid' as const,
              processedAt: new Date().toISOString(),
              reference: String(body.reference ?? `DEMO${Date.now()}`),
            }
          : item,
      ),
    }));
    writeAudit('payout.marked_paid', 'payout', id);
    return json({ status: 'paid' }, 201);
  }
  if (path === '/v1/admin/tickets' && method === 'GET')
    return json({ items: readMockData().tickets, total: readMockData().tickets.length });
  if (path.startsWith('/v1/admin/tickets/') && method === 'PATCH') {
    const id = path.split('/').at(-1) ?? '';
    if (!['open', 'in_progress', 'waiting', 'resolved'].includes(String(body.status)))
      return json({ message: 'Choose a valid ticket status.' }, 400);
    updateMockData((data) => ({
      ...data,
      tickets: data.tickets.map((item) =>
        item._id === id
          ? {
              ...item,
              status: body.status as typeof item.status,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
    writeAudit('ticket.status_changed', 'ticket', id);
    return json({ status: body.status });
  }
  if (path === '/v1/admin/reports' && method === 'GET')
    return json({ orders: readMockData().orders.length, partners: readMockData().partners.length });
  if (path === '/v1/admin/content' && method === 'GET')
    return json({ items: readMockData().content });
  if (path === '/v1/admin/content' && method === 'POST') {
    const notice = {
      id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      title: String(body.title ?? '').slice(0, 100),
      body: String(body.body ?? '').slice(0, 1000),
      status: 'published',
      createdAt: new Date().toISOString(),
    };
    updateMockData((data) => ({ ...data, content: [notice, ...data.content] }));
    writeAudit('content.notice_published', 'notice', notice.id);
    return json({ notice }, 201);
  }
  if (path === '/v1/admin/settings' && method === 'GET')
    return json({ settings: readMockData().settings });
  if (path === '/v1/admin/settings' && method === 'PUT') {
    if (typeof body.gstin !== 'string' || !/^\d{2}[A-Z0-9]{13}$/.test(body.gstin))
      return json({ message: 'Enter a valid 15-character GSTIN.' }, 400);
    if (
      !Number.isInteger(body.gstRateBps) ||
      Number(body.gstRateBps) < 0 ||
      Number(body.gstRateBps) > 2800
    )
      return json({ message: 'GST rate must be between 0 and 2,800 basis points.' }, 400);
    const settings = {
      gstin: body.gstin,
      gstRateBps: Number(body.gstRateBps),
      intraState: Boolean(body.intraState),
      invoicePrefix: String(body.invoicePrefix ?? 'SN').slice(0, 8),
    };
    updateMockData((data) => ({ ...data, settings }));
    writeAudit('settings.updated', 'settings', 'portal');
    return json({ settings });
  }
  if (path === '/v1/services' && method === 'GET') return json({ items: readMockData().services });
  if (path.startsWith('/v1/admin/services/') && method === 'PATCH') {
    const id = path.split('/').at(-1) ?? '';
    if (
      !Number.isSafeInteger(body.basePricePaise) ||
      Number(body.basePricePaise) < 0 ||
      !Number.isInteger(body.gstRateBps) ||
      Number(body.gstRateBps) < 0 ||
      Number(body.gstRateBps) > 2800
    )
      return json({ message: 'Enter a valid price in paise and GST rate.' }, 400);
    updateMockData((data) => ({
      ...data,
      services: data.services.map((item) =>
        item._id === id
          ? {
              ...item,
              basePricePaise: Number(body.basePricePaise),
              gstRateBps: Number(body.gstRateBps),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
    writeAudit('service.pricing_updated', 'service', id);
    return json({ updated: true });
  }
  if (path === '/v1/orders' && method === 'GET') {
    const actor = currentDemoUser()!;
    const paramsPartner = url.searchParams.get('partnerId');
    const data = readMockData();
    const actorPartner = actor.partner?.id;
    const allowedIds = actorPartner
      ? new Set(
          scopedPartnerIds(
            actorPartner,
            data.partners.map((partner) => ({
              id: partner.id,
              path: partnerPath(partner.id, data.partners),
            })),
          ),
        )
      : null;
    let items = data.orders.filter((order) => !allowedIds || allowedIds.has(order.partnerId));
    if (paramsPartner)
      items = items.filter(
        (item) =>
          item.partnerId === paramsPartner && (!allowedIds || allowedIds.has(paramsPartner)),
      );
    const status = url.searchParams.get('status');
    if (status) items = items.filter((item) => item.status === status);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    return json({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    });
  }
  if (path.startsWith('/v1/orders/') && method === 'GET') {
    const order = readMockData().orders.find((item) => item._id === path.split('/').at(-1));
    const actor = currentDemoUser();
    if (!order) return json({ message: 'Order not found.' }, 404);
    if (
      actor?.partner &&
      !scopedPartnerIds(
        actor.partner.id,
        readMockData().partners.map((partner) => ({
          id: partner.id,
          path: partnerPath(partner.id, readMockData().partners),
        })),
      ).includes(order.partnerId)
    )
      return json({ message: 'Order not found.' }, 404);
    return json({
      order,
      events: readMockData().orderEvents.filter((event) => event.orderId === order._id),
    });
  }
  if (path === '/v1/orders' && method === 'POST') {
    const actor = currentDemoUser()!;
    const partnerId = actor.partner?.id;
    const service = demoServices.find((item) => item._id === body.serviceId);
    const amountPaise = Number(body.amountPaise ?? service?.basePricePaise);
    if (!partnerId || !service || !Number.isSafeInteger(amountPaise) || amountPaise <= 0)
      return json({ message: 'Choose a valid service and amount.' }, 400);
    const data = readMockData();
    const wallet = data.wallets.find((item) => item.partnerId === partnerId);
    if (!wallet || wallet.balancePaise < amountPaise)
      return json({ message: 'Your wallet balance is too low for this order.' }, 409);
    const now = new Date().toISOString();
    const id = BigInt(Date.now() + Math.floor(Math.random() * 1000))
      .toString(16)
      .padStart(24, '0');
    const gst = calculateLineGst(
      [{ subtotal: Money.fromPaise(amountPaise), rateBasisPoints: service.gstRateBps }],
      true,
    );
    const gstPaise = gst.cgst.paise + gst.sgst.paise + gst.igst.paise;
    const order = {
      _id: id,
      orderNumber: `SN-26-${id.slice(-6)}`,
      partnerId,
      customerId: null,
      serviceId: service._id,
      status: OrderStatus.submitted,
      amountPaise,
      gstPaise,
      totalPaise: amountPaise + gstPaise,
      assignedTo: null,
      customerName: String(body.customerName ?? 'Demo customer'),
      createdAt: now,
      updatedAt: now,
    };
    const entry = {
      _id: id,
      partnerId,
      walletId: wallet._id,
      type: 'debit' as const,
      amountPaise,
      balanceAfterPaise: wallet.balancePaise - amountPaise,
      referenceType: 'order',
      referenceId: id,
      description: `Order ${order.orderNumber}`,
      createdAt: now,
      createdBy: actor.id,
    };
    appendLedgerEntry(
      data.ledger.map((item) => ({
        id: item._id,
        direction: item.type,
        amountPaise: item.amountPaise,
        referenceId: item.referenceId,
      })),
      { id: entry._id, direction: entry.type, amountPaise, referenceId: id },
    );
    updateMockData((current) => ({
      ...current,
      orders: [order, ...current.orders],
      wallets: current.wallets.map((item) =>
        item.partnerId === partnerId
          ? { ...item, balancePaise: item.balancePaise - amountPaise, updatedAt: now }
          : item,
      ),
      ledger: [entry, ...current.ledger],
      orderEvents: [
        {
          _id: `${id.slice(0, 23)}1`,
          orderId: id,
          fromStatus: null,
          toStatus: OrderStatus.submitted,
          note: 'Order submitted',
          actorUserId: actor.id,
          createdAt: now,
        },
        ...current.orderEvents,
      ],
    }));
    writeAudit('order.created', 'order', id);
    return json({ order, trackingToken: `demo-order-${id}` }, 201);
  }
  if (path.startsWith('/v1/orders/') && path.endsWith('/status') && method === 'PUT') {
    const id = path.split('/').at(-2) ?? '';
    const nextStatus = String(body.status) as OrderStatusValue;
    const data = readMockData();
    const current = data.orders.find((item) => item._id === id);
    if (!current) return json({ message: 'Order not found.' }, 404);
    if (!canTransitionOrder(current.status as OrderStatusValue, nextStatus))
      return json({ message: `Order cannot move from ${current.status} to ${nextStatus}.` }, 409);
    const now = new Date().toISOString();
    updateMockData((state) => ({
      ...state,
      orders: state.orders.map((item) =>
        item._id === id ? { ...item, status: nextStatus, updatedAt: now } : item,
      ),
      orderEvents: [
        {
          _id: `${id.slice(0, 23)}${(state.orderEvents.length % 9) + 1}`,
          orderId: id,
          fromStatus: current.status,
          toStatus: nextStatus,
          note: String(body.note ?? 'Status updated by operations'),
          actorUserId: currentDemoUser()?.id ?? demoUsers.admin.id,
          createdAt: now,
        },
        ...state.orderEvents,
      ],
    }));
    writeAudit('order.status_changed', 'order', id);
    return json({ order: { ...current, status: nextStatus, updatedAt: now } }, 200);
  }
  if (path.startsWith('/v1/orders/') && path.endsWith('/documents') && method === 'POST') {
    const id = path.split('/').at(-2) ?? '';
    const file = init.body instanceof FormData ? init.body.get('file') : null;
    if (!file || typeof file === 'string')
      return json({ message: 'Choose a document to attach.' }, 400);
    if (file.size > 10 * 1024 * 1024)
      return json({ message: 'Order documents must be 10 MB or smaller.' }, 413);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))
      return json({ message: 'Use a PDF, JPEG, or PNG document.' }, 415);
    const attachment = {
      id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      orderId: id,
      name: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      visibility: 'private' as const,
      createdAt: new Date().toISOString(),
    };
    updateMockData((data) => ({ ...data, orderDocuments: [attachment, ...data.orderDocuments] }));
    writeAudit('order.document_attached', 'order', id);
    return json({ attachment }, 201);
  }
  if (path === '/v1/partner/wallet' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const wallet = readMockData().wallets.find((item) => item.partnerId === partnerId);
    return wallet ? json({ wallet }) : json({ message: 'Wallet not found.' }, 404);
  }
  if (path === '/v1/partner/wallet/ledger' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const all = readMockData().ledger.filter((entry) => entry.partnerId === partnerId);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = 20;
    return json({
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      pageSize,
    });
  }
  if (path === '/v1/partner/wallet/topups' && method === 'POST') {
    const amountPaise = Number(body.amountPaise);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0)
      return json({ message: 'Enter a top-up amount in paise.' }, 400);
    const actor = currentDemoUser()!;
    const topup = {
      id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      partnerId: actor.partner?.id ?? '',
      amountPaise,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reference: String(body.reference ?? ''),
    };
    updateMockData((state) => ({ ...state, topups: [topup, ...state.topups] }));
    writeAudit('wallet.topup_requested', 'wallet_topup', topup.id);
    return json({ accepted: true, topup }, 201);
  }
  if (path === '/v1/partner/payouts' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const items = readMockData().payouts.filter((item) => item.partnerId === partnerId);
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  }
  if (path === '/v1/partner/commissions' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const items = readMockData().commissions.filter((item) => item.partnerId === partnerId);
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  }
  if (path === '/v1/partner/tickets' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const items = readMockData().tickets.filter((item) => item.partnerId === partnerId);
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  }
  if (path === '/v1/partner/customers' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    const items = readMockData().customers.filter(
      (customer) =>
        customer.partnerId === partnerId ||
        partnerPath(customer.partnerId, readMockData().partners).includes(partnerId ?? ''),
    );
    return json({ items, total: items.length, page: 1, pageSize: 50 });
  }
  if (path === '/v1/admin/wallet/topups' && method === 'GET') {
    const data = readMockData();
    const items = data.topups.map((topup) => ({
      ...topup,
      partnerName: data.partners.find((partner) => partner.id === topup.partnerId)?.businessName,
    }));
    return json({ items, total: items.length, page: 1, pageSize: 100 });
  }
  if (path.startsWith('/v1/admin/wallet/topups/') && method === 'POST') {
    const id = path.split('/').at(-2) ?? '';
    const approved = path.endsWith('/approve');
    const data = readMockData();
    const topup = data.topups.find((item) => item.id === id);
    if (!topup || topup.status !== 'pending')
      return json({ message: 'Pending top-up request not found.' }, 409);
    const now = new Date().toISOString();
    const status = approved ? 'approved' : 'rejected';
    if (approved) {
      const wallet = data.wallets.find((item) => item.partnerId === topup.partnerId);
      if (!wallet) return json({ message: 'Wallet not found.' }, 404);
      const ledgerId = BigInt(Date.now()).toString(16).padStart(24, '0');
      const ledgerEntry = {
        _id: ledgerId,
        partnerId: topup.partnerId,
        walletId: wallet._id,
        type: 'credit' as const,
        amountPaise: topup.amountPaise,
        balanceAfterPaise: wallet.balancePaise + topup.amountPaise,
        referenceType: 'topup',
        referenceId: topup.id,
        description: 'Approved wallet top-up',
        createdAt: now,
        createdBy: currentDemoUser()?.id ?? demoUsers.admin.id,
      };
      appendLedgerEntry(
        data.ledger.map((item) => ({
          id: item._id,
          direction: item.type,
          amountPaise: item.amountPaise,
          referenceId: item.referenceId,
        })),
        {
          id: ledgerId,
          direction: 'credit',
          amountPaise: topup.amountPaise,
          referenceId: topup.id,
        },
      );
      updateMockData((current) => ({
        ...current,
        topups: current.topups.map((item) => (item.id === id ? { ...item, status } : item)),
        wallets: current.wallets.map((item) =>
          item.partnerId === topup.partnerId
            ? { ...item, balancePaise: item.balancePaise + topup.amountPaise, updatedAt: now }
            : item,
        ),
        ledger: [ledgerEntry, ...current.ledger],
      }));
    } else
      updateMockData((current) => ({
        ...current,
        topups: current.topups.map((item) => (item.id === id ? { ...item, status } : item)),
      }));
    writeAudit(`wallet.topup_${status}`, 'wallet_topup', id);
    return json({ status }, 201);
  }
  if (path.startsWith('/v1/files/kyc/applications/') && method === 'POST') {
    const id = path.split('/').at(-1) ?? '';
    writeAudit('application.kyc_uploaded', 'application', id);
    return json(
      { accepted: true, documentId: BigInt(Date.now()).toString(16).padStart(24, '0') },
      201,
    );
  }
  if (path === '/v1/admin/orders' && method === 'GET')
    return json({
      items: readMockData().orders,
      total: readMockData().orders.length,
      page: 1,
      pageSize: 200,
    });
  if (path === '/v1/files/kyc/mine') {
    const ownerId = currentDemoUser()?.partner?.id;
    return json(
      readMockData().kycDocuments.filter(
        (doc) => doc.ownerType === 'partner' && doc.ownerId === ownerId,
      ),
    );
  }
  if (path === '/v1/files/kyc' && method === 'POST') {
    const form = init.body instanceof FormData ? init.body : null;
    const file = form?.get('file');
    const ownerId = String(form?.get('ownerId') ?? '');
    const docType = String(form?.get('docType') ?? '');
    const actor = currentDemoUser();
    if (!actor?.partner || ownerId !== actor.partner.id)
      return json({ message: 'You can only upload documents for your own partner profile.' }, 403);
    if (!file || typeof file === 'string') return json({ message: 'Choose a document.' }, 400);
    if (file.size > 10 * 1024 * 1024)
      return json({ message: 'Documents must be 10 MiB or smaller.' }, 413);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))
      return json({ message: 'Use a PDF, JPEG, or PNG document.' }, 415);
    if (
      !['pan_card', 'gst_certificate', 'identity_proof', 'address_proof', 'bank_proof'].includes(
        docType,
      )
    )
      return json({ message: 'Choose a supported KYC document type.' }, 400);
    const document: MockKycDocument = {
      id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      ownerType: 'partner',
      ownerId,
      docType,
      contentType: file.type,
      sizeBytes: file.size,
      status: 'pending',
      objectKey: `private/demo/${actor.partner.id}/${Date.now()}`,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };
    updateMockData((data) => ({ ...data, kycDocuments: [document, ...data.kycDocuments] }));
    writeAudit('kyc.document_uploaded', 'kyc_document', document.id);
    return json({ accepted: true, documentId: document.id }, 201);
  }
  if (path === '/v1/partner/network') {
    const actor = currentDemoUser();
    const root = actor?.partner?.id;
    const data = readMockData();
    const allowed = root
      ? new Set(
          scopedPartnerIds(
            root,
            data.partners.map((partner) => ({
              id: partner.id,
              path: partnerPath(partner.id, data.partners),
            })),
          ),
        )
      : new Set<string>();
    const items = data.partners.filter((partner) => partner.id !== root && allowed.has(partner.id));
    return json({
      total: items.length,
      countsByTier: Object.fromEntries(
        ['retailer', 'distributor', 'master_distributor'].map((tier) => [
          tier,
          items.filter((item) => item.tier === tier).length,
        ]),
      ),
      items,
    });
  }
  if (path === '/v1/partner/notices' && method === 'GET')
    return json({ items: readMockData().content.filter((item) => item.status === 'published') });
  if (path === '/v1/partner/invites' && method === 'POST') {
    const partner = currentDemoUser()?.partner;
    if (!partner) return json({ message: 'A partner account is required to invite.' }, 403);
    const expectedTier = partner.tier === 'master_distributor' ? 'distributor' : 'retailer';
    if (body.tier !== expectedTier)
      return json({ message: 'You can invite only the next tier in your network.' }, 403);
    if (
      ![body.businessName, body.ownerName, body.email, body.mobile].every(
        (value) => typeof value === 'string' && value.trim(),
      )
    )
      return json({ message: 'Complete all partner invitation details.' }, 400);
    const id = BigInt(Date.now()).toString(16).padStart(24, '0');
    const application: (typeof demoApplications)[number] = {
      id,
      applicantName: String(body.ownerName).trim(),
      email: String(body.email).trim().toLowerCase(),
      businessName: String(body.businessName).trim(),
      requestedTier: expectedTier as (typeof demoApplications)[number]['requestedTier'],
      status: 'pending_email_verification',
      receivedAt: new Date().toISOString(),
    };
    updateMockData((data) => ({ ...data, applications: [application, ...data.applications] }));
    writeAudit('partner.invite_created', 'application', id);
    return json({ applicationId: id, verificationToken: `invite-${id}` }, 201);
  }
  if (path === '/v1/partner/team' && method === 'GET') {
    const partnerId = currentDemoUser()?.partner?.id;
    return json({
      items: readMockData().partnerUsers.filter((member) => member.partnerId === partnerId),
    });
  }
  if (path === '/v1/partner/team' && method === 'POST') {
    const actor = currentDemoUser();
    const partnerId = actor?.partner?.id;
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const name = String(body.name ?? '').trim();
    const requested = Array.isArray(body.staffPermissions) ? body.staffPermissions.map(String) : [];
    const allowed = new Set([
      'orders.read',
      'orders.create',
      'wallet.read',
      'wallet.topup_request',
      'customers.read',
      'customers.manage',
      'tickets.read',
      'tickets.manage',
      'services.read',
      'files.upload',
      'files.download',
    ]);
    if (
      !partnerId ||
      !email.includes('@') ||
      name.length < 2 ||
      !requested.length ||
      requested.some(
        (permission) => !allowed.has(permission) || !actor.permissions.includes(permission),
      )
    )
      return json({ message: 'Enter a valid staff name, email, and permission subset.' }, 400);
    if (
      readMockData().partnerUsers.some(
        (member) => member.partnerId === partnerId && member.email === email,
      )
    )
      return json({ message: 'This email already has a team invitation.' }, 409);
    const id = BigInt(Date.now()).toString(16).padStart(24, '0');
    const now = new Date().toISOString();
    const member: MockPartnerUser = {
      _id: id,
      partnerId,
      userId: BigInt(Date.now() + 1)
        .toString(16)
        .padStart(24, '0'),
      role: 'staff' as const,
      staffPermissions: requested,
      status: 'disabled' as const,
      name,
      email,
      createdAt: now,
      updatedAt: now,
      inviteToken: `staff-${id}`,
    };
    updateMockData((data) => ({ ...data, partnerUsers: [member, ...data.partnerUsers] }));
    writeAudit('partner.staff_invited', 'partner_user', id);
    return json({ member, invitationToken: member.inviteToken }, 201);
  }
  if (path.startsWith('/v1/partner/team/') && method === 'PATCH') {
    const id = path.split('/').at(-1) ?? '';
    const partnerId = currentDemoUser()?.partner?.id;
    const member = readMockData().partnerUsers.find(
      (item) => item._id === id && item.partnerId === partnerId,
    );
    if (!member || member.role === 'owner') return json({ message: 'Team member not found.' }, 404);
    if (body.status !== 'active' && body.status !== 'disabled')
      return json({ message: 'Choose active or disabled.' }, 400);
    updateMockData((data) => ({
      ...data,
      partnerUsers: data.partnerUsers.map((item) =>
        item._id === id
          ? {
              ...item,
              status: body.status as 'active' | 'disabled',
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
    writeAudit(`partner.staff_${String(body.status)}`, 'partner_user', id);
    return json({ status: body.status });
  }
  if (path === '/v1/partner/customers' && method === 'POST') {
    if (body.consent !== true)
      return json({ message: 'Record customer consent before saving.' }, 400);
    const actor = currentDemoUser();
    if (!actor?.partner) return json({ message: 'Partner profile not found.' }, 403);
    const fullName = String(body.fullName ?? '').trim();
    const mobile = String(body.mobile ?? '').replaceAll(' ', '');
    if (fullName.length < 2 || !/^\+?[0-9]{10,15}$/.test(mobile))
      return json({ message: 'Enter a valid customer name and mobile number.' }, 400);
    const now = new Date().toISOString();
    const customer = {
      _id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      partnerId: actor.partner.id,
      fullName,
      mobile,
      email: String(body.email ?? ''),
      consentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    updateMockData((data) => ({ ...data, customers: [customer, ...data.customers] }));
    writeAudit('customer.created', 'customer', customer._id);
    return json({ customer }, 201);
  }
  if (path === '/v1/partner/tickets' && method === 'POST') {
    const actor = currentDemoUser();
    if (!actor?.partner) return json({ message: 'Partner profile not found.' }, 403);
    const subject = String(body.subject ?? '').trim();
    if (subject.length < 3 || !String(body.message ?? '').trim())
      return json({ message: 'Add a subject and ticket details.' }, 400);
    const now = new Date().toISOString();
    const ticket = {
      _id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      partnerId: actor.partner.id,
      ticketNumber: `TKT-26-${Date.now().toString().slice(-5)}`,
      subject,
      category: String(body.category ?? 'technical'),
      status: 'open' as const,
      priority: 'normal' as const,
      createdAt: now,
      updatedAt: now,
    };
    updateMockData((data) => ({ ...data, tickets: [ticket, ...data.tickets] }));
    writeAudit('ticket.created', 'ticket', ticket._id);
    return json({ ticket }, 201);
  }
  if (path.startsWith('/v1/orders/') && path.endsWith('/query') && method === 'POST') {
    const id = path.split('/').at(-2) ?? '';
    const data = readMockData();
    const order = data.orders.find((item) => item._id === id);
    const actor = currentDemoUser();
    if (
      !order ||
      !actor?.partner ||
      !scopedPartnerIds(
        actor.partner.id,
        data.partners.map((partner) => ({
          id: partner.id,
          path: partnerPath(partner.id, data.partners),
        })),
      ).includes(order.partnerId)
    )
      return json({ message: 'Order not found.' }, 404);
    if (order.status !== 'query')
      return json({ message: 'This order does not have an open query.' }, 409);
    const response = String(body.response ?? '').trim();
    if (!response) return json({ message: 'Enter a response.' }, 400);
    const event = {
      _id: BigInt(Date.now()).toString(16).padStart(24, '0'),
      orderId: id,
      fromStatus: 'query',
      toStatus: 'query',
      note: `Partner response: ${response}`,
      actorUserId: actor.id,
      createdAt: new Date().toISOString(),
    };
    updateMockData((state) => ({ ...state, orderEvents: [event, ...state.orderEvents] }));
    writeAudit('order.query_answered', 'order', id);
    return json({ accepted: true }, 201);
  }
  if (path.startsWith('/v1/files/kyc/')) {
    const id = path.split('/').at(-1) ?? '';
    const document = readMockData().kycDocuments.find((item) => item.id === id);
    const actor = currentDemoUser();
    if (!document) return json({ message: 'Document not found.' }, 404);
    if (
      actor?.partner &&
      document.ownerId !== actor.partner.id &&
      !scopedPartnerIds(
        actor.partner.id,
        readMockData().partners.map((partner) => ({
          id: partner.id,
          path: partnerPath(partner.id, readMockData().partners),
        })),
      ).includes(document.ownerId)
    )
      return json({ message: 'Document not found.' }, 404);
    writeAudit('kyc.document_viewed', 'kyc_document', id);
    return new Response('%PDF-1.7\nPrivate mock KYC document\n%%EOF', {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'cache-control': 'private, no-store' },
    });
  }
  return json({ message: 'This action is not available in the local demo.' }, 404);
}

export function getMockCsrfToken(): string {
  return csrfToken;
}

export function resetMockSession(): void {
  csrfToken = 'demo-csrf-token';
}

type MockData = ReturnType<typeof initialMockData>;
type MockPartnerUser = {
  _id: string;
  partnerId: string;
  userId: string;
  role: 'owner' | 'staff';
  staffPermissions: string[];
  status: 'active' | 'disabled';
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  inviteToken?: string;
};
type MockKycDocument = {
  id: string;
  ownerType: 'partner' | 'application';
  ownerId: string;
  docType: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
};
function readMockData(): MockData {
  if (typeof window === 'undefined') return initialMockData();
  try {
    const raw = window.localStorage.getItem(dataKey);
    if (raw) {
      const stored = JSON.parse(raw) as MockData;
      if (stored.orders && stored.wallets && stored.ledger && stored.topups)
        return { ...initialMockData(), ...stored };
    }
  } catch {
    /* malformed local demo data is reset to a clean seed */
  }
  return initialMockData();
}
function initialMockData() {
  return {
    applications: allDemoApplications,
    partners: allDemoPartners,
    audit: demoAudit,
    orders: demoOrders,
    wallets: demoWallets,
    ledger: demoLedger,
    orderEvents: demoOrderEvents,
    services: demoServices,
    payouts: demoPayouts,
    commissions: demoCommissions,
    tickets: demoTickets,
    notifications: demoNotifications,
    topups: demoTopups,
    customers: demoCustomers,
    content: [
      {
        id: '64a900000000000000000001',
        title: 'Welcome to the partner network',
        body: 'Your local service desk is ready for new customer requests.',
        status: 'published',
        createdAt: '2026-11-20T10:00:00.000Z',
      },
      {
        id: '64a900000000000000000002',
        title: 'November settlement window',
        body: 'Submit eligible payout requests before the monthly review closes.',
        status: 'published',
        createdAt: '2026-11-18T10:00:00.000Z',
      },
    ],
    settings: { gstin: '27AABCS1234F1Z5', gstRateBps: 1800, intraState: true, invoicePrefix: 'SN' },
    commissionRules: [
      { tier: 'master_distributor', basisPoints: 600 },
      { tier: 'distributor', basisPoints: 350 },
      { tier: 'retailer', basisPoints: 200 },
    ],
    orderDocuments: [] as Array<{
      id: string;
      orderId: string;
      name: string;
      contentType: string;
      sizeBytes: number;
      visibility: 'private';
      createdAt: string;
    }>,
    partnerUsers: [
      {
        _id: '64ab00000000000000000001',
        partnerId: demoUsers.partner.partner!.id,
        userId: demoUsers.partner.id,
        role: 'owner' as const,
        staffPermissions: demoUsers.partner.permissions,
        status: 'active' as const,
        name: demoUsers.partner.name,
        email: demoUsers.partner.email,
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-20T10:00:00.000Z',
      },
    ] as MockPartnerUser[],
    kycDocuments: demoDocuments.map((doc) => ({
      id: doc.id,
      ownerType: 'partner',
      ownerId: demoUsers.partner.partner!.id,
      docType: doc.docType,
      objectKey: `private/demo/${doc.id}`,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      expiresAt: doc.expiresAt ?? null,
      createdAt: '2026-11-20T10:00:00.000Z',
    })) as MockKycDocument[],
  };
}
function updateMockData(transform: (current: MockData) => MockData): void {
  const next = transform(readMockData());
  if (typeof window !== 'undefined') window.localStorage.setItem(dataKey, JSON.stringify(next));
}
function writeAudit(action: string, entity: string, entityId: string): void {
  const actor = currentDemoUser();
  const event = {
    _id: BigInt(Date.now()).toString(16).padStart(24, '0'),
    actorUserId: actor?.id ?? '64a100000000000000000001',
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
    metadata: { demo: true },
  };
  updateMockData((data) => ({ ...data, audit: [event, ...data.audit] }));
}
export function resetMockData(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(dataKey);
  window.localStorage.removeItem(sessionKey);
  window.location.reload();
}
