import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types, type ClientSession } from 'mongoose';
import { scopeToActor, type Actor } from '../../common/actor';
import { KycDocumentModel, PartnerModel, PartnerUserModel } from './models';

type Filter = Record<string, unknown>;

/** The only API layer that may import partner-scoped Mongoose models. */
@Injectable()
export class PartnersRepository {
  listPartners(actor: Actor, filter: Filter = {}, permission = 'partners.read') {
    this.requireRead(actor, permission);
    return PartnerModel.find(scopeToActor(actor, filter, 'path'));
  }

  findPartner(actor: Actor, id: Types.ObjectId | string, permission = 'partners.read') {
    this.requireRead(actor, permission);
    return PartnerModel.findOne(scopeToActor(actor, { _id: id }, '_id'));
  }

  findPartnerByFilter(actor: Actor, filter: Filter, permission = 'partners.read') {
    this.requireRead(actor, permission);
    return PartnerModel.findOne(scopeToActor(actor, filter, '_id'));
  }

  countPartners(actor: Actor, filter: Filter, permission = 'partners.read') {
    this.requireRead(actor, permission);
    return PartnerModel.countDocuments(scopeToActor(actor, filter, 'parentId'));
  }

  updatePartner(actor: Actor, id: Types.ObjectId | string, filter: Filter, update: Filter) {
    this.requireRead(actor, 'partners.manage');
    return PartnerModel.updateOne(scopeToActor(actor, { _id: id, ...filter }, '_id'), update);
  }

  updatePartnerAndReturn(
    actor: Actor,
    id: Types.ObjectId | string,
    filter: Filter,
    update: Filter,
    returnDocument: 'before' | 'after',
  ) {
    this.requireRead(actor, 'partners.manage');
    return PartnerModel.findOneAndUpdate(
      scopeToActor(actor, { _id: id, ...filter }, '_id'),
      update,
      { returnDocument },
    );
  }

  existsPartner(actor: Actor, filter: Filter, permission = 'partners.read') {
    this.requireRead(actor, permission);
    return PartnerModel.exists(scopeToActor(actor, filter, '_id'));
  }

  async listDownline(actor: Actor, partnerId: string) {
    this.requireRead(actor, 'team.read');
    const parent = await PartnerModel.findOne(
      scopeToActor(actor, { _id: partnerId, status: { $ne: 'closed' } }, '_id'),
    )
      .select('_id path')
      .lean();
    if (!parent) return null;
    const rows = await PartnerModel.find(
      scopeToActor(
        actor,
        {
          path: parent._id,
          _id: { $ne: parent._id },
          status: { $ne: 'closed' },
        },
        'path',
      ),
    )
      .select('code parentId path tier status businessName city state')
      .sort({ code: 1 })
      .lean();
    return { parent, rows };
  }

  async membershipForAuthenticatedUser(actor: Actor) {
    if (actor.kind !== 'partner') throw new ForbiddenException('Partner actor is required.');
    return PartnerUserModel.findOne(
      scopeToActor(actor, { userId: actor.userId, status: 'active' }, 'userId'),
    )
      .select('partnerId')
      .lean();
  }

  async partnerForAuthenticatedMembership(actor: Actor, partnerId: Types.ObjectId | string) {
    if (actor.kind !== 'partner') throw new ForbiddenException('Partner actor is required.');
    return PartnerModel.findOne(
      scopeToActor(actor, { _id: partnerId, status: { $ne: 'closed' } }, '_id'),
    )
      .select('_id path status')
      .lean();
  }

  async expandPartnerPath(actor: Actor, partnerId: Types.ObjectId | string) {
    const rows = await PartnerModel.distinct(
      '_id',
      scopeToActor(actor, { path: partnerId, status: { $ne: 'closed' } }, 'path'),
    );
    return rows.map(String);
  }

  listKycDocuments(actor: Actor, filter: Filter, permission?: string) {
    if (actor.kind === 'admin') this.requireAdminBypass(actor, permission ?? 'partners.read');
    else if (!actor.permissions.has('files.download') && !actor.permissions.has('identity.me'))
      throw new ForbiddenException('KYC document access is not permitted.');
    return KycDocumentModel.find(
      actor.kind === 'admin'
        ? SCOPE_BYPASS(actor, permission ?? 'partners.read', filter)
        : scopeToActor(actor, filter, 'ownerId'),
    );
  }

  findKycDocument(actor: Actor, id: Types.ObjectId | string) {
    if (actor.kind === 'admin') {
      const canRead =
        actor.permissions.has('files.download') &&
        (actor.permissions.has('partners.read') || actor.permissions.has('applications.read'));
      if (!canRead) throw new ForbiddenException('KYC document access is not permitted.');
      const ownerTypes = [
        ...(actor.permissions.has('partners.read') ? ['partner'] : []),
        ...(actor.permissions.has('applications.read') ? ['application'] : []),
      ];
      return KycDocumentModel.findOne(
        SCOPE_BYPASS(actor, 'files.download', { _id: id, ownerType: { $in: ownerTypes } }),
      );
    }
    if (!actor.permissions.has('files.download'))
      throw new ForbiddenException('KYC document access is not permitted.');
    return KycDocumentModel.findOne(
      scopeToActor(actor, { _id: id, ownerType: 'partner' }, 'ownerId'),
    );
  }

  createKycDocument(actor: Actor, document: Filter) {
    if (actor.kind === 'admin') {
      this.requireAdminBypass(actor, 'applications.review');
      if (document.ownerType !== 'application')
        throw new ForbiddenException('Administrators may attach KYC only to applications.');
    } else {
      const ownerId = String(document.ownerId);
      if (
        !actor.permissions.has('files.upload') ||
        document.ownerType !== 'partner' ||
        !actor.partnerPath?.includes(ownerId)
      )
        throw new ForbiddenException('KYC document owner is outside the actor scope.');
      // Validate the same owner constraint used for reads before creating a scoped row.
      scopeToActor(actor, { ownerId: new Types.ObjectId(ownerId) }, 'ownerId');
    }
    return KycDocumentModel.create(document);
  }

  moveApplicationKycToPartner(
    actor: Actor,
    applicationId: Types.ObjectId,
    partnerId: Types.ObjectId,
    session: ClientSession,
  ) {
    this.requireAdminBypass(actor, 'applications.review');
    return KycDocumentModel.updateMany(
      SCOPE_BYPASS(actor, 'applications.review', {
        ownerType: 'application',
        ownerId: applicationId,
      }),
      { $set: { ownerType: 'partner', ownerId: partnerId } },
      { session },
    );
  }

  createPartner(actor: Actor, partner: Filter, session: ClientSession) {
    this.requireAdminBypass(actor, 'applications.review');
    return PartnerModel.create([partner], { session });
  }

  createPartnerUser(actor: Actor, membership: Filter, session: ClientSession) {
    this.requireAdminBypass(actor, 'applications.review');
    return PartnerUserModel.create([membership], { session });
  }

  listPartnerUsers(actor: Actor, filter: Filter) {
    this.requireRead(actor, 'partners.manage');
    return PartnerUserModel.find(scopeToActor(actor, filter, 'partnerId'));
  }

  private requireRead(actor: Actor, permission: string) {
    if (actor.kind === 'admin') this.requireAdminBypass(actor, permission);
    else if (!actor.permissions.has(permission)) throw new ForbiddenException('Permission denied.');
  }

  private requireAdminBypass(actor: Actor, permission: string) {
    if (actor.kind !== 'admin' || !actor.permissions.has(permission))
      throw new ForbiddenException('The named administrator scope bypass is not authorized.');
  }
}

/** Named exception for an admin-only query. The caller checks its route permission first. */
function SCOPE_BYPASS(actor: Actor, permission: string, filter: Filter): Filter {
  if (actor.kind !== 'admin' || !actor.permissions.has(permission))
    throw new ForbiddenException('The named administrator scope bypass is not authorized.');
  return scopeToActor(actor, filter);
}
