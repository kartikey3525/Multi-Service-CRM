import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminUsersController } from './admin-users.controller';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { RedisStore } from './redis.store';
import { RateLimitService } from './rate-limit.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController, AdminUsersController, AuditController],
  providers: [
    RedisStore,
    RateLimitService,
    SessionService,
    AuthService,
    AuditService,
    PermissionGuard,
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [AuditService, SessionService, RateLimitService],
})
export class IdentityModule implements OnModuleInit {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async onModuleInit(): Promise<void> {
    await this.auth.initialize();
  }
}
