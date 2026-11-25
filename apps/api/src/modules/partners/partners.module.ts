import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ApplicationsController } from './applications.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [IdentityModule],
  controllers: [ApplicationsController, AdminApplicationsController],
  providers: [ApplicationsService],
})
export class PartnersModule {}
