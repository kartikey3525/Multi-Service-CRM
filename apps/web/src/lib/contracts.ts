export type ApiErrorPayload = {
  code: string;
  message: string;
  requestId?: string;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PartnerSummary = {
  id: string;
  code: string;
  parentId: string | null;
  depth: number;
  tier: 'retailer' | 'distributor' | 'master_distributor';
  status: 'pending_payment' | 'active' | 'suspended' | 'closed';
  businessName: string;
  city: string;
  state: string;
};

export type ApplicationSummary = {
  id: string;
  applicantName: string;
  email: string;
  businessName: string;
  requestedTier: PartnerSummary['tier'];
  status: 'pending_email_verification' | 'submitted' | 'needs_info' | 'approved' | 'rejected';
  receivedAt: string;
};

export type KycDocumentSummary = {
  id: string;
  docType: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  expiresAt?: string;
};

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  kind: 'admin' | 'partner';
  roleNames: string[];
  permissions: string[];
  totpEnabled: boolean;
  partner?: {
    id: string;
    code: string;
    tier: PartnerSummary['tier'];
    status: PartnerSummary['status'];
  };
};
