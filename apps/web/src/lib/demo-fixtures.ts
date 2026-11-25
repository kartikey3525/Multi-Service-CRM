import type { ApplicationSummary, DemoUser, KycDocumentSummary, PartnerSummary } from './contracts';

export const demoUsers: Record<'admin' | 'partner', DemoUser> = {
  admin: {
    id: '64a100000000000000000001',
    email: 'admin@servicenetwork.demo',
    name: 'Avery Mehta',
    kind: 'admin',
    roleNames: ['Operations administrator'],
    permissions: [
      'identity.me',
      'applications.read',
      'applications.review',
      'partners.read',
      'partners.manage',
      'admin_users.read',
      'admin_users.write',
      'audit.read',
    ],
    totpEnabled: true,
  },
  partner: {
    id: '64a100000000000000000002',
    email: 'partner@servicenetwork.demo',
    name: 'Riya Kapoor',
    kind: 'partner',
    roleNames: ['Master distributor'],
    permissions: ['identity.me', 'files.upload', 'files.download', 'team.read'],
    totpEnabled: false,
    partner: {
      id: '64a100000000000000000003',
      code: 'SN-MH-2048',
      tier: 'master_distributor',
      status: 'active',
    },
  },
};

export const demoPartners: PartnerSummary[] = [
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
  { _id: '64a500000000000000000001', key: 'retailer', name: 'Retailer', kind: 'partner' },
  { _id: '64a500000000000000000002', key: 'distributor', name: 'Distributor', kind: 'partner' },
  {
    _id: '64a500000000000000000003',
    key: 'master_distributor',
    name: 'Master distributor',
    kind: 'partner',
  },
  {
    _id: '64a500000000000000000004',
    key: 'operations_admin',
    name: 'Operations administrator',
    kind: 'admin',
  },
];
