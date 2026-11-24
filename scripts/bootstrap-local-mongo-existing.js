// One-time local transition for the pre-auth development volume only.
// Run against mongod --noauth with the existing mongodata volume mounted.
const adminDb = db.getSiblingDB('admin');
const roleDb = db.getSiblingDB('admin');
const rootName = process.env.MONGODB_LOCAL_ROOT_USERNAME;
const rootPassword = process.env.MONGODB_LOCAL_ROOT_PASSWORD;
const appPassword = process.env.MONGODB_LOCAL_APP_PASSWORD;
const migratorPassword = process.env.MONGODB_LOCAL_MIGRATOR_PASSWORD;
const viewerPassword = process.env.MONGODB_LOCAL_VIEWER_PASSWORD;
if (![rootName, rootPassword, appPassword, migratorPassword, viewerPassword].every(Boolean)) {
  throw new Error('Local Mongo bootstrap environment is incomplete.');
}

if (!adminDb.getUser(rootName)) {
  adminDb.createUser({ user: rootName, pwd: rootPassword, roles: ['root'] });
}
const applicationRole = {
  role: 'crmApplication',
  privileges: [{ resource: { db: 'crm_immutable', collection: '' }, actions: ['find', 'insert'] }],
  roles: [{ role: 'readWrite', db: 'crm' }],
};
const migratorRole = {
  role: 'crmMigrator',
  privileges: [{ resource: { db: 'admin', collection: '' }, actions: ['viewRole'] }],
  roles: ['crm', 'crm_immutable', 'franchise_crm'].flatMap((name) => [
    { role: 'readWrite', db: name },
    { role: 'dbAdmin', db: name },
  ]),
};
const viewerRole = {
  role: 'crmLocalViewer',
  privileges: [
    {
      resource: { db: 'crm_immutable', collection: '' },
      actions: ['find', 'listCollections', 'listIndexes'],
    },
  ],
  roles: [{ role: 'read', db: 'crm' }],
};
for (const definition of [applicationRole, migratorRole, viewerRole]) {
  const existing = roleDb.getRole(definition.role, { showPrivileges: true });
  if (existing)
    roleDb.updateRole(definition.role, {
      privileges: definition.privileges,
      roles: definition.roles,
    });
  else roleDb.createRole(definition);
}
for (const [user, pwd, role] of [
  ['crm_app', appPassword, 'crmApplication'],
  ['crm_migrator', migratorPassword, 'crmMigrator'],
  ['crm_viewer', viewerPassword, 'crmLocalViewer'],
]) {
  if (roleDb.getUser(user)) roleDb.updateUser(user, { pwd, roles: [{ role, db: 'admin' }] });
  else roleDb.createUser({ user, pwd, roles: [{ role, db: 'admin' }] });
}
print('Local Mongo identities and role grants are ready for auth mode.');
