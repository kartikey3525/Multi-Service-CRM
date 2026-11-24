import { randomUUID } from 'node:crypto';

export interface PartnerFixture {
  _id: string;
  code: string;
  legalName: string;
  email: string;
  status: 'pending_payment' | 'active' | 'suspended' | 'closed';
  parentId: string | null;
  path: string[];
}

export function makePartnerFixture(overrides: Partial<PartnerFixture> = {}): PartnerFixture {
  const id = randomUUID();
  return {
    _id: id,
    code: `TST-${id.slice(0, 8).toUpperCase()}`,
    legalName: 'Example Franchise Services',
    email: `partner-${id}@example.test`,
    status: 'pending_payment',
    parentId: null,
    path: [id],
    ...overrides,
  };
}
