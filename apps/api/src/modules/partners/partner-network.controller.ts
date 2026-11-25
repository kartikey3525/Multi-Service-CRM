import { Controller, Get, Req, ForbiddenException } from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { Request } from 'express';
import type { Actor } from '../../common/actor';
import { RequirePermission } from '../identity/identity.decorator';
import { PartnerModel } from './models';

type RequestWithActor = Request & { actor?: Actor };

@Controller('v1/partner/network')
export class PartnerNetworkController {
  @Get()
  @RequirePermission(Permission.teamRead, 'partner')
  async network(@Req() request: RequestWithActor) {
    const partnerId = request.actor?.partnerId;
    if (!partnerId) throw new ForbiddenException('Partner membership is missing.');
    const parent = await PartnerModel.findById(partnerId).select('_id path').lean();
    if (!parent) throw new ForbiddenException('Partner membership is unavailable.');
    const rows = await PartnerModel.find({
      path: parent._id,
      _id: { $ne: parent._id },
      status: { $ne: 'closed' },
    })
      .select('code parentId path tier status businessName city state')
      .sort({ code: 1 })
      .lean();
    const items = rows.map((row) => ({
      id: String(row._id),
      code: row.code,
      parentId: row.parentId ? String(row.parentId) : null,
      depth: Math.max(1, row.path.length - parent.path.length),
      tier: row.tier,
      status: row.status,
      businessName: row.businessName,
      city: row.city,
      state: row.state,
    }));
    return {
      partnerId,
      total: items.length,
      countsByTier: Object.fromEntries(
        ['master_distributor', 'distributor', 'retailer'].map((tier) => [
          tier,
          items.filter((item) => item.tier === tier).length,
        ]),
      ),
      items,
    };
  }
}
