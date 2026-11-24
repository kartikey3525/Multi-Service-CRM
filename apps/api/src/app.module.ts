import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { StructuredLoggerMiddleware } from './common/structured-logger.middleware';
import { DatabaseLifecycle } from './database';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [HealthController],
  providers: [StructuredLoggerMiddleware, DatabaseLifecycle],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(StructuredLoggerMiddleware).forRoutes('*');
  }
}
