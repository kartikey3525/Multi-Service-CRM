import { Permission } from '@franchise-crm/shared';
import { RoleModel, type IdentityKind } from './models';

type SeedRole = { key: string; name: string; kind: IdentityKind; permissions: string[] };

const ownPartner = [
  Permission.identityMe,
  Permission.identityTwoFactorManage,
  Permission.identityLogout,
];
const adminIdentity = [
  Permission.identityMe,
  Permission.identityTwoFactorManage,
  Permission.identityLogout,
];

const roleDefinitions: SeedRole[] = [
  {
    key: 'super_admin',
    name: 'Super administrator',
    kind: 'admin',
    permissions: Object.values(Permission),
  },
  {
    key: 'kyc_reviewer',
    name: 'KYC reviewer',
    kind: 'admin',
    permissions: [
      ...adminIdentity,
      Permission.applicationsRead,
      Permission.applicationsReview,
      Permission.partnersRead,
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    kind: 'admin',
    permissions: [
      ...adminIdentity,
      Permission.plansRead,
      Permission.plansManage,
      Permission.walletRead,
      Permission.walletTopupApprove,
      Permission.walletAdjust,
      Permission.payoutsRead,
      Permission.payoutsManage,
      Permission.reportsRead,
    ],
  },
  {
    key: 'processor',
    name: 'Order processor',
    kind: 'admin',
    permissions: [
      ...adminIdentity,
      Permission.ordersRead,
      Permission.ordersProcess,
      Permission.filesDownload,
    ],
  },
  {
    key: 'support',
    name: 'Support',
    kind: 'admin',
    permissions: [
      ...adminIdentity,
      Permission.partnersRead,
      Permission.ordersRead,
      Permission.ticketsRead,
      Permission.ticketsManage,
      Permission.filesDownload,
    ],
  },
  {
    key: 'content_manager',
    name: 'Content manager',
    kind: 'admin',
    permissions: [...adminIdentity, Permission.contentRead, Permission.contentManage],
  },
  {
    key: 'sales',
    name: 'Sales',
    kind: 'admin',
    permissions: [
      ...adminIdentity,
      Permission.applicationsRead,
      Permission.partnersRead,
      Permission.plansRead,
      Permission.leadsRead,
      Permission.leadsManage,
      Permission.reportsRead,
    ],
  },
  {
    key: 'master_distributor',
    name: 'Master distributor',
    kind: 'partner',
    permissions: [
      ...ownPartner,
      Permission.walletRead,
      Permission.walletTopupRequest,
      Permission.ordersRead,
      Permission.ordersCreate,
      Permission.customersRead,
      Permission.customersManage,
      Permission.leadsRead,
      Permission.leadsManage,
      Permission.teamRead,
      Permission.teamManage,
      Permission.reportsRead,
      Permission.filesUpload,
      Permission.filesDownload,
    ],
  },
  {
    key: 'distributor',
    name: 'Distributor',
    kind: 'partner',
    permissions: [
      ...ownPartner,
      Permission.walletRead,
      Permission.walletTopupRequest,
      Permission.ordersRead,
      Permission.ordersCreate,
      Permission.customersRead,
      Permission.customersManage,
      Permission.leadsRead,
      Permission.leadsManage,
      Permission.teamRead,
      Permission.teamManage,
      Permission.filesUpload,
      Permission.filesDownload,
    ],
  },
  {
    key: 'retailer',
    name: 'Retailer',
    kind: 'partner',
    permissions: [
      ...ownPartner,
      Permission.walletRead,
      Permission.walletTopupRequest,
      Permission.ordersRead,
      Permission.ordersCreate,
      Permission.customersRead,
      Permission.customersManage,
      Permission.leadsRead,
      Permission.leadsManage,
      Permission.filesUpload,
      Permission.filesDownload,
    ],
  },
  {
    key: 'partner_staff',
    name: 'Partner staff',
    kind: 'partner',
    permissions: [
      ...ownPartner,
      Permission.ordersRead,
      Permission.customersRead,
      Permission.leadsRead,
    ],
  },
];

export async function seedRoles(): Promise<void> {
  for (const role of roleDefinitions) {
    try {
      await RoleModel.updateOne(
        { key: role.key },
        { $setOnInsert: { ...role, system: true } },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
}

export async function getSeedRole(key: string) {
  return RoleModel.findOne({ key });
}
