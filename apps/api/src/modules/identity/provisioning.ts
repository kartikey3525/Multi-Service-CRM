import { loadConfig } from '../../config';
import { AuditModel, RoleModel, UserModel } from './models';
import { seedRoles } from './role-seed';
import { hashPassword } from './security';

export async function provisionIdentity(): Promise<void> {
  const config = loadConfig();
  await seedRoles();
  const email = config.ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
  const existing = await UserModel.findOne({ email, kind: 'admin' });
  if (existing) return;
  const role = await RoleModel.findOne({ key: 'super_admin', kind: 'admin' });
  if (!role) throw new Error('The super_admin role is missing.');
  let user;
  try {
    user = await UserModel.create({
      email,
      name: 'Bootstrap administrator',
      passwordHash: await hashPassword(config.ADMIN_BOOTSTRAP_PASSWORD),
      kind: 'admin',
      status: 'active',
      roleIds: [role._id],
      totpEnabled: false,
      failedLogins: 0,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return;
    throw error;
  }
  await AuditModel.create({
    action: 'bootstrap_admin_created',
    entity: 'users',
    entityId: String(user._id),
    after: { email: user.email, kind: user.kind },
  });
}
