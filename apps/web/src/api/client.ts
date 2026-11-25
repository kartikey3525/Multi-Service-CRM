import type {
  ApplicationRecord,
  AuditRecord,
  LedgerEntryRecord,
  OrderRecord,
  PartnerRecord,
  CustomerRecord,
  PayoutRecord,
  ServiceRecord,
  TicketRecord,
  WalletRecord,
} from '@franchise-crm/shared';
import { apiGet, apiPost, apiPut } from '../lib/api-client';

export type OrderFilters = {
  status?: string;
  partnerId?: string;
  serviceId?: string;
  page?: number;
  pageSize?: number;
};
export type PartnerFilters = {
  parentId?: string;
  tier?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
const query = (values: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const result = search.toString();
  return result ? `?${result}` : '';
};

/** Domain API surface shared by the demo mock adapter and the production HTTP adapter. */
export const crmApi = {
  listOrders: (filters: OrderFilters = {}) =>
    apiGet<Page<OrderRecord>>(`/v1/orders${query(filters)}`),
  getOrder: (id: string) => apiGet<{ order: OrderRecord }>(`/v1/orders/${id}`),
  createOrder: (input: { serviceId: string; customerName: string; amountPaise: number }) =>
    apiPost<{ order: OrderRecord; trackingToken: string }>('/v1/orders', input),
  transitionOrder: (id: string, status: OrderRecord['status'], note?: string) =>
    apiPut<{ order: OrderRecord }>(`/v1/orders/${id}/status`, { status, note }),
  getWallet: () => apiGet<{ wallet: WalletRecord }>('/v1/partner/wallet'),
  requestTopup: (amountPaise: number, reference: string) =>
    apiPost<{ accepted: boolean }>('/v1/partner/wallet/topups', { amountPaise, reference }),
  listLedger: (page = 1) =>
    apiGet<Page<LedgerEntryRecord>>(`/v1/partner/wallet/ledger${query({ page })}`),
  listPartners: (filters: PartnerFilters = {}) =>
    apiGet<Page<PartnerRecord>>(`/v1/admin/partners${query(filters)}`),
  approvePartner: (id: string, parentId?: string) =>
    apiPost<{ status: string }>(`/v1/admin/applications/${id}/approve`, { parentId }),
  listApplications: (status?: string) =>
    apiGet<Page<ApplicationRecord>>(`/v1/admin/applications${query({ status })}`),
  listServices: () => apiGet<{ items: ServiceRecord[] }>('/v1/services'),
  listPayouts: () => apiGet<Page<PayoutRecord>>('/v1/partner/payouts'),
  listTickets: () => apiGet<Page<TicketRecord>>('/v1/partner/tickets'),
  listCustomers: () => apiGet<Page<CustomerRecord>>('/v1/partner/customers'),
  listAudit: () => apiGet<Page<AuditRecord>>('/v1/admin/audit'),
};
