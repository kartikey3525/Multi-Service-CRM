import type { ApplicationSummary, DemoUser, KycDocumentSummary, PartnerSummary } from './contracts';

export const demoUsers: Record<'admin' | 'partner', DemoUser> = {
  admin: {
    id: '64a100000000000000000001',
    email: 'admin@servicenetwork.demo',
    name: 'Avery Mehta',
    kind: 'admin',
    roleNames: ['Super administrator'],
    permissions: [
      'identity.me',
      'applications.read',
      'applications.review',
      'partners.read',
      'partners.manage',
      'admin_users.read',
      'admin_users.write',
      'audit.read',
      'orders.read',
      'orders.process',
      'wallet.read',
      'wallet.topup_approve',
      'wallet.adjust',
      'services.read',
      'services.manage',
      'commissions.read',
      'commissions.manage',
      'payouts.read',
      'payouts.manage',
      'tickets.read',
      'tickets.manage',
      'reports.read',
      'content.read',
      'content.manage',
      'roles.read',
      'roles.manage',
      'settings.read',
      'settings.manage',
      'files.download',
    ],
    totpEnabled: true,
  },
  partner: {
    id: '64a100000000000000000002',
    email: 'partner@servicenetwork.demo',
    name: 'Riya Kapoor',
    kind: 'partner',
    roleNames: ['Master distributor'],
    permissions: [
      'identity.me',
      'files.upload',
      'files.download',
      'team.read',
      'orders.read',
      'orders.create',
      'wallet.read',
      'wallet.topup_request',
      'commissions.read',
      'payouts.read',
      'tickets.read',
      'tickets.manage',
      'customers.read',
      'customers.manage',
      'services.read',
      'content.read',
    ],
    totpEnabled: false,
    partner: {
      id: '64a100000000000000000003',
      code: 'SN-MH-2048',
      tier: 'master_distributor',
      status: 'active',
    },
  },
};

const initialPartners: PartnerSummary[] = [
  {
    id: '64a100000000000000000003',
    code: 'SN-MH-2048',
    parentId: null,
    depth: 0,
    tier: 'master_distributor',
    status: 'active',
    businessName: 'Kapoor Business Services',
    city: 'Pune',
    state: 'Maharashtra',
  },
  {
    id: '64a100000000000000000004',
    code: 'SN-MH-2416',
    parentId: '64a100000000000000000003',
    depth: 1,
    tier: 'distributor',
    status: 'active',
    businessName: 'Westline Enterprise Desk',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: '64a100000000000000000005',
    code: 'SN-MH-3182',
    parentId: '64a100000000000000000004',
    depth: 2,
    tier: 'retailer',
    status: 'pending_payment',
    businessName: 'Aarav Digital Point',
    city: 'Nashik',
    state: 'Maharashtra',
  },
  {
    id: '64a100000000000000000006',
    code: 'SN-MH-2520',
    parentId: '64a100000000000000000003',
    depth: 1,
    tier: 'distributor',
    status: 'suspended',
    businessName: 'Harbor Ledger Services',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
];

const generatedPartners: PartnerSummary[] = Array.from({ length: 29 }, (_, index) => {
  const tier = index === 0 ? 'master_distributor' : index < 5 ? 'distributor' : 'retailer';
  const id = (BigInt('0x64a100000000000000000100') + BigInt(index)).toString(16).padStart(24, '0');
  const generatedDistributor = (
    BigInt('0x64a100000000000000000100') + BigInt(1 + ((index - 5) % 4))
  )
    .toString(16)
    .padStart(24, '0');
  const parentId =
    tier === 'master_distributor'
      ? null
      : tier === 'distributor'
        ? initialPartners[0]!.id
        : generatedDistributor;
  const names = [
    'Sharma Digital Seva',
    'Maharashtra Citizen Hub',
    'Narmada Online Point',
    'Sahyadri Business Desk',
    'Deccan Service Centre',
  ];
  return {
    id,
    code: `SN-MH-${String(4000 + index * 17)}`,
    parentId,
    depth: tier === 'master_distributor' ? 0 : tier === 'distributor' ? 1 : 2,
    tier,
    status: index % 11 === 0 ? 'suspended' : 'active',
    businessName: `${names[index % names.length]} ${index + 1}`,
    city: ['Pune', 'Nashik', 'Mumbai', 'Nagpur', 'Kolhapur'][index % 5]!,
    state: 'Maharashtra',
  };
});

export const demoPartners: PartnerSummary[] = [...initialPartners, ...generatedPartners];

export const demoApplications: ApplicationSummary[] = [
  {
    id: '64a200000000000000000001',
    applicantName: 'Neha Desai',
    email: 'neha@example.demo',
    businessName: 'Desai Tax & Digital',
    requestedTier: 'retailer',
    status: 'submitted',
    receivedAt: '2026-11-24T08:20:00.000Z',
  },
  {
    id: '64a200000000000000000002',
    applicantName: 'Kabir Shah',
    email: 'kabir@example.demo',
    businessName: 'Shah Business Centre',
    requestedTier: 'distributor',
    status: 'needs_info',
    receivedAt: '2026-11-23T11:45:00.000Z',
  },
  {
    id: '64a200000000000000000003',
    applicantName: 'Sana Patil',
    email: 'sana@example.demo',
    businessName: 'Patil Citizen Services',
    requestedTier: 'retailer',
    status: 'submitted',
    receivedAt: '2026-11-22T14:10:00.000Z',
  },
];

export const demoDocuments: KycDocumentSummary[] = [
  {
    id: '64a300000000000000000001',
    docType: 'pan_card',
    contentType: 'application/pdf',
    sizeBytes: 284_300,
    status: 'verified',
    expiresAt: '2027-11-30T00:00:00.000Z',
  },
  {
    id: '64a300000000000000000002',
    docType: 'address_proof',
    contentType: 'image/jpeg',
    sizeBytes: 612_400,
    status: 'pending',
  },
];

export const demoAuditEvents = [
  {
    _id: '64a400000000000000000001',
    actorUserId: demoUsers.admin.id,
    action: 'application.approved',
    entity: 'application',
    entityId: demoApplications[0]?.id,
    createdAt: '2026-11-25T09:32:00.000Z',
  },
  {
    _id: '64a400000000000000000002',
    actorUserId: demoUsers.admin.id,
    action: 'partner.suspended',
    entity: 'partner',
    entityId: demoPartners[3]?.id,
    createdAt: '2026-11-24T16:08:00.000Z',
  },
  {
    _id: '64a400000000000000000003',
    actorUserId: demoUsers.partner.id,
    action: 'kyc.document_viewed',
    entity: 'kyc_document',
    entityId: demoDocuments[0]?.id,
    createdAt: '2026-11-24T11:15:00.000Z',
  },
];

export const demoRoles = [
  {
    _id: '64a500000000000000000001',
    key: 'retailer',
    name: 'Retailer',
    kind: 'partner',
    permissions: [
      'identity.me',
      'orders.read',
      'orders.create',
      'wallet.read',
      'wallet.topup_request',
      'services.read',
    ],
  },
  {
    _id: '64a500000000000000000002',
    key: 'distributor',
    name: 'Distributor',
    kind: 'partner',
    permissions: [
      'identity.me',
      'orders.read',
      'orders.create',
      'wallet.read',
      'wallet.topup_request',
      'services.read',
      'team.read',
    ],
  },
  {
    _id: '64a500000000000000000003',
    key: 'master_distributor',
    name: 'Master distributor',
    kind: 'partner',
    permissions: [
      'identity.me',
      'orders.read',
      'orders.create',
      'wallet.read',
      'wallet.topup_request',
      'services.read',
      'team.read',
    ],
  },
  {
    _id: '64a500000000000000000004',
    key: 'operations_admin',
    name: 'Operations administrator',
    kind: 'admin',
    permissions: [
      'identity.me',
      'applications.read',
      'applications.review',
      'partners.read',
      'partners.manage',
      'orders.read',
      'orders.process',
    ],
  },
  {
    _id: '64a500000000000000000005',
    key: 'finance',
    name: 'Finance administrator',
    kind: 'admin',
    permissions: [
      'identity.me',
      'wallet.read',
      'wallet.topup_approve',
      'payouts.read',
      'payouts.manage',
      'reports.read',
    ],
  },
  {
    _id: '64a500000000000000000006',
    key: 'support',
    name: 'Support administrator',
    kind: 'admin',
    permissions: ['identity.me', 'tickets.read', 'tickets.manage', 'partners.read'],
  },
  {
    _id: '64a500000000000000000007',
    key: 'content',
    name: 'Content administrator',
    kind: 'admin',
    permissions: ['identity.me', 'content.read', 'content.manage'],
  },
  {
    _id: '64a500000000000000000008',
    key: 'partner_review',
    name: 'Partner review administrator',
    kind: 'admin',
    permissions: ['identity.me', 'applications.read', 'applications.review', 'partners.read'],
  },
  {
    _id: '64a500000000000000000009',
    key: 'operations',
    name: 'Operations staff',
    kind: 'admin',
    permissions: ['identity.me', 'orders.read', 'orders.process', 'services.read'],
  },
];

const adminDemoUsers: DemoUser[] = [
  demoUsers.admin,
  ...['Operations', 'Finance', 'Partner review', 'Support', 'Content'].map((role, index) => ({
    ...demoUsers.admin,
    id: `64a70000000000000000000${index + 1}`,
    email: `${role.toLowerCase().replaceAll(' ', '.')}@servicenetwork.demo`,
    name: `${['Avery', 'Dev', 'Nisha', 'Rohan', 'Kavya', 'Manav'][index + 1]} ${['Mehta', 'Shah', 'Rao', 'Patel', 'Iyer'][index]}`,
    roleNames: [`${role} ${index === 0 ? 'administrator' : 'staff'}`],
    permissions:
      index === 0
        ? [
            'identity.me',
            'applications.read',
            'applications.review',
            'partners.read',
            'partners.manage',
            'admin_users.read',
            'admin_users.write',
            'audit.read',
            'orders.read',
            'orders.process',
            'wallet.read',
            'wallet.topup_approve',
            'reports.read',
            'services.read',
            'services.manage',
            'tickets.read',
            'tickets.manage',
            'settings.read',
            'settings.manage',
          ]
        : ['identity.me', 'applications.read', 'partners.read', 'orders.read', 'wallet.read'],
  })),
];

const partnerDemoUsers: DemoUser[] = [
  demoUsers.partner,
  ...(['distributor', 'retailer'] as const).map((tier, index): DemoUser => {
    const partner = demoPartners.find((item) => item.tier === tier && item.status === 'active')!;
    return {
      id: `64a80000000000000000000${index + 1}`,
      email: `${tier.replaceAll('_', '.')}@servicenetwork.demo`,
      name: tier === 'distributor' ? 'Devendra Kulkarni' : 'Mira Shah',
      kind: 'partner',
      roleNames: [tier === 'distributor' ? 'Distributor' : 'Retailer'],
      permissions: demoUsers.partner.permissions,
      totpEnabled: false,
      partner: { id: partner.id, code: partner.code, tier, status: partner.status },
      ...(tier === 'retailer' ? { mustChangePassword: true } : {}),
    };
  }),
];

export const demoLoginUsers: DemoUser[] = [...adminDemoUsers, ...partnerDemoUsers];
