import { Module } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceNumberService } from './invoice-number.service';

@Module({ providers: [InvoiceRepository, InvoiceNumberService], exports: [InvoiceNumberService] })
export class BillingModule {}
