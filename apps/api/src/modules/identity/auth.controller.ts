import { BadRequestException, Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AllowPreAuth, Public, RequirePermission } from './identity.decorator';
import { SessionService } from './session.service';

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
const codeSchema = z.object({ code: z.string().trim().min(6).max(32) });
const forgotSchema = z.object({ email: z.string().email().max(254) });
const resetSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(128),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException('Request validation failed.');
  return result.data;
}

type IdentityRequest = Request & {
  actor?: { userId: string };
  authSession?: Awaited<ReturnType<SessionService['getRequestSession']>>;
};

@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Get('csrf')
  @Public()
  csrf(@Res({ passthrough: true }) response: Response) {
    return this.sessions.issueCsrf(response);
  }

  @Post('login')
  @Public()
  async partnerLogin(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.assertCsrf(request);
    const credentials = parse(credentialsSchema, body);
    return this.auth.login('partner', credentials.email, credentials.password, request, response);
  }

  @Post('admin/login')
  @Public()
  async adminLogin(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.assertCsrf(request);
    const credentials = parse(credentialsSchema, body);
    return this.auth.login('admin', credentials.email, credentials.password, request, response);
  }

  @Post('2fa/setup')
  @AllowPreAuth()
  @RequirePermission(Permission.identityTwoFactorManage, 'admin')
  async setupTotp(@Req() request: IdentityRequest) {
    if (!request.authSession)
      throw new BadRequestException('Authenticator enrollment session is missing.');
    return this.auth.setupTotp(request.authSession);
  }

  @Post('2fa/verify')
  @AllowPreAuth()
  @RequirePermission(Permission.identityTwoFactorManage)
  async verifyTotp(
    @Body() body: unknown,
    @Req() request: IdentityRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.authSession) throw new BadRequestException('Two-factor session is missing.');
    const { code } = parse(codeSchema, body);
    return this.auth.verifyTotp(code, request.authSession, request, response);
  }

  @Get('me')
  @RequirePermission(Permission.identityMe)
  async me(@Req() request: IdentityRequest) {
    if (!request.actor) throw new BadRequestException('Actor is missing.');
    return this.auth.currentUser(request.actor.userId);
  }

  @Post('password/change')
  @RequirePermission(Permission.identityMe)
  async changePassword(@Body() body: unknown, @Req() request: IdentityRequest) {
    if (!request.actor) throw new BadRequestException('Actor is missing.');
    const { currentPassword, newPassword } = parse(changePasswordSchema, body);
    return this.auth.changePassword(request.actor.userId, currentPassword, newPassword);
  }

  @Post('logout')
  @RequirePermission(Permission.identityLogout)
  async logout(@Req() request: IdentityRequest, @Res({ passthrough: true }) response: Response) {
    if (request.authSession) await this.sessions.removeSession(response, request.authSession);
    return { status: 'signed_out' };
  }

  @Post('password/forgot')
  @Public()
  async forgotPassword(@Body() body: unknown, @Req() request: Request) {
    await this.sessions.assertCsrf(request);
    const { email } = parse(forgotSchema, body);
    return this.auth.forgotPassword(email);
  }

  @Post('password/reset')
  @Public()
  async resetPassword(@Body() body: unknown, @Req() request: Request) {
    await this.sessions.assertCsrf(request);
    const { token, password } = parse(resetSchema, body);
    return this.auth.resetPassword(token, password);
  }
}
