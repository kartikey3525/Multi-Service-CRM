import { Module } from '@nestjs/common';
import { PartnersRepository } from './partners.repository';

@Module({ providers: [PartnersRepository], exports: [PartnersRepository] })
export class PartnerDataModule {}
