import { randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { authenticator } from 'otplib';
import { loadConfig } from '../../config';
import { AuditModel, EmailOutboxModel, PasswordResetModel, RoleModel, UserModel } from './models';
import type { IdentityKind } from './models';
import { SessionService, type SessionContext, type SessionStage } from './session.service';
import {
  decryptField,
  digestToken,
  encryptField,
  hashPassword,
  randomToken,
  verifyPassword,
} from './security';
import { provisionIdentity } from './provisioning';
import { RateLimitService } from './rate-limit.service';
import { PartnerModel, PartnerUserModel } from '../partners/models';

const config = loadConfig();
const invalidCredentials = 'Invalid email or password.';
const preAuthTtl = 10 * 60;

@Injectable()
export class AuthService {
  private dummyPasswordHash = '';

  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(RateLimitService) private readonly rateLimits: RateLimitService,
  ) {}

  async initialize(): Promise<void> {
    await provisionIdentity();
    this.dummyPasswordHash = await hashPassword(randomToken());
  }

  async login(
    kind: IdentityKind,
    email: string,
    password: string,
    request: Request,
    response: Response,
  ) {
    await this.rateLimits.enforce(
      this.rateLimits.loginLimits(kind, email, request.ip || 'unknown'),
    );
    const user = await UserModel.findOne({ email: email.toLowerCase(), kind }).select(
      '+passwordHash',
    );
    const now = new Date();
    if (!user) {
      await verifyPassword(this.dummyPasswordHash, password);
      throw new UnauthorizedException(invalidCredentials);
    }
    if (user.status !== 'active' || (user.lockedUntil && user.lockedUntil > now)) {
      await verifyPassword(user.passwordHash, password);
      throw new UnauthorizedException(invalidCredentials);
    }

    if (!(await verifyPassword(user.passwordHash, password))) {
      await UserModel.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      const latest = await UserModel.findById(user._id).select('failedLogins');
      if ((latest?.failedLogins ?? 0) >= config.LOGIN_MAX_ATTEMPTS) {
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { lockedUntil: new Date(Date.now() + config.LOGIN_LOCK_MINUTES * 60_000) } },
        );
      }
      throw new UnauthorizedException(invalidCredentials);
    }

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { failedLogins: 0, lastLoginAt: now }, $unset: { lockedUntil: 1 } },
    );
    const stage: SessionStage =
      kind === 'admin' && !user.totpEnabled
        ? 'enrollment_pending'
        : user.totpEnabled
          ? 'totp_pending'
          : 'authenticated';
    const ttl = stage === 'authenticated' ? this.sessions.sessionTtl(kind) : preAuthTtl;
    const session = await this.sessions.createSession(response, String(user._id), kind, stage, ttl);
    const ip = request.ip;
    const userAgent = request.header('user-agent')?.slice(0, 512);
    await AuditModel.create({
      actorUserId: user._id,
      action: 'login',
      entity: 'users',
      entityId: String(user._id),
      ...(ip ? { ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      createdAt: now,
    });

    return {
      status: stage === 'authenticated' ? 'authenticated' : 'two_factor_required',
      ...(stage === 'enrollment_pending' ? { requiresTotpSetup: true } : {}),
      ...(stage === 'totp_pending' ? { requiresTotp: true } : {}),
      csrfToken: session.csrfToken,
    };
  }

  async setupTotp(session: SessionContext) {
    const partnerEnrollment =
      session.value.kind === 'partner' && session.value.stage === 'authenticated';
    const adminEnrollment =
      session.value.kind === 'admin' && session.value.stage === 'enrollment_pending';
    if (!partnerEnrollment && !adminEnrollment) {
      throw new UnauthorizedException('Authenticator enrollment is not pending.');
    }
    const user = await UserModel.findById(session.value.userId).select('+totpSecretEnc');
    if (!user || (adminEnrollment && user.totpEnabled) || (partnerEnrollment && user.totpEnabled))
      throw new UnauthorizedException('Authenticator enrollment is not pending.');
    const secret = user.totpSecretEnc
      ? decryptField(user.totpSecretEnc, config.FIELD_ENCRYPTION_KEY)
      : authenticator.generateSecret();
    if (!user.totpSecretEnc) {
      user.totpSecretEnc = encryptField(secret, config.FIELD_ENCRYPTION_KEY);
      await user.save();
    }
    return { secret, otpauthUrl: authenticator.keyuri(user.email, 'Multi-Service CRM', secret) };
  }

  async verifyTotp(code: string, session: SessionContext, request: Request, response: Response) {
    const partnerEnrollment =
      session.value.kind === 'partner' && session.value.stage === 'authenticated';
    if (session.value.stage === 'authenticated' && !partnerEnrollment)
      throw new UnauthorizedException('Two-factor verification is not pending.');
    const user = await UserModel.findById(session.value.userId).select(
      '+totpSecretEnc +recoveryCodeHashes',
    );
    if (!user || user.status !== 'active' || user.kind !== session.value.kind)
      throw new UnauthorizedException('Sign-in is no longer valid.');

    let valid = false;
    let consumedRecoveryHash: string | undefined;
    if (user.totpSecretEnc) {
      const secret = decryptField(user.totpSecretEnc, config.FIELD_ENCRYPTION_KEY);
      valid = authenticator.check(code, secret);
    }
    if (!valid && user.totpEnabled) {
      for (const codeHash of user.recoveryCodeHashes) {
        if (await verifyPassword(codeHash, code.trim().toLowerCase())) {
          valid = true;
          consumedRecoveryHash = codeHash;
          break;
        }
      }
    }
    if (!valid) throw new UnauthorizedException('Invalid authenticator code.');

    let recoveryCodes: string[] | undefined;
    if (session.value.stage === 'enrollment_pending' || partnerEnrollment) {
      recoveryCodes = Array.from({ length: 10 }, () => randomBytes(8).toString('hex'));
      user.recoveryCodeHashes = await Promise.all(
        recoveryCodes.map((recoveryCode) => hashPassword(recoveryCode)),
      );
      user.totpEnabled = true;
    } else if (consumedRecoveryHash) {
      user.recoveryCodeHashes = user.recoveryCodeHashes.filter(
        (value) => value !== consumedRecoveryHash,
      );
    }
    user.failedLogins = 0;
    user.set('lockedUntil', undefined);
    user.lastLoginAt = new Date();
    await user.save();

    await this.sessions.discardPreAuth(response, session);
    const fullSession = await this.sessions.createSession(
      response,
      String(user._id),
      user.kind,
      'authenticated',
      this.sessions.sessionTtl(user.kind),
    );
    const ip = request.ip;
    await AuditModel.create({
      actorUserId: user._id,
      action: 'two_factor_verified',
      entity: 'users',
      entityId: String(user._id),
      ...(ip ? { ip } : {}),
    });
    return {
      status: 'authenticated',
      csrfToken: fullSession.csrfToken,
      ...(recoveryCodes ? { recoveryCodes } : {}),
    };
  }

  async currentUser(userId: string) {
    const user = await UserModel.findById(userId)
      .select('email name mobile kind status roleIds totpEnabled lastLoginAt')
      .lean();
    if (!user) throw new UnauthorizedException('Session is no longer valid.');
    const roles = await RoleModel.find({ _id: { $in: user.roleIds } })
      .select('key name permissions')
      .lean();
    const membership =
      user.kind === 'partner'
        ? await PartnerUserModel.findOne({ userId: user._id, status: 'active' })
            .select('partnerId')
            .lean()
        : null;
    const partner = membership
      ? await PartnerModel.findById(membership.partnerId)
          .select('code tier status businessName')
          .lean()
      : null;
    return {
      user: {
        ...user,
        roleKeys: roles.map((role) => role.key),
        roleNames: roles.map((role) => role.name),
        permissions: [...new Set(roles.flatMap((role) => role.permissions))],
        ...(partner && membership
          ? {
              partner: {
                id: String(membership.partnerId),
                code: partner.code,
                tier: partner.tier,
                status: partner.status,
                businessName: partner.businessName,
              },
            }
          : {}),
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ status: 'password_updated' }> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (
      !user ||
      user.status !== 'active' ||
      !(await verifyPassword(user.passwordHash, currentPassword))
    ) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    user.passwordHash = await hashPassword(newPassword);
    user.failedLogins = 0;
    user.set('lockedUntil', undefined);
    await user.save();
    await this.sessions.revokeUserSessions(userId);
    await AuditModel.create({
      actorUserId: user._id,
      action: 'password_changed',
      entity: 'users',
      entityId: userId,
    });
    return { status: 'password_updated' };
  }

  async forgotPassword(email: string, ip: string): Promise<{ accepted: true }> {
    await this.rateLimits.enforce(this.rateLimits.passwordResetLimits(email, ip));
    const user = await UserModel.findOne({ email: email.toLowerCase(), status: 'active' }).select(
      '_id email',
    );
    if (user) {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 60 * 60_000);
      await PasswordResetModel.create({
        userId: user._id,
        tokenHash: digestToken(token),
        expiresAt,
      });
      await EmailOutboxModel.create({
        to: user.email,
        template: 'password_reset',
        variables: {
          resetUrl: `${config.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`,
        },
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
      });
    }
    return { accepted: true };
  }

  async disablePartnerTotp(userId: string, currentPassword: string, code: string) {
    const user = await UserModel.findById(userId).select(
      '+passwordHash +totpSecretEnc +recoveryCodeHashes',
    );
    if (
      !user ||
      user.kind !== 'partner' ||
      !user.totpEnabled ||
      !(await verifyPassword(user.passwordHash, currentPassword))
    ) {
      throw new UnauthorizedException('Two-factor settings could not be verified.');
    }
    let valid = false;
    if (user.totpSecretEnc)
      valid = authenticator.check(
        code,
        decryptField(user.totpSecretEnc, config.FIELD_ENCRYPTION_KEY),
      );
    if (!valid) {
      for (const hash of user.recoveryCodeHashes) {
        if (await verifyPassword(hash, code.trim().toLowerCase())) {
          valid = true;
          break;
        }
      }
    }
    if (!valid) throw new UnauthorizedException('Two-factor settings could not be verified.');
    user.totpEnabled = false;
    user.set('totpSecretEnc', undefined);
    user.recoveryCodeHashes = [];
    await user.save();
    await this.sessions.revokeUserSessions(userId);
    await AuditModel.create({
      actorUserId: user._id,
      action: 'two_factor_disabled',
      entity: 'users',
      entityId: userId,
    });
    return { status: 'two_factor_disabled' as const };
  }

  async resetPassword(token: string, password: string): Promise<{ status: 'password_updated' }> {
    const now = new Date();
    const reset = await PasswordResetModel.findOne({
      tokenHash: digestToken(token),
      expiresAt: { $gt: now },
      usedAt: { $exists: false },
    });
    if (!reset) throw new UnauthorizedException('Password reset link is invalid or expired.');
    const passwordHash = await hashPassword(password);
    const result = await UserModel.updateOne(
      { _id: reset.userId, status: 'active' },
      { $set: { passwordHash, failedLogins: 0 }, $unset: { lockedUntil: 1 } },
    );
    if (!result.modifiedCount)
      throw new UnauthorizedException('Password reset link is invalid or expired.');
    reset.usedAt = now;
    await reset.save();
    await this.sessions.revokeUserSessions(String(reset.userId));
    await AuditModel.create({
      actorUserId: reset.userId,
      action: 'password_reset',
      entity: 'users',
      entityId: String(reset.userId),
      createdAt: now,
    });
    return { status: 'password_updated' };
  }
}
