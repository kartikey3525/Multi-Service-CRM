import { OrderStatus, type OrderStatusValue } from './status.js';

export type MockActor = { id: string; permissions: readonly string[]; partnerId?: string };
export type MockFailure = { status: number; message: string };

export function authorizeMockAction(
  actor: MockActor | null,
  permission: string,
): MockFailure | null {
  if (!actor) return { status: 401, message: 'Sign in to continue.' };
  if (!actor.permissions.includes(permission))
    return { status: 403, message: 'You do not have permission to perform this action.' };
  return null;
}

export function isInPartnerSubtree(
  actorPartnerId: string,
  candidatePath: readonly string[],
): boolean {
  return candidatePath.includes(actorPartnerId);
}

const orderTransitions: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  [OrderStatus.draft]: [OrderStatus.submitted, OrderStatus.cancelled],
  [OrderStatus.submitted]: [
    OrderStatus.assigned,
    OrderStatus.inProcess,
    OrderStatus.query,
    OrderStatus.rejected,
    OrderStatus.cancelled,
  ],
  [OrderStatus.assigned]: [
    OrderStatus.inProcess,
    OrderStatus.query,
    OrderStatus.rejected,
    OrderStatus.cancelled,
  ],
  [OrderStatus.inProcess]: [OrderStatus.query, OrderStatus.completed, OrderStatus.rejected],
  [OrderStatus.query]: [OrderStatus.inProcess, OrderStatus.cancelled],
  [OrderStatus.completed]: [OrderStatus.refunded],
  [OrderStatus.rejected]: [],
  [OrderStatus.cancelled]: [],
  [OrderStatus.refunded]: [],
};

export function canTransitionOrder(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return orderTransitions[from].includes(to);
}

export type MockLedgerEntry = Readonly<{
  id: string;
  direction: 'credit' | 'debit';
  amountPaise: number;
  referenceId: string;
}>;

/** Ledger entries are immutable values; callers add a new entry instead of changing one. */
export function appendLedgerEntry<T extends MockLedgerEntry>(
  entries: readonly T[],
  entry: T,
): readonly T[] {
  if (!Number.isSafeInteger(entry.amountPaise) || entry.amountPaise <= 0)
    throw new RangeError('Ledger amounts must be positive integer paise.');
  if (entries.some((existing) => existing.id === entry.id))
    throw new Error('Ledger entry IDs are append-only and unique.');
  return [...entries, Object.freeze({ ...entry })];
}

export function scopedPartnerIds(
  actorPartnerId: string,
  partners: readonly { id: string; path: readonly string[] }[],
): string[] {
  return partners
    .filter((partner) => isInPartnerSubtree(actorPartnerId, partner.path))
    .map((partner) => partner.id);
}
