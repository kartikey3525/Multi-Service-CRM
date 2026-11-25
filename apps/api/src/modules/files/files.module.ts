import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PartnerDataModule } from '../partners/partner-data.module';

@Module({
  imports: [IdentityModule, PartnerDataModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
