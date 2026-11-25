import { z } from 'zod';
import { ApplicationStatus, OrderStatus, PartnerStatus, PayoutStatus } from './status.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const isoDate = z.string().datetime({ offset: true });
const paise = z.number().int().safe();

export const PartnerSchema = z.object({
  _id: id,
  code: z.string(),
  parentId: id.nullable(),
  path: z.array(id),
  tier: z.enum(['master_distributor', 'distributor', 'retailer']),
  status: z.enum(Object.values(PartnerStatus) as [string, ...string[]]),
  businessName: z.string(),
  legalName: z.string(),
  ownerUserId: id,
  city: z.string(),
  state: z.string(),
  pin: z.string().length(6),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type PartnerRecord = z.infer<typeof PartnerSchema>;

export const WalletSchema = z.object({
  _id: id,
  partnerId: id,
  balancePaise: paise,
  currency: z.literal('INR'),
  status: z.enum(['active', 'frozen']),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type WalletRecord = z.infer<typeof WalletSchema>;

export const LedgerEntrySchema = z.object({
  _id: id,
  partnerId: id,
  walletId: id,
  type: z.enum(['credit', 'debit']),
  amountPaise: paise.positive(),
  balanceAfterPaise: paise,
  referenceType: z.string(),
  referenceId: id,
  description: z.string(),
  createdAt: isoDate,
  createdBy: id,
});
export type LedgerEntryRecord = z.infer<typeof LedgerEntrySchema>;

export const OrderSchema = z.object({
  _id: id,
  orderNumber: z.string(),
  partnerId: id,
  customerId: id.nullable(),
  serviceId: id,
  status: z.enum(Object.values(OrderStatus) as [string, ...string[]]),
  amountPaise: paise.nonnegative(),
  gstPaise: paise.nonnegative(),
  totalPaise: paise.nonnegative(),
  assignedTo: id.nullable(),
  customerName: z.string(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type OrderRecord = z.infer<typeof OrderSchema>;

export const OrderEventSchema = z.object({
  _id: id,
  orderId: id,
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  note: z.string(),
  actorUserId: id,
  createdAt: isoDate,
});
export type OrderEventRecord = z.infer<typeof OrderEventSchema>;

export const ServiceSchema = z.object({
  _id: id,
  key: z.string(),
  name: z.string(),
  category: z.string(),
  active: z.boolean(),
  basePricePaise: paise.nonnegative(),
  gstRateBps: z.number().int().nonnegative(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type ServiceRecord = z.infer<typeof ServiceSchema>;

export const CommissionSchema = z.object({
  _id: id,
  partnerId: id,
  orderId: id,
  amountPaise: paise.nonnegative(),
  status: z.enum(['accrued', 'payable', 'paid', 'reversed']),
  createdAt: isoDate,
});
export type CommissionRecord = z.infer<typeof CommissionSchema>;

export const PayoutSchema = z.object({
  _id: id,
  partnerId: id,
  amountPaise: paise.positive(),
  status: z.enum(Object.values(PayoutStatus) as [string, ...string[]]),
  requestedAt: isoDate,
  processedAt: isoDate.nullable(),
  reference: z.string().nullable(),
});
export type PayoutRecord = z.infer<typeof PayoutSchema>;

export const TicketSchema = z.object({
  _id: id,
  partnerId: id,
  ticketNumber: z.string(),
  subject: z.string(),
  category: z.string(),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type TicketRecord = z.infer<typeof TicketSchema>;

export const KycDocumentSchema = z.object({
  _id: id,
  ownerType: z.enum(['application', 'partner']),
  ownerId: id,
  docType: z.string(),
  objectKey: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  status: z.enum(['pending', 'verified', 'rejected', 'expired']),
  expiresAt: isoDate.nullable(),
  createdAt: isoDate,
});
export type KycDocumentRecord = z.infer<typeof KycDocumentSchema>;

export const NotificationSchema = z.object({
  _id: id,
  userId: id,
  type: z.string(),
  title: z.string(),
  body: z.string(),
  readAt: isoDate.nullable(),
  createdAt: isoDate,
});
export type NotificationRecord = z.infer<typeof NotificationSchema>;

export const ApplicationRecordSchema = z.object({
  _id: id,
  applicantName: z.string(),
  email: z.string().email(),
  mobile: z.string(),
  businessName: z.string(),
  requestedTier: z.enum(['master_distributor', 'distributor', 'retailer']),
  status: z.enum(Object.values(ApplicationStatus) as [string, ...string[]]),
  parentId: id.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;

export const AuditRecordSchema = z.object({
  _id: id,
  actorUserId: id,
  action: z.string(),
  entity: z.string(),
  entityId: id,
  createdAt: isoDate,
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type AuditRecord = z.infer<typeof AuditRecordSchema>;

export const WalletTopupSchema = z.object({
  _id: id,
  partnerId: id,
  amountPaise: paise.positive(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reference: z.string(),
  requestedAt: isoDate,
  reviewedAt: isoDate.nullable(),
  reviewedBy: id.nullable(),
});
export type WalletTopupRecord = z.infer<typeof WalletTopupSchema>;

export const CustomerSchema = z.object({
  _id: id,
  partnerId: id,
  fullName: z.string(),
  mobile: z.string(),
  email: z.string().email().nullable(),
  consentAt: isoDate,
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type CustomerRecord = z.infer<typeof CustomerSchema>;

export const IdentityUserSchema = z.object({
  _id: id,
  email: z.string().email(),
  name: z.string(),
  kind: z.enum(['admin', 'partner']),
  status: z.enum(['active', 'locked', 'disabled']),
  roleIds: z.array(id),
  partnerId: id.nullable(),
  totpEnabled: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type IdentityUserRecord = z.infer<typeof IdentityUserSchema>;

export const PartnerUserSchema = z.object({
  _id: id,
  partnerId: id,
  userId: id,
  role: z.enum(['owner', 'staff']),
  staffPermissions: z.array(z.string()),
  status: z.enum(['active', 'disabled']),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type PartnerUserRecord = z.infer<typeof PartnerUserSchema>;

export const RoleSchema = z.object({
  _id: id,
  key: z.string(),
  name: z.string(),
  kind: z.enum(['admin', 'partner']),
  permissions: z.array(z.string()),
});
export type RoleRecord = z.infer<typeof RoleSchema>;

// Stable API view types are shared too; the web app must not redefine records locally.
export type PartnerSummary = Pick<
  PartnerRecord,
  'code' | 'parentId' | 'tier' | 'status' | 'businessName' | 'city' | 'state'
> & { id: string; depth: number };
export type ApplicationSummary = Pick<
  ApplicationRecord,
  'applicantName' | 'email' | 'businessName' | 'requestedTier' | 'status'
> & { id: string; receivedAt: string };
export type KycDocumentSummary = Pick<
  KycDocumentRecord,
  'docType' | 'contentType' | 'sizeBytes' | 'status'
> & { id: string; expiresAt?: string | null };
export type DemoUser = {
  id: string;
  email: string;
  name: string;
  kind: 'admin' | 'partner';
  roleNames: string[];
  permissions: string[];
  totpEnabled: boolean;
  mustChangePassword?: boolean;
  partner?: {
    id: string;
    code: string;
    tier: PartnerSummary['tier'];
    status: PartnerSummary['status'];
  };
};
