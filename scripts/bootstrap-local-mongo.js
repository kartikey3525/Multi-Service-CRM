const adminDb = db.getSiblingDB('admin');
const rootName = process.env.MONGODB_LOCAL_ROOT_USERNAME;
const rootPassword = process.env.MONGODB_LOCAL_ROOT_PASSWORD;
const appPassword = process.env.MONGODB_LOCAL_APP_PASSWORD;
const migratorPassword = process.env.MONGODB_LOCAL_MIGRATOR_PASSWORD;
const viewerPassword = process.env.MONGODB_LOCAL_VIEWER_PASSWORD;
if (![rootName, rootPassword, appPassword, migratorPassword, viewerPassword].every(Boolean)) {
  throw new Error('Local Mongo bootstrap environment is incomplete.');
}

if (!adminDb.auth(rootName, rootPassword))
  throw new Error('Local Mongo root authentication failed.');

try {
  rs.status();
} catch {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'db:27017' }] });
}

const roleDb = db.getSiblingDB('admin');
const runtimePrivileges = [
  { resource: { db: 'crm_immutable', collection: '' }, actions: ['find', 'insert'] },
];
function ensureRole(targetDb, definition) {
  const found = targetDb.getRole(definition.role, { showPrivileges: true });
  if (found) {
    targetDb.updateRole(definition.role, {
      privileges: definition.privileges,
      roles: definition.roles,
    });
  } else {
    targetDb.createRole(definition);
  }
}

ensureRole(roleDb, {
  role: 'crmApplication',
  privileges: runtimePrivileges,
  roles: [{ role: 'readWrite', db: 'crm' }],
});
ensureRole(roleDb, {
  role: 'crmMigrator',
  privileges: [{ resource: { db: 'admin', collection: '' }, actions: ['viewRole'] }],
  roles: [
    ...['crm', 'crm_immutable', 'franchise_crm'].flatMap((name) => [
      { role: 'readWrite', db: name },
      { role: 'dbAdmin', db: name },
    ]),
  ],
});
ensureRole(roleDb, {
  role: 'crmLocalViewer',
  privileges: [
    {
      resource: { db: 'crm_immutable', collection: '' },
      actions: ['find', 'listCollections', 'listIndexes'],
    },
  ],
  roles: [{ role: 'read', db: 'crm' }],
});

function ensureUser(targetDb, user, password, role) {
  const found = targetDb.getUser(user);
  if (found) {
    targetDb.updateUser(user, { pwd: password, roles: [{ role, db: 'admin' }] });
  } else {
    targetDb.createUser({ user, pwd: password, roles: [{ role, db: 'admin' }] });
  }
}
ensureUser(roleDb, 'crm_app', appPassword, 'crmApplication');
ensureUser(roleDb, 'crm_migrator', migratorPassword, 'crmMigrator');
ensureUser(roleDb, 'crm_viewer', viewerPassword, 'crmLocalViewer');
print('Local MongoDB identities and role grants are ready.');
