export type {
  ApplicationSummary,
  DemoUser,
  KycDocumentSummary,
  PartnerSummary,
} from '@franchise-crm/shared';

export type ApiErrorPayload = { code?: string; message: string; requestId?: string };
export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };
