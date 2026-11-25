import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ApplicationsController } from './applications.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { ApplicationsService } from './applications.service';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnerNetworkController } from './partner-network.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    ApplicationsController,
    AdminApplicationsController,
    AdminPartnersController,
    PartnerNetworkController,
  ],
  providers: [ApplicationsService],
})
export class PartnersModule {}
