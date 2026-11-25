import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RoleModel, UserModel, type IdentityKind } from './models';
import type { Actor } from '../../common/actor';
import { ALLOW_PREAUTH, PUBLIC_ROUTE, REQUIRED_PERMISSION } from './identity.decorator';
import { SessionService } from './session.service';
import { PartnerModel, PartnerUserModel } from '../partners/models';

export type RequestActor = Actor;

type RequestWithActor = Request & {
  actor?: RequestActor;
  authSession?: Awaited<ReturnType<SessionService['getRequestSession']>>;
};

interface PermissionMetadata {
  permission: string;
  kind?: IdentityKind;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [handler, controller])) return true;

    const metadata = this.reflector.getAllAndOverride<PermissionMetadata>(REQUIRED_PERMISSION, [
      handler,
      controller,
    ]);
    if (!metadata) throw new ForbiddenException('Route permission is missing.');

    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const session = await this.sessions.getRequestSession(request);
    if (!session) throw new UnauthorizedException('Sign-in is required.');
    if (metadata.kind && session.value.kind !== metadata.kind)
      throw new ForbiddenException('This account cannot use this route.');

    const allowPreAuth =
      this.reflector.getAllAndOverride<boolean>(ALLOW_PREAUTH, [handler, controller]) ?? false;
    if (session.value.stage !== 'authenticated' && !allowPreAuth)
      throw new UnauthorizedException('Complete two-factor verification first.');

    const user = await UserModel.findById(session.value.userId)
      .select('kind status roleIds')
      .lean();
    if (!user || user.status !== 'active' || user.kind !== session.value.kind)
      throw new UnauthorizedException('Session is no longer valid.');
    const roles = await RoleModel.find({ _id: { $in: user.roleIds }, kind: user.kind })
      .select('key permissions')
      .lean();
    const permissions = new Set(roles.flatMap((role) => role.permissions));
    if (!permissions.has(metadata.permission)) throw new ForbiddenException('Permission denied.');

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      await this.sessions.assertCsrf(request, session);
    }

    const actor: RequestActor = {
      userId: String(user._id),
      kind: user.kind,
      permissions,
      roleKeys: roles.map((role) => role.key),
    };
    if (user.kind === 'partner') {
      const membership = await PartnerUserModel.findOne({ userId: user._id, status: 'active' })
        .select('partnerId')
        .lean();
      const partner = membership
        ? await PartnerModel.findOne({ _id: membership.partnerId, status: { $ne: 'closed' } })
            .select('_id path status')
            .lean()
        : null;
      if (!partner || !partner.path.length)
        throw new ForbiddenException('An active partner membership is required.');
      actor.partnerId = String(partner._id);
      actor.partnerStatus = partner.status;
      actor.partnerPath = (
        await PartnerModel.distinct('_id', {
          path: partner._id,
          status: { $ne: 'closed' },
        })
      ).map(String);
      const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
      const allowsPendingKyc =
        metadata.permission === 'files.upload' && partner.status === 'pending_payment';
      const allowsLogout = metadata.permission === 'identity.logout';
      if (isWrite && partner.status !== 'active' && !allowsPendingKyc && !allowsLogout)
        throw new ForbiddenException('Only active partners may perform this action.');
    }
    request.actor = actor;
    request.authSession = session;
    return true;
  }
}
