import mongoose, { Schema, Types } from 'mongoose';

export type IdentityKind = 'admin' | 'partner';
export type UserStatus = 'active' | 'disabled';

export interface UserRecord {
  email: string;
  passwordHash: string;
  name: string;
  mobile?: string;
  kind: IdentityKind;
  status: UserStatus;
  roleIds: Types.ObjectId[];
  totpSecretEnc?: string;
  totpEnabled: boolean;
  recoveryCodeHashes: string[];
  failedLogins: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRecord {
  key: string;
  name: string;
  kind: IdentityKind;
  permissions: string[];
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditRecord {
  actorUserId?: Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface PasswordResetRecord {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface EmailOutboxRecord {
  to: string;
  template: string;
  variables: Record<string, string>;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  sentAt?: Date;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    kind: { type: String, enum: ['admin', 'partner'], required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', required: true },
    roleIds: { type: [Schema.Types.ObjectId], default: [] },
    totpSecretEnc: { type: String, select: false },
    totpEnabled: { type: Boolean, default: false, required: true },
    recoveryCodeHashes: { type: [String], default: [], select: false },
    failedLogins: { type: Number, default: 0, min: 0, required: true },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true, collection: 'users' },
);
userSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' });
userSchema.index({ kind: 1, status: 1 }, { name: 'users_kind_status' });

const roleSchema = new Schema<RoleRecord>(
  {
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['admin', 'partner'], required: true },
    permissions: { type: [String], default: [] },
    system: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'roles' },
);
roleSchema.index({ key: 1 }, { unique: true, name: 'roles_key_unique' });

const auditSchema = new Schema<AuditRecord>(
  {
    actorUserId: Schema.Types.ObjectId,
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false, collection: 'audit_log', strict: 'throw' },
);
auditSchema.index({ createdAt: -1 }, { name: 'audit_created_desc' });
auditSchema.index({ actorUserId: 1, createdAt: -1 }, { name: 'audit_actor_created_desc' });
auditSchema.index({ entity: 1, entityId: 1, createdAt: -1 }, { name: 'audit_entity_created_desc' });

const rejectAuditMutation = function rejectAuditMutation(): never {
  throw new Error('audit_log is append-only');
};
for (const operation of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const) {
  auditSchema.pre(operation, rejectAuditMutation);
}

const resetSchema = new Schema<PasswordResetRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false, collection: 'password_reset_tokens' },
);
resetSchema.index({ tokenHash: 1 }, { unique: true, name: 'reset_token_hash_unique' });
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'reset_token_expiry' });

const outboxSchema = new Schema<EmailOutboxRecord>(
  {
    to: { type: String, required: true },
    template: { type: String, required: true },
    variables: { type: Map, of: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed'],
      default: 'pending',
      required: true,
    },
    attempts: { type: Number, default: 0, min: 0, required: true },
    nextAttemptAt: { type: Date, default: Date.now, required: true },
    lastError: String,
    sentAt: Date,
    lockedAt: Date,
  },
  { timestamps: true, collection: 'email_outbox' },
);
outboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 }, { name: 'outbox_pending' });

function getModel<T>(name: string, schema: Schema<T>, collection: string) {
  return (
    (mongoose.models[name] as mongoose.Model<T> | undefined) ??
    mongoose.model<T>(name, schema, collection)
  );
}

export const UserModel = getModel<UserRecord>('IdentityUser', userSchema, 'users');
export const RoleModel = getModel<RoleRecord>('IdentityRole', roleSchema, 'roles');
export const AuditModel = getModel<AuditRecord>('AuditRecord', auditSchema, 'audit_log');
export const PasswordResetModel = getModel<PasswordResetRecord>(
  'PasswordReset',
  resetSchema,
  'password_reset_tokens',
);
export const EmailOutboxModel = getModel<EmailOutboxRecord>(
  'EmailOutbox',
  outboxSchema,
  'email_outbox',
);
