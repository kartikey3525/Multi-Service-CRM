import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import type { Request } from 'express';
import type { Actor } from '../../common/actor';
import { AuditModel } from '../identity/models';
import { ApplicationModel } from '../partners/models';
import { PartnersRepository } from '../partners/partners.repository';
import { RateLimitService } from '../identity/rate-limit.service';
import { digestToken } from '../identity/security';

const maximumBytes = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);

export interface KycUploadInput {
  ownerType: 'application' | 'partner';
  ownerId: string;
  docType: string;
}
export interface KycUploadFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class FilesService implements OnModuleInit {
  constructor(
    @Inject(RateLimitService) private readonly rateLimits: RateLimitService,
    @Inject(PartnersRepository) private readonly partners: PartnersRepository,
  ) {}
  private readonly bucket = process.env.S3_BUCKET ?? 'crm-private-files';
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'local-development-only',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'local-development-only',
    },
  });

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const name = (error as { name?: string }).name;
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status !== 404 && name !== 'NotFound' && name !== 'NoSuchBucket') throw error;
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async upload(actor: Actor, input: KycUploadInput, file: KycUploadFile) {
    const extension = allowedTypes.get(file.mimetype);
    if (!extension || !hasExpectedSignature(file.buffer, file.mimetype))
      throw new BadRequestException('Only genuine PDF, JPEG, and PNG files are accepted.');
    if (!file.size || file.size > maximumBytes)
      throw new BadRequestException('KYC files must be smaller than 10 MB.');
    if (!Types.ObjectId.isValid(input.ownerId))
      throw new BadRequestException('Invalid document owner.');
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(input.docType))
      throw new BadRequestException('Invalid document type.');

    const ownerId = new Types.ObjectId(input.ownerId);
    await this.assertCanWriteOwner(actor, input.ownerType, ownerId);
    const fileKey = `kyc/${input.ownerType}/${ownerId.toHexString()}/${randomUUID()}.${extension}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: file.mimetype,
        Metadata: { ownerType: input.ownerType, ownerId: ownerId.toHexString() },
        // Deliberately omit ACL: objects and the bucket remain private.
      }),
    );
    try {
      const document = await this.partners.createKycDocument(actor, {
        ownerType: input.ownerType,
        ownerId,
        docType: input.docType,
        fileKey,
        contentType: file.mimetype,
        sizeBytes: file.size,
        status: 'pending',
      });
      return {
        id: String(document._id),
        ownerType: document.ownerType,
        ownerId: String(document.ownerId),
        docType: document.docType,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
        status: document.status,
      };
    } catch (error) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey }));
      } catch {
        // Keep the original persistence error; an orphaned private object can be reconciled later.
      }
      throw error;
    }
  }

  async uploadApplicationDocument(
    request: Request,
    applicationId: string,
    uploadToken: string,
    docType: string,
    file: KycUploadFile,
  ) {
    if (!Types.ObjectId.isValid(applicationId))
      throw new BadRequestException('Invalid application ID.');
    await this.rateLimits.enforce([
      {
        namespace: 'application:kyc-upload:ip',
        subject: request.ip ?? request.socket.remoteAddress ?? 'unknown',
        maximum: 30,
        windowSeconds: 3600,
      },
    ]);
    const application = await ApplicationModel.findOne({
      _id: applicationId,
      uploadTokenHash: digestToken(uploadToken),
      uploadTokenExpiresAt: { $gt: new Date() },
      status: { $in: ['pending_email_verification', 'submitted', 'needs_info'] },
    })
      .select('+uploadTokenHash +uploadTokenExpiresAt')
      .lean();
    if (!application)
      throw new ForbiddenException('The application upload permission is invalid or expired.');
    return this.upload(
      {
        userId: 'application-upload',
        kind: 'admin',
        roleKeys: [],
        permissions: new Set(['applications.review', 'files.upload']),
      },
      { ownerType: 'application', ownerId: applicationId, docType },
      file,
    );
  }

  async retrieve(request: Request, actor: Actor, documentId: string) {
    if (!Types.ObjectId.isValid(documentId)) throw new BadRequestException('Invalid document ID.');
    const document = await this.partners
      .findKycDocument(actor, documentId)
      .select('+fileKey')
      .lean();
    if (!document) {
      if (actor.kind === 'partner')
        throw new ForbiddenException('This KYC document is outside your partner network.');
      throw new NotFoundException('KYC document not found.');
    }
    await this.assertCanReadOwner(actor, document.ownerType, document.ownerId);
    const object = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: document.fileKey }),
    );
    if (!object.Body) throw new NotFoundException('KYC file is unavailable.');
    const bytes = await object.Body.transformToByteArray();
    const userAgent = request.header('user-agent');
    await AuditModel.create({
      actorUserId: new Types.ObjectId(actor.userId),
      action: 'kyc.document_viewed',
      entity: 'kyc_document',
      entityId: String(document._id),
      after: {
        ownerType: document.ownerType,
        ownerId: String(document.ownerId),
        contentType: document.contentType,
      },
      ...(request.ip ? { ip: request.ip } : {}),
      ...(userAgent ? { userAgent: userAgent.slice(0, 512) } : {}),
      createdAt: new Date(),
    });
    return {
      bytes: Buffer.from(bytes),
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
    };
  }

  async listMine(actor: Actor) {
    if (actor.kind !== 'partner' || !actor.partnerId) throw new ForbiddenException();
    const rows = await this.partners
      .listKycDocuments(actor, {
        ownerType: 'partner',
        ownerId: new Types.ObjectId(actor.partnerId),
      })
      .select('-fileKey')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(({ _id, docType, contentType, sizeBytes, status, createdAt }) => ({
      id: String(_id),
      docType,
      contentType,
      sizeBytes,
      status,
      createdAt,
    }));
  }

  private async assertCanWriteOwner(
    actor: Actor,
    ownerType: KycUploadInput['ownerType'],
    ownerId: Types.ObjectId,
  ) {
    if (actor.kind === 'admin') {
      if (ownerType !== 'application' || !actor.permissions.has('applications.review'))
        throw new ForbiddenException(
          'Administrators may upload only to applications they can review.',
        );
      if (!(await ApplicationModel.exists({ _id: ownerId })))
        throw new NotFoundException('Application not found.');
      return;
    }
    if (
      ownerType !== 'partner' ||
      !actor.permissions.has('files.upload') ||
      !actor.partnerId ||
      String(ownerId) !== actor.partnerId
    )
      throw new ForbiddenException('Partners may upload KYC only to their own profile.');
    if (
      !(await this.partners.existsPartner(
        actor,
        { _id: ownerId, status: { $in: ['pending_payment', 'active'] } },
        'files.upload',
      ))
    )
      throw new ForbiddenException('This partner profile is not accepting KYC documents.');
  }

  private async assertCanReadOwner(
    actor: Actor,
    ownerType: 'application' | 'partner',
    ownerId: Types.ObjectId,
  ) {
    if (actor.kind === 'admin') {
      const required = ownerType === 'application' ? 'applications.read' : 'partners.read';
      if (!actor.permissions.has('files.download') || !actor.permissions.has(required))
        throw new ForbiddenException('Your role cannot view this KYC document.');
      return;
    }
    if (
      ownerType !== 'partner' ||
      !actor.permissions.has('files.download') ||
      !actor.partnerPath?.includes(String(ownerId))
    )
      throw new ForbiddenException('This KYC document is outside your partner network.');
  }
}

function hasExpectedSignature(buffer: Buffer, mime: string): boolean {
  if (mime === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png')
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}
