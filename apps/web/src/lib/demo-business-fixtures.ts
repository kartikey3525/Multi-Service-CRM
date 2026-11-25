import {
  OrderStatus,
  type AuditRecord,
  type CommissionRecord,
  type CustomerRecord,
  type LedgerEntryRecord,
  type NotificationRecord,
  type OrderEventRecord,
  type OrderRecord,
  type PayoutRecord,
  type ServiceRecord,
  type TicketRecord,
  type WalletRecord,
} from '@franchise-crm/shared';
import { demoPartners, demoUsers } from './demo-fixtures';

const d = (day: number) => new Date(Date.UTC(2026, 8, day, 10)).toISOString();
const objectId = (n: bigint) => n.toString(16).padStart(24, '0');

export const demoServices: ServiceRecord[] = [
  ['utility_bills', 'Utility bill payments', 'Bill payments', 45_000],
  ['mobile_recharge', 'Mobile and DTH recharge', 'Recharge', 10_000],
  ['pan_services', 'PAN card services', 'Citizen services', 125_000],
  ['travel_booking', 'Travel booking', 'Travel', 210_000],
  ['insurance', 'Insurance assistance', 'Financial services', 350_000],
  ['tax_filing', 'Tax return filing', 'Professional services', 499_000],
].map(([key, name, category, price], i) => ({
  _id: objectId(0x640000000000000000000100n + BigInt(i)),
  key: String(key),
  name: String(name),
  category: String(category),
  active: true,
  basePricePaise: Number(price),
  gstRateBps: 1800,
  createdAt: d(1),
  updatedAt: d(20),
}));

const orderStatuses = [
  OrderStatus.submitted,
  OrderStatus.assigned,
  OrderStatus.inProcess,
  OrderStatus.query,
  OrderStatus.completed,
  OrderStatus.rejected,
  OrderStatus.cancelled,
  OrderStatus.refunded,
] as const;
const customers = [
  'Aarav Kulkarni',
  'Mira Shah',
  'Kabir Desai',
  'Anaya Patil',
  'Ishaan Iyer',
  'Sana Rao',
  'Vihaan Joshi',
  'Diya Mehta',
  'Arjun Nair',
  'Tara Gupta',
];
export const demoOrders: OrderRecord[] = Array.from({ length: 150 }, (_, i) => {
  const partner = demoPartners[i % 4]!;
  const service = demoServices[i % demoServices.length]!;
  const amountPaise = service.basePricePaise + (i % 9) * 12_500;
  const status = orderStatuses[i % orderStatuses.length]!;
  const id = objectId(0x650000000000000000000001n + BigInt(i));
  return {
    _id: id,
    orderNumber: `SN-26-${String(10501 + i)}`,
    partnerId: partner.id,
    customerId: objectId(0x660000000000000000000001n + BigInt(i)),
    serviceId: service._id,
    status,
    amountPaise,
    gstPaise: Math.round(amountPaise * 0.18),
    totalPaise: Math.round(amountPaise * 1.18),
    assignedTo: ['assigned', 'in_process', 'query'].includes(status) ? demoUsers.admin.id : null,
    customerName: customers[i % customers.length]!,
    createdAt: d(1 + (i % 89)),
    updatedAt: d(1 + (i % 89)),
  };
});

export const demoWallets: WalletRecord[] = demoPartners.map((partner, i) => ({
  _id: objectId(0x670000000000000000000001n + BigInt(i)),
  partnerId: partner.id,
  balancePaise: 185_000 + (i % 11) * 83_750,
  currency: 'INR',
  status: 'active',
  createdAt: d(1),
  updatedAt: d(20),
}));

export const demoLedger: LedgerEntryRecord[] = Array.from({ length: 99 }, (_, i) => {
  const wallet = demoWallets[i % demoWallets.length]!;
  const amountPaise = 25_000 + (i % 18) * 10_000;
  return {
    _id: objectId(0x680000000000000000000001n + BigInt(i)),
    partnerId: wallet.partnerId,
    walletId: wallet._id,
    type: i % 3 === 0 ? 'debit' : 'credit',
    amountPaise,
    balanceAfterPaise: wallet.balancePaise + (i % 2 ? amountPaise : -amountPaise),
    referenceType: i % 3 === 0 ? 'order' : 'topup',
    referenceId: objectId(0x690000000000000000000001n + BigInt(i)),
    description: i % 3 === 0 ? 'Service order debit' : 'Wallet top-up',
    createdAt: d(1 + (i % 89)),
    createdBy: demoUsers.admin.id,
  };
});

export const demoOrderEvents: OrderEventRecord[] = demoOrders.map((order, i) => ({
  _id: objectId(0x6a0000000000000000000001n + BigInt(i)),
  orderId: order._id,
  fromStatus: null,
  toStatus: order.status,
  note: 'Order received',
  actorUserId: demoUsers.partner.id,
  createdAt: order.createdAt,
}));

export const demoCommissions: CommissionRecord[] = demoOrders.slice(0, 70).map((order, i) => ({
  _id: objectId(0x6b0000000000000000000001n + BigInt(i)),
  partnerId: order.partnerId,
  orderId: order._id,
  amountPaise: Math.round(order.amountPaise * 0.035),
  status: i % 3 === 0 ? 'payable' : 'accrued',
  createdAt: order.createdAt,
}));

export const demoPayouts: PayoutRecord[] = demoPartners.slice(0, 8).map((partner, i) => ({
  _id: objectId(0x6c0000000000000000000001n + BigInt(i)),
  partnerId: partner.id,
  amountPaise: 250_000 + i * 72_500,
  status: (['requested', 'batched', 'paid', 'rejected'] as const)[i % 4]!,
  requestedAt: d(5 + i),
  processedAt: i % 4 === 0 ? null : d(10 + i),
  reference: i % 4 === 2 ? `UTR26${62100 + i}` : null,
}));

export const demoTickets: TicketRecord[] = Array.from({ length: 12 }, (_, i) => ({
  _id: objectId(0x6d0000000000000000000001n + BigInt(i)),
  partnerId: demoPartners[i % demoPartners.length]!.id,
  ticketNumber: `TKT-26-${String(4201 + i)}`,
  subject: [
    'Payment confirmation pending',
    'PAN application status',
    'Unable to submit customer details',
  ][i % 3]!,
  category: ['payments', 'service', 'technical'][i % 3]!,
  status: (['open', 'in_progress', 'waiting', 'resolved'] as const)[i % 4]!,
  priority: (['normal', 'high', 'urgent'] as const)[i % 3]!,
  createdAt: d(12 + i),
  updatedAt: d(18 + i),
}));

export const demoNotifications: NotificationRecord[] = Array.from({ length: 15 }, (_, i) => ({
  _id: objectId(0x6e0000000000000000000001n + BigInt(i)),
  userId: i % 2 ? demoUsers.partner.id : demoUsers.admin.id,
  type: i % 3 ? 'order.updated' : 'wallet.topup',
  title: i % 3 ? 'Order status updated' : 'Wallet request received',
  body:
    i % 3 ? 'A service order has moved to its next step.' : 'A partner requested a wallet top-up.',
  readAt: i % 4 ? null : d(20),
  createdAt: d(18 + i),
}));

export const demoCustomers: CustomerRecord[] = Array.from({ length: 35 }, (_, i) => ({
  _id: objectId(0x710000000000000000000001n + BigInt(i)),
  partnerId: demoPartners[i % 4]!.id,
  fullName: ['Asha Kulkarni', 'Rahul Desai', 'Farah Khan', 'Omkar Patil', 'Meera Joshi'][i % 5]!,
  mobile: `+91 98${String(10000000 + i * 719).slice(0, 8)}`,
  email: `customer${i + 1}@example.demo`,
  consentAt: d(5 + (i % 20)),
  createdAt: d(5 + (i % 20)),
  updatedAt: d(20),
}));

export const demoTopups = demoPartners.slice(0, 7).map((partner, i) => ({
  id: objectId(0x6f0000000000000000000001n + BigInt(i)),
  partnerId: partner.id,
  amountPaise: 500_000 + i * 125_000,
  status: i < 3 ? 'pending' : i < 5 ? 'approved' : 'rejected',
  createdAt: d(19 + i),
  reference: `BANK-${String(901 + i)}`,
}));

export const demoAudit: AuditRecord[] = Array.from({ length: 24 }, (_, i) => ({
  _id: objectId(0x700000000000000000000001n + BigInt(i)),
  actorUserId: i % 2 ? demoUsers.partner.id : demoUsers.admin.id,
  action: [
    'application.reviewed',
    'wallet.topup_requested',
    'order.status_changed',
    'partner.updated',
  ][i % 4]!,
  entity: ['application', 'wallet_topup', 'order', 'partner'][i % 4]!,
  entityId: demoOrders[i]!._id,
  createdAt: d(12 + i),
  metadata: { source: 'demo-fixture' },
}));
