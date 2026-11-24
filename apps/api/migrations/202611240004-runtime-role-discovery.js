module.exports = {
  async up(db) {
    const database = db.databaseName;
    await db.command({
      updateRole: 'crmApplication',
      privileges: [
        { resource: { db: database, collection: '' }, actions: ['listCollections'] },
        ...['users', 'roles', 'password_reset_tokens', 'email_outbox'].map((collection) => ({
          resource: { db: database, collection },
          actions: ['find', 'insert', 'update', 'remove', 'createIndex', 'listIndexes'],
        })),
      ],
      roles: [{ role: 'auditAppender', db: database }],
    });
  },
  async down(db) {
    await db.command({
      updateRole: 'crmApplication',
      privileges: [
        ...['users', 'roles', 'password_reset_tokens', 'email_outbox'].map((collection) => ({
          resource: { db: db.databaseName, collection },
          actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
        })),
      ],
      roles: [{ role: 'auditAppender', db: db.databaseName }],
    });
  },
};
