import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import {
  AuditModel,
  EmailOutboxModel,
  PasswordResetModel,
  RoleModel,
  UserModel,
} from '../identity/models';
import { digestToken, hashPassword, randomToken } from '../identity/security';
import { RateLimitService } from '../identity/rate-limit.service';
import {
  TerritoryModel,
  ApplicationModel,
  KycDocumentModel,
  PartnerModel,
  PartnerUserModel,
  type ApplicationStatus,
} from './models';
import { pinMatchesPrefixes } from './territories';

export interface NewApplication {
  applicantName: string;
  email: string;
  mobile: string;
  businessName: string;
  legalType: string;
  city: string;
  state: string;
  pin: string;
  requestedTier: 'master_distributor' | 'distributor' | 'retailer';
}

@Injectable()
export class ApplicationsService {
  constructor(@Inject(RateLimitService) private readonly rateLimits: RateLimitService) {}

  async territories(state?: string) {
    const query = state
      ? { state: new RegExp(`^${escapeRegex(state.trim())}$`, 'i'), active: true }
      : { active: true };
    const rows = await TerritoryModel.find(query).sort({ state: 1, name: 1 }).lean();
    return rows.map(({ _id, name, state: territoryState, pinPrefixes, exclusive }) => ({
      id: String(_id),
      name,
      state: territoryState,
      pinPrefixes,
      exclusive,
    }));
  }

  async territoryAvailability(state: string, pin: string) {
    if (!/^\d{6}$/.test(pin)) throw new BadRequestException('Enter a valid six-digit PIN code.');
    const territories = await TerritoryModel.find({
      state: new RegExp(`^${escapeRegex(state.trim())}$`, 'i'),
      active: true,
    }).lean();
    const territory = territories.find((candidate) =>
      pinMatchesPrefixes(pin, candidate.pinPrefixes),
    );
    if (!territory) return { available: false, territory: null };
    if (territory.exclusive && territory.currentPartnerId)
      return { available: false, territory: null };
    return { available: true, territory: { id: String(territory._id), name: territory.name } };
  }

  async submit(request: Request, input: NewApplication) {
    const email = input.email.trim().toLowerCase();
    await this.rateLimits.enforce([
      {
        namespace: 'application:submit:ip',
        subject: request.ip ?? request.socket.remoteAddress ?? 'unknown',
        maximum: 10,
        windowSeconds: 3600,
      },
      { namespace: 'application:submit:email', subject: email, maximum: 3, windowSeconds: 3600 },
    ]);

    const availability = await this.territoryAvailability(input.state, input.pin);
    if (!availability.available || !availability.territory)
      throw new BadRequestException('Partner applications are not open for this PIN code.');

    const token = randomBytes(32).toString('base64url');
    const uploadToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost';
    const verificationUrl = new URL('/apply/verify', baseUrl);
    verificationUrl.searchParams.set('token', token);
    const session = await mongoose.startSession();
    let applicationId = '';
    try {
      await session.withTransaction(async () => {
        const [application] = await ApplicationModel.create(
          [
            {
              ...input,
              email,
              state: input.state.trim(),
              territoryId: availability.territory?.id,
              emailVerificationTokenHash: tokenHash,
              emailVerificationExpiresAt: expiresAt,
              uploadTokenHash: digestToken(uploadToken),
              uploadTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'pending_email_verification',
            },
          ],
          { session },
        );
        if (!application) throw new Error('Application insert returned no document.');
        applicationId = String(application._id);
        await EmailOutboxModel.create(
          [
            {
              to: email,
              template: 'application_verify',
              variables: {
                applicantName: input.applicantName,
                verificationUrl: verificationUrl.toString(),
              },
              status: 'pending',
              attempts: 0,
              nextAttemptAt: new Date(),
            },
          ],
          { session },
        );
        await AuditModel.create(
          [
            {
              action: 'application.submitted',
              entity: 'application',
              entityId: String(application._id),
              createdAt: new Date(),
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { accepted: true, verificationRequired: true, applicationId, uploadToken };
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await mongoose.startSession();
    let applicationId = '';
    try {
      await session.withTransaction(async () => {
        const application = await ApplicationModel.findOneAndUpdate(
          {
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpiresAt: { $gt: new Date() },
            status: 'pending_email_verification',
          },
          { $set: { emailVerifiedAt: new Date(), status: 'submitted' } },
          { returnDocument: 'after', session },
        );
        if (!application)
          throw new BadRequestException('This verification link is invalid or expired.');
        applicationId = String(application._id);
        await AuditModel.create(
          [
            {
              action: 'application.email_verified',
              entity: 'application',
              entityId: applicationId,
              createdAt: new Date(),
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { verified: true };
  }

  async list(status?: ApplicationStatus, page = 1, pageSize = 50, search?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { applicantName: { $regex: escaped, $options: 'i' } },
        { businessName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      ApplicationModel.find(filter)
        .select('-emailVerificationTokenHash -emailVerificationExpiresAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      ApplicationModel.countDocuments(filter),
    ]);
    return { items, page, pageSize, total };
  }

  async detail(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid application ID.');
    const application = await ApplicationModel.findById(id)
      .select('-emailVerificationTokenHash -emailVerificationExpiresAt')
      .lean();
    if (!application) throw new NotFoundException('Application not found.');
    const documents = await KycDocumentModel.find({
      ownerType: 'application',
      ownerId: application._id,
    })
      .select('-fileKey')
      .sort({ createdAt: -1 })
      .lean();
    return { application, documents };
  }

  async eligibleParents(tier: 'master_distributor' | 'distributor') {
    const rows = await PartnerModel.find({ tier, status: 'active' })
      .select('_id code businessName city state')
      .sort({ code: 1 })
      .limit(500)
      .lean();
    return rows.map((partner) => ({
      id: String(partner._id),
      code: partner.code,
      businessName: partner.businessName,
      city: partner.city,
      state: partner.state,
    }));
  }

  async decide(
    applicationId: string,
    actorUserId: string,
    decision: 'reject' | 'request_info',
    reason: string,
  ) {
    if (!Types.ObjectId.isValid(applicationId))
      throw new BadRequestException('Invalid application ID.');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const application = await ApplicationModel.findOneAndUpdate(
          {
            _id: applicationId,
            status: { $in: ['submitted', 'needs_info'] },
            emailVerifiedAt: { $exists: true },
          },
          {
            $set: {
              status: decision === 'reject' ? 'rejected' : 'needs_info',
              reviewerId: new Types.ObjectId(actorUserId),
              decisionReason: reason,
            },
          },
          { returnDocument: 'before', session },
        );
        if (!application)
          throw new ConflictException('Application is not available for this decision.');
        await AuditModel.create(
          [
            {
              actorUserId: new Types.ObjectId(actorUserId),
              action: decision === 'reject' ? 'application.rejected' : 'application.request_info',
              entity: 'application',
              entityId: applicationId,
              before: { status: application.status },
              after: {
                status: decision === 'reject' ? 'rejected' : 'needs_info',
                decisionReason: reason,
              },
              createdAt: new Date(),
            },
          ],
          { session },
        );
        await EmailOutboxModel.create(
          [
            {
              to: application.email,
              template: 'application_status',
              variables: {
                applicantName: application.applicantName,
                status: decision === 'reject' ? 'rejected' : 'more information requested',
                reason,
              },
              status: 'pending',
              attempts: 0,
              nextAttemptAt: new Date(),
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { updated: true };
  }

  async approve(applicationId: string, actorUserId: string, parentId?: string) {
    if (!Types.ObjectId.isValid(applicationId))
      throw new BadRequestException('Invalid application ID.');
    const session = await mongoose.startSession();
    let partnerCode = '';
    try {
      await session.withTransaction(async () => {
        const application = await ApplicationModel.findOne({
          _id: applicationId,
          status: { $in: ['submitted', 'needs_info'] },
          emailVerifiedAt: { $exists: true },
        }).session(session);
        if (!application) throw new ConflictException('Application is not available for approval.');
        if (await UserModel.exists({ email: application.email }).session(session))
          throw new ConflictException('An account already uses this applicant email.');

        let parentPath: Types.ObjectId[] = [];
        let resolvedParentId: Types.ObjectId | undefined;
        const requiredParentTier =
          application.requestedTier === 'distributor'
            ? 'master_distributor'
            : application.requestedTier === 'retailer'
              ? 'distributor'
              : undefined;
        if (requiredParentTier) {
          if (!parentId || !Types.ObjectId.isValid(parentId))
            throw new BadRequestException('Select an active partner at the required higher tier.');
          const parent = await PartnerModel.findOne({
            _id: parentId,
            tier: requiredParentTier,
            status: 'active',
          }).session(session);
          if (!parent) throw new BadRequestException('The selected parent partner is unavailable.');
          parentPath = parent.path;
          resolvedParentId = parent._id;
        } else if (parentId) {
          throw new BadRequestException('Master distributors are top-level partners.');
        }

        const role = await RoleModel.findOne({
          key: application.requestedTier,
          kind: 'partner',
        }).session(session);
        if (!role) throw new Error(`Partner role ${application.requestedTier} is not seeded.`);
        const partnerId = new Types.ObjectId();
        const code = `PAR-${partnerId.toHexString().slice(-10).toUpperCase()}`;
        if (application.territoryId) {
          const territory = await TerritoryModel.findById(application.territoryId).session(session);
          if (!territory?.active)
            throw new ConflictException('The application territory is no longer available.');
          if (territory.exclusive) {
            const reserved = await TerritoryModel.updateOne(
              { _id: territory._id, currentPartnerId: { $exists: false } },
              { $set: { currentPartnerId: partnerId } },
              { session },
            );
            if (reserved.modifiedCount !== 1)
              throw new ConflictException('The exclusive territory has already been assigned.');
          }
        }

        const temporaryPassword = randomToken();
        const [user] = await UserModel.create(
          [
            {
              email: application.email,
              passwordHash: await hashPassword(temporaryPassword),
              name: application.applicantName,
              mobile: application.mobile,
              kind: 'partner',
              status: 'active',
              roleIds: [role._id],
              totpEnabled: false,
              recoveryCodeHashes: [],
              failedLogins: 0,
            },
          ],
          { session },
        );
        if (!user) throw new Error('Partner owner insert returned no user.');
        const path = [...parentPath, partnerId];
        await PartnerModel.create(
          [
            {
              _id: partnerId,
              code,
              ...(resolvedParentId ? { parentId: resolvedParentId } : {}),
              path,
              tier: application.requestedTier,
              status: 'pending_payment',
              applicationId: application._id,
              ownerUserId: user._id,
              businessName: application.businessName,
              legalType: application.legalType,
              mobile: application.mobile,
              email: application.email,
              city: application.city,
              state: application.state,
              pin: application.pin,
              ...(application.territoryId ? { territoryId: application.territoryId } : {}),
            },
          ],
          { session },
        );
        await PartnerUserModel.create(
          [{ partnerId, userId: user._id, role: 'owner', staffPermissions: [], status: 'active' }],
          { session },
        );
        await KycDocumentModel.updateMany(
          { ownerType: 'application', ownerId: application._id },
          { $set: { ownerType: 'partner', ownerId: partnerId } },
          { session },
        );
        const inviteToken = randomToken();
        await PasswordResetModel.create(
          [
            {
              userId: user._id,
              tokenHash: digestToken(inviteToken),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              createdAt: new Date(),
            },
          ],
          { session },
        );
        const resetUrl = new URL('/reset-password', process.env.APP_BASE_URL ?? 'http://localhost');
        resetUrl.searchParams.set('token', inviteToken);
        await EmailOutboxModel.create(
          [
            {
              to: application.email,
              template: 'password_reset',
              variables: { resetUrl: resetUrl.toString() },
              status: 'pending',
              attempts: 0,
              nextAttemptAt: new Date(),
            },
          ],
          { session },
        );
        await ApplicationModel.updateOne(
          { _id: application._id, status: application.status },
          {
            $set: { status: 'approved', reviewerId: new Types.ObjectId(actorUserId), partnerId },
            $unset: { decisionReason: 1 },
          },
          { session },
        );
        await AuditModel.create(
          [
            {
              actorUserId: new Types.ObjectId(actorUserId),
              action: 'application.approved',
              entity: 'application',
              entityId: applicationId,
              after: { status: 'approved', partnerId: String(partnerId), partnerCode: code },
              createdAt: new Date(),
            },
          ],
          { session },
        );
        partnerCode = code;
      });
    } finally {
      await session.endSession();
    }
    return { approved: true, partnerCode, status: 'pending_payment' as const };
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
