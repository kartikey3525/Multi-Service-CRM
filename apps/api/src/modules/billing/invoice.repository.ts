import { ForbiddenException, Injectable } from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import type { ClientSession } from 'mongoose';
import { scopeToActor, type Actor } from '../../common/actor';
import { InvoiceModel, NumberSequenceModel, PaymentModel, type InvoiceRecord } from './models';

type Filter = Record<string, unknown>;

@Injectable()
export class InvoiceRepository {
  async ensureInvoiceSequence(financialYear: string): Promise<void> {
    try {
      await NumberSequenceModel.updateOne(
        { key: 'invoice', financialYear },
        { $setOnInsert: { key: 'invoice', financialYear, nextValue: 0 } },
        { upsert: true },
      );
    } catch (error) {
      // Parallel first-use upserts may race on the unique key; the winner's row is sufficient.
      if ((error as { code?: number }).code !== 11000) throw error;
      if (!(await NumberSequenceModel.exists({ key: 'invoice', financialYear }))) throw error;
    }
  }

  async incrementInvoiceSequence(financialYear: string, session: ClientSession): Promise<number> {
    const row = await NumberSequenceModel.findOneAndUpdate(
      { key: 'invoice', financialYear },
      { $inc: { nextValue: 1 } },
      { returnDocument: 'after', session },
    ).lean();
    if (!row) throw new Error(`Invoice sequence ${financialYear} was not initialized.`);
    return row.nextValue;
  }

  async createIssuedInvoice(actor: Actor, invoice: InvoiceRecord, session: ClientSession) {
    this.requirePermission(actor, Permission.invoicesIssue);
    if (actor.kind === 'partner' && !actor.partnerPath?.includes(String(invoice.partnerId)))
      throw new ForbiddenException('Invoice partner is outside the actor hierarchy.');
    const [created] = await InvoiceModel.create([invoice], { session });
    if (!created) throw new Error('Invoice insert returned no document.');
    return created;
  }

  listInvoices(actor: Actor, filter: Filter = {}) {
    this.requirePermission(actor, Permission.invoicesRead);
    return InvoiceModel.find(
      actor.kind === 'admin'
        ? SCOPE_BYPASS(actor, Permission.invoicesRead, filter)
        : scopeToActor(actor, filter, 'partnerId'),
    );
  }

  listPayments(actor: Actor, filter: Filter = {}) {
    this.requirePermission(actor, Permission.paymentsRead);
    return PaymentModel.find(
      actor.kind === 'admin'
        ? SCOPE_BYPASS(actor, Permission.paymentsRead, filter)
        : scopeToActor(actor, filter, 'partnerId'),
    );
  }

  private requirePermission(actor: Actor, permission: string) {
    if (!actor.permissions.has(permission)) throw new ForbiddenException('Permission denied.');
  }
}

/** Admin-wide reads are explicit and still require the route's declared permission. */
function SCOPE_BYPASS(actor: Actor, permission: string, filter: Filter): Filter {
  if (actor.kind !== 'admin' || !actor.permissions.has(permission))
    throw new ForbiddenException('The named administrator scope bypass is not authorized.');
  return scopeToActor(actor, filter);
}
