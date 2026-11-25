import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { RequirePermission } from '../identity/identity.decorator';
import { AuditService } from '../identity/audit.service';
import { SessionService } from '../identity/session.service';
import { encryptField } from '../identity/security';
import { KycDocumentModel, PartnerModel, PartnerUserModel } from './models';

const statusSchema = z.object({ status: z.enum(['active', 'suspended']) });
const kycSchema = z
  .object({
    pan: z
      .string()
      .trim()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
      .optional(),
    gstin: z
      .string()
      .trim()
      .regex(/^[0-9A-Z]{15}$/)
      .optional(),
    address: z.string().trim().min(5).max(500).optional(),
    bankAccount: z.string().trim().min(6).max(32).optional(),
    bankIfsc: z
      .string()
      .trim()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

@Controller('v1/admin/partners')
export class AdminPartnersController {
  constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Get()
  @RequirePermission(Permission.partnersRead, 'admin')
  async list(
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('q') q?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (tier) filter.tier = tier;
    if (q?.trim()) {
      const escaped = q
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .slice(0, 100);
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { businessName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
    const items = await PartnerModel.find(filter)
      .select(
        'code parentId path tier status applicationId ownerUserId businessName email mobile city state pin territoryId createdAt activatedAt',
      )
      .sort({ path: 1, createdAt: 1 })
      .limit(100)
      .lean();
    return items;
  }

  @Get(':id')
  @RequirePermission(Permission.partnersRead, 'admin')
  async detail(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid partner ID.');
    const partner = await PartnerModel.findById(id)
      .select('-panEnc -gstinEnc -addressEnc -bankAccountEnc -bankIfscEnc')
      .lean();
    if (!partner) throw new BadRequestException('Partner not found.');
    const [documents, downlineCount] = await Promise.all([
      KycDocumentModel.find({ ownerType: 'partner', ownerId: partner._id })
        .select('-fileKey')
        .lean(),
      PartnerModel.countDocuments({ parentId: partner._id }),
    ]);
    return { partner, documents, downlineCount };
  }

  @Put(':id/status')
  @RequirePermission(Permission.partnersManage, 'admin')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid partner ID.');
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Partner status is invalid.');
    const before = await PartnerModel.findById(id).select('status ownerUserId code').lean();
    if (!before) throw new BadRequestException('Partner not found.');
    if (!['active', 'suspended'].includes(before.status))
      throw new BadRequestException('Only active partners may be suspended or reactivated.');
    const updated = await PartnerModel.findOneAndUpdate(
      { _id: id, status: before.status },
      { $set: { status: parsed.data.status } },
      { returnDocument: 'after' },
    )
      .select('code status ownerUserId')
      .lean();
    if (!updated)
      throw new BadRequestException('Partner status changed concurrently. Refresh and retry.');
    if (parsed.data.status === 'suspended') {
      const memberships = await PartnerUserModel.find({ partnerId: id }).select('userId').lean();
      await Promise.all(
        memberships.map((membership) =>
          this.sessions.revokeUserSessions(String(membership.userId)),
        ),
      );
    }
    await this.audit.record(request, {
      action: parsed.data.status === 'suspended' ? 'partner.suspended' : 'partner.reactivated',
      entity: 'partner',
      entityId: id,
      before: { status: before.status },
      after: { status: updated.status },
    });
    return { id, code: updated.code, status: updated.status };
  }

  @Patch(':id/kyc-fields')
  @RequirePermission(Permission.partnersManage, 'admin')
  async setKycFields(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid partner ID.');
    const parsed = kycSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('KYC fields are invalid.');
    if (!(await PartnerModel.exists({ _id: id })))
      throw new BadRequestException('Partner not found.');
    const key = process.env.FIELD_ENCRYPTION_KEY;
    if (!key) throw new Error('FIELD_ENCRYPTION_KEY is not configured.');
    const encrypted: Record<string, string> = {};
    for (const [field, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      const storageField =
        field === 'pan' ? 'panEnc' : field === 'bankAccount' ? 'bankAccountEnc' : `${field}Enc`;
      encrypted[storageField] = encryptField(value, key);
    }
    await PartnerModel.updateOne({ _id: id }, { $set: encrypted });
    const masked = Object.fromEntries(
      Object.entries(parsed.data).map(([field, value]) => [field, mask(value ?? '')]),
    );
    await this.audit.record(request, {
      action: 'partner.kyc_fields_updated',
      entity: 'partner',
      entityId: id,
      after: { fields: Object.keys(encrypted), masked },
    });
    return { updated: true, masked };
  }
}

function mask(value: string): string {
  if (!value) return '';
  return `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}
