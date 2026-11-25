import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { Public } from '../identity/identity.decorator';
import { SessionService } from '../identity/session.service';
import { ApplicationsService } from './applications.service';

const applicationSchema = z.object({
  applicantName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  mobile: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/),
  businessName: z.string().trim().min(2).max(160),
  legalType: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pin: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/),
  requestedTier: z.enum(['master_distributor', 'distributor', 'retailer']),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException('Application details are invalid.');
  return result.data;
}

@Controller('v1/public')
@Public()
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService) private readonly applications: ApplicationsService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Get('territories')
  territories(@Query('state') state?: string) {
    return this.applications.territories(state);
  }

  @Get('territories/availability')
  availability(@Query('state') state?: string, @Query('pin') pin?: string) {
    if (!state?.trim() || !pin?.trim())
      throw new BadRequestException('State and PIN code are required.');
    return this.applications.territoryAvailability(state, pin);
  }

  @Post('applications')
  async submit(@Body() body: unknown, @Req() request: Request) {
    await this.sessions.assertCsrf(request);
    return this.applications.submit(request, parse(applicationSchema, body));
  }

  @Get('applications/verify-email')
  verifyEmail(@Query('token') token?: string) {
    if (!token || token.length > 128)
      throw new BadRequestException('Verification link is invalid.');
    return this.applications.verifyEmail(token);
  }
}
