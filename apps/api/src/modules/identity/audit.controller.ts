import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import { Types } from 'mongoose';
import { RequirePermission } from './identity.decorator';
import { AuditModel } from './models';

@Controller('v1/admin/audit')
export class AuditController {
  @Get()
  @RequirePermission(Permission.auditRead, 'admin')
  async list(
    @Query('actorUserId') actorUserId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageInput?: string,
    @Query('pageSize') sizeInput?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageInput ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(sizeInput ?? '50', 10) || 50));
    const filter: Record<string, unknown> = {};
    if (actorUserId) {
      if (!Types.ObjectId.isValid(actorUserId))
        throw new BadRequestException('Invalid actor user ID.');
      filter.actorUserId = new Types.ObjectId(actorUserId);
    }
    if (entity) filter.entity = entity.slice(0, 80);
    if (action) filter.action = action.slice(0, 80);
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) {
        const date = new Date(from);
        if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid from date.');
        createdAt.$gte = date;
      }
      if (to) {
        const date = new Date(to);
        if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid to date.');
        createdAt.$lte = date;
      }
      filter.createdAt = createdAt;
    }
    const [items, total] = await Promise.all([
      AuditModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AuditModel.countDocuments(filter),
    ]);
    return { items, page, pageSize, total };
  }
}
