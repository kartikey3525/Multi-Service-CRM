const role = {
  role: 'crmApplication',
  privileges: [
    ...['users', 'roles', 'password_reset_tokens', 'email_outbox'].map((collection) => ({
      resource: { db: '', collection },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    })),
  ],
  roles: [{ role: 'auditAppender', db: '' }],
};

module.exports = {
  async up(db) {
    const dbName = db.databaseName;
    await db.command({
      updateRole: 'auditAppender',
      privileges: [
        {
          resource: { db: dbName, collection: 'audit_log' },
          actions: ['find', 'insert', 'createIndex'],
        },
      ],
      roles: [],
    });
    const existing = await db.command({ rolesInfo: { role: role.role, db: dbName } });
    const definition = {
      ...role,
      privileges: role.privileges.map((privilege) => ({
        ...privilege,
        resource: { ...privilege.resource, db: dbName },
      })),
      roles: [{ role: 'auditAppender', db: dbName }],
    };
    if (existing.roles?.length) {
      await db.command({
        updateRole: role.role,
        privileges: definition.privileges,
        roles: definition.roles,
      });
    } else {
      await db.command({
        createRole: role.role,
        privileges: definition.privileges,
        roles: definition.roles,
      });
    }
  },

  async down(db) {
    try {
      await db.command({ dropRole: role.role });
    } catch (error) {
      if (error.code !== 11 && error.codeName !== 'RoleNotFound') throw error;
    }
  },
};
