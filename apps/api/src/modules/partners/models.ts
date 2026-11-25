import mongoose, { Schema, Types } from 'mongoose';

export type PartnerTier = 'master_distributor' | 'distributor' | 'retailer';
export type ApplicationStatus =
  'pending_email_verification' | 'submitted' | 'needs_info' | 'approved' | 'rejected';

export interface TerritoryRecord {
  key: string;
  name: string;
  state: string;
  pinPrefixes: string[];
  exclusive: boolean;
  active: boolean;
  currentPartnerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationRecord {
  applicantName: string;
  email: string;
  mobile: string;
  businessName: string;
  legalType: string;
  city: string;
  state: string;
  pin: string;
  requestedTier: PartnerTier;
  territoryId?: Types.ObjectId;
  emailVerificationTokenHash: string;
  emailVerificationExpiresAt: Date;
  emailVerifiedAt?: Date;
  status: ApplicationStatus;
  reviewerId?: Types.ObjectId;
  decisionReason?: string;
  partnerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerRecord {
  code: string;
  parentId?: Types.ObjectId;
  path: Types.ObjectId[];
  tier: PartnerTier;
  status: 'pending_payment' | 'active' | 'suspended' | 'closed';
  applicationId: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  businessName: string;
  legalType: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  pin: string;
  territoryId?: Types.ObjectId;
  panEnc?: string;
  gstin?: string;
  address?: string;
  bankAccountEnc?: string;
  bankIfsc?: string;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerUserRecord {
  partnerId: Types.ObjectId;
  userId: Types.ObjectId;
  role: 'owner' | 'staff';
  staffPermissions: string[];
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

export interface KycDocumentRecord {
  ownerType: 'application' | 'partner';
  ownerId: Types.ObjectId;
  docType: string;
  fileKey: string;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const territorySchema = new Schema<TerritoryRecord>(
  {
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pinPrefixes: { type: [String], required: true, default: [] },
    exclusive: { type: Boolean, required: true, default: false },
    active: { type: Boolean, required: true, default: true },
    currentPartnerId: Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'territories' },
);
territorySchema.index({ key: 1 }, { unique: true, name: 'territories_key_unique' });
territorySchema.index({ state: 1, active: 1 }, { name: 'territories_state_active' });

const applicationSchema = new Schema<ApplicationRecord>(
  {
    applicantName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    legalType: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pin: { type: String, required: true, trim: true },
    requestedTier: {
      type: String,
      enum: ['master_distributor', 'distributor', 'retailer'],
      required: true,
    },
    territoryId: Schema.Types.ObjectId,
    emailVerificationTokenHash: { type: String, required: true, select: false },
    emailVerificationExpiresAt: { type: Date, required: true, select: false },
    emailVerifiedAt: Date,
    status: {
      type: String,
      enum: ['pending_email_verification', 'submitted', 'needs_info', 'approved', 'rejected'],
      required: true,
    },
    reviewerId: Schema.Types.ObjectId,
    decisionReason: String,
    partnerId: Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'applications' },
);
applicationSchema.index({ status: 1, createdAt: -1 }, { name: 'applications_status_created' });
applicationSchema.index({ email: 1, createdAt: -1 }, { name: 'applications_email_created' });
applicationSchema.index(
  { emailVerificationTokenHash: 1 },
  { unique: true, sparse: true, name: 'applications_verify_hash_unique' },
);

const partnerSchema = new Schema<PartnerRecord>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    parentId: Schema.Types.ObjectId,
    path: { type: [Schema.Types.ObjectId], required: true, default: [] },
    tier: { type: String, enum: ['master_distributor', 'distributor', 'retailer'], required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'active', 'suspended', 'closed'],
      required: true,
    },
    applicationId: { type: Schema.Types.ObjectId, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, required: true },
    businessName: { type: String, required: true, trim: true },
    legalType: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pin: { type: String, required: true, trim: true },
    territoryId: Schema.Types.ObjectId,
    panEnc: String,
    gstin: String,
    address: String,
    bankAccountEnc: String,
    bankIfsc: String,
    activatedAt: Date,
  },
  { timestamps: true, collection: 'partners' },
);
partnerSchema.index({ code: 1 }, { unique: true, name: 'partners_code_unique' });
partnerSchema.index({ applicationId: 1 }, { unique: true, name: 'partners_application_unique' });
partnerSchema.index({ path: 1 }, { name: 'partners_path' });
partnerSchema.index({ parentId: 1, tier: 1, status: 1 }, { name: 'partners_parent_tier_status' });

const partnerUserSchema = new Schema<PartnerUserRecord>(
  {
    partnerId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['owner', 'staff'], required: true },
    staffPermissions: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'disabled'], required: true, default: 'active' },
  },
  { timestamps: true, collection: 'partner_users' },
);
partnerUserSchema.index(
  { partnerId: 1, userId: 1 },
  { unique: true, name: 'partner_users_unique' },
);
partnerUserSchema.index({ userId: 1 }, { unique: true, name: 'partner_users_user_unique' });

const kycDocumentSchema = new Schema<KycDocumentRecord>(
  {
    ownerType: { type: String, enum: ['application', 'partner'], required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    docType: { type: String, required: true, trim: true },
    fileKey: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], required: true },
    verifiedBy: Schema.Types.ObjectId,
    verifiedAt: Date,
    rejectionReason: String,
    expiresAt: Date,
  },
  { timestamps: true, collection: 'kyc_documents' },
);
kycDocumentSchema.index({ ownerType: 1, ownerId: 1, docType: 1 }, { name: 'kyc_owner_type' });
kycDocumentSchema.index({ status: 1, expiresAt: 1 }, { name: 'kyc_status_expiry' });

function model<T>(name: string, schema: Schema<T>, collection: string) {
  return (
    (mongoose.models[name] as mongoose.Model<T> | undefined) ??
    mongoose.model<T>(name, schema, collection)
  );
}

export const TerritoryModel = model<TerritoryRecord>('Territory', territorySchema, 'territories');
export const ApplicationModel = model<ApplicationRecord>(
  'PartnerApplication',
  applicationSchema,
  'applications',
);
export const PartnerModel = model<PartnerRecord>('Partner', partnerSchema, 'partners');
export const PartnerUserModel = model<PartnerUserRecord>(
  'PartnerUser',
  partnerUserSchema,
  'partner_users',
);
export const KycDocumentModel = model<KycDocumentRecord>(
  'KycDocument',
  kycDocumentSchema,
  'kyc_documents',
);
