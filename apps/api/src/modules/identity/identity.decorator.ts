import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@franchise-crm/shared';
import type { IdentityKind } from './models';

export const PUBLIC_ROUTE = 'identity:public';
export const REQUIRED_PERMISSION = 'identity:permission';
export const ALLOW_PREAUTH = 'identity:allow-preauth';

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequirePermission = (permission: PermissionKey, kind?: IdentityKind) =>
  SetMetadata(REQUIRED_PERMISSION, { permission, ...(kind ? { kind } : {}) });
export const AllowPreAuth = () => SetMetadata(ALLOW_PREAUTH, true);
