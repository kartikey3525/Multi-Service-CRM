import { Controller, Get, Req, ForbiddenException, Inject } from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { Request } from 'express';
import type { Actor } from '../../common/actor';
import { RequirePermission } from '../identity/identity.decorator';
import { PartnersRepository } from './partners.repository';

type RequestWithActor = Request & { actor?: Actor };

@Controller('v1/partner/network')
export class PartnerNetworkController {
  constructor(@Inject(PartnersRepository) private readonly partners: PartnersRepository) {}

  @Get()
  @RequirePermission(Permission.teamRead, 'partner')
  async network(@Req() request: RequestWithActor) {
    const partnerId = request.actor?.partnerId;
    if (!partnerId) throw new ForbiddenException('Partner membership is missing.');
    if (!request.actor) throw new ForbiddenException('Partner membership is missing.');
    const result = await this.partners.listDownline(request.actor, partnerId);
    if (!result) throw new ForbiddenException('Partner membership is unavailable.');
    const { parent, rows } = result;
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
