export const ApplicationStatus = {
  submitted: 'submitted',
  needsInfo: 'needs_info',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export const PartnerStatus = {
  pendingPayment: 'pending_payment',
  active: 'active',
  suspended: 'suspended',
  closed: 'closed',
} as const;

export const InvoiceStatus = {
  draft: 'draft',
  issued: 'issued',
  paid: 'paid',
  void: 'void',
} as const;

export const TopupStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export const OrderStatus = {
  draft: 'draft',
  submitted: 'submitted',
  assigned: 'assigned',
  inProcess: 'in_process',
  query: 'query',
  completed: 'completed',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
} as const;

export const PayoutStatus = {
  requested: 'requested',
  batched: 'batched',
  paid: 'paid',
  rejected: 'rejected',
} as const;

export type ApplicationStatusValue = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
export type PartnerStatusValue = (typeof PartnerStatus)[keyof typeof PartnerStatus];
export type InvoiceStatusValue = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
export type TopupStatusValue = (typeof TopupStatus)[keyof typeof TopupStatus];
export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];
export type PayoutStatusValue = (typeof PayoutStatus)[keyof typeof PayoutStatus];
