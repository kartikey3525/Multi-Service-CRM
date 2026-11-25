import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { StructuredLoggerMiddleware } from './common/structured-logger.middleware';
import { DatabaseLifecycle } from './database';
import { IdentityModule } from './modules/identity/identity.module';
import { PartnersModule } from './modules/partners/partners.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [IdentityModule, PartnersModule, FilesModule],
  controllers: [HealthController],
  providers: [StructuredLoggerMiddleware, DatabaseLifecycle],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(StructuredLoggerMiddleware).forRoutes('*');
  }
}
