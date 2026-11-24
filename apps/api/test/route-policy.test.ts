import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthController } from '../src/health.controller';
import { AdminUsersController } from '../src/modules/identity/admin-users.controller';
import { AuditController } from '../src/modules/identity/audit.controller';
import { AuthController } from '../src/modules/identity/auth.controller';
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from '../src/modules/identity/identity.decorator';

test('every HTTP handler is explicitly public or declares a permission', () => {
  const controllers = [HealthController, AuthController, AdminUsersController, AuditController];
  const missing: string[] = [];
  for (const controller of controllers) {
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      if (name === 'constructor') continue;
      const handler = Object.getOwnPropertyDescriptor(controller.prototype, name)?.value as
        object | undefined;
      if (!handler) continue;
      const isPublic = Reflect.getMetadata(PUBLIC_ROUTE, handler);
      const permission = Reflect.getMetadata(REQUIRED_PERMISSION, handler);
      if (!isPublic && !permission) missing.push(`${controller.name}.${name}`);
    }
  }
  assert.deepEqual(missing, []);
});
