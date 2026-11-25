import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../identity/identity.decorator';
import { ApplicationsService } from './applications.service';
import type { Actor } from '../../common/actor';
import type { ApplicationStatus } from './models';

type RequestWithActor = Request & { actor?: Actor };
const decisionSchema = z.object({ reason: z.string().trim().min(5).max(1000) });
const approvalSchema = z.object({ parentId: z.string().optional() });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException('Request validation failed.');
  return parsed.data;
}

@Controller('v1/admin/applications')
export class AdminApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applications: ApplicationsService) {}

  @Get()
  @RequirePermission(Permission.applicationsRead, 'admin')
  list(
    @Query('status') status?: string,
    @Query('page') pageInput?: string,
    @Query('pageSize') pageSizeInput?: string,
    @Query('q') search?: string,
  ) {
    const allowed: ApplicationStatus[] = [
      'pending_email_verification',
      'submitted',
      'needs_info',
      'approved',
      'rejected',
    ];
    if (status && !allowed.includes(status as ApplicationStatus))
      throw new BadRequestException('Invalid application status.');
    const page = Math.max(1, Number.parseInt(pageInput ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeInput ?? '50', 10) || 50));
    return this.applications.list(status as ApplicationStatus | undefined, page, pageSize, search);
  }

  @Get('eligible-parents')
  @RequirePermission(Permission.applicationsRead, 'admin')
  eligibleParents(@Query('tier') tier: string | undefined, @Req() request: RequestWithActor) {
    if (tier !== 'master_distributor' && tier !== 'distributor')
      throw new BadRequestException('A valid parent tier is required.');
    if (!request.actor) throw new BadRequestException('Reviewer identity is missing.');
    return this.applications.eligibleParents(request.actor, tier);
  }

  @Get(':id')
  @RequirePermission(Permission.applicationsRead, 'admin')
  detail(@Param('id') id: string, @Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Reviewer identity is missing.');
    return this.applications.detail(request.actor, id);
  }

  @Post(':id/approve')
  @RequirePermission(Permission.applicationsReview, 'admin')
  approve(@Param('id') id: string, @Body() body: unknown, @Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Reviewer identity is missing.');
    return this.applications.approve(id, request.actor, parse(approvalSchema, body).parentId);
  }

  @Post(':id/reject')
  @RequirePermission(Permission.applicationsReview, 'admin')
  reject(@Param('id') id: string, @Body() body: unknown, @Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Reviewer identity is missing.');
    return this.applications.decide(
      id,
      request.actor.userId,
      'reject',
      parse(decisionSchema, body).reason,
    );
  }

  @Post(':id/request-info')
  @RequirePermission(Permission.applicationsReview, 'admin')
  requestInfo(@Param('id') id: string, @Body() body: unknown, @Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Reviewer identity is missing.');
    return this.applications.decide(
      id,
      request.actor.userId,
      'request_info',
      parse(decisionSchema, body).reason,
    );
  }
}
