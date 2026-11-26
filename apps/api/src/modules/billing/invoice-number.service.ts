import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { Money } from '@franchise-crm/shared';
import type { Actor } from '../../common/actor';
import { InvoiceRepository } from './invoice.repository';
import type { InvoiceKind, InvoiceLineRecord, InvoiceRecord } from './models';

export interface InvoiceIssueInput {
  kind: InvoiceKind;
  partnerId: string;
  orderId?: string;
  planId?: string;
  lines: InvoiceLineRecord[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export function financialYearFor(date: Date): string {
  // Billing follows the Indian financial year; Mongo timestamps remain UTC.
  const indiaTime = new Date(date.getTime() + 330 * 60 * 1000);
  const year = indiaTime.getUTCFullYear();
  const startYear = indiaTime.getUTCMonth() >= 3 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

@Injectable()
export class InvoiceNumberService {
  constructor(@Inject(InvoiceRepository) private readonly invoices: InvoiceRepository) {}

  async issueInvoice(actor: Actor, input: InvoiceIssueInput, issuedAt = new Date()) {
    validateMoney(input);
    const financialYear = financialYearFor(issuedAt);
    await this.invoices.ensureInvoiceSequence(financialYear);

    const session = await mongoose.startSession();
    let result: Awaited<ReturnType<InvoiceRepository['createIssuedInvoice']>> | undefined;
    try {
      await session.withTransaction(async () => {
        const sequence = await this.invoices.incrementInvoiceSequence(financialYear, session);
        const number = `${financialYear}/${String(sequence).padStart(6, '0')}`;
        const invoice: InvoiceRecord = {
          number,
          financialYear,
          kind: input.kind,
          partnerId: objectId(input.partnerId),
          ...(input.orderId ? { orderId: objectId(input.orderId) } : {}),
          ...(input.planId ? { planId: objectId(input.planId) } : {}),
          lines: input.lines,
          subtotalPaise: input.subtotalPaise,
          taxPaise: input.taxPaise,
          totalPaise: input.totalPaise,
          status: 'issued',
          issuedAt,
          createdAt: issuedAt,
          updatedAt: issuedAt,
        };
        result = await this.invoices.createIssuedInvoice(actor, invoice, session);
      });
    } finally {
      await session.endSession();
    }
    if (!result) throw new Error('Invoice transaction completed without an invoice.');
    return result;
  }
}

function validateMoney(input: InvoiceIssueInput): void {
  const subtotal = Money.fromPaise(input.subtotalPaise);
  const tax = Money.fromPaise(input.taxPaise);
  const total = Money.fromPaise(input.totalPaise);
  let linesSubtotal = Money.zero();
  for (const line of input.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1)
      throw new RangeError('Invoice line quantity must be a positive integer.');
    const lineTotal = Money.fromPaise(line.unitPaise);
    linesSubtotal = linesSubtotal.add(Money.fromPaise(lineTotal.paise * line.quantity));
    if (!Number.isSafeInteger(line.gstRateBp) || line.gstRateBp < 0)
      throw new RangeError('GST rate must be a non-negative integer number of basis points.');
  }
  if (!input.lines.length || !linesSubtotal.equals(subtotal))
    throw new RangeError('Invoice subtotal must equal the sum of its embedded lines.');
  if (!subtotal.add(tax).equals(total))
    throw new RangeError('Invoice total must equal subtotal plus tax.');
}

function objectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value))
    throw new RangeError('Invalid invoice reference ID.');
  return new mongoose.Types.ObjectId(value);
}
