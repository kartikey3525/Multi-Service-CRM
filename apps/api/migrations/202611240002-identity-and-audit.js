const collections = ['users', 'roles', 'password_reset_tokens', 'email_outbox'];
const immutableCollections = ['audit_log', 'ledger_entries', 'order_events'];

const validators = {
  users: {
    bsonType: 'object',
    required: [
      'email',
      'passwordHash',
      'name',
      'kind',
      'status',
      'roleIds',
      'totpEnabled',
      'failedLogins',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      email: { bsonType: 'string' },
      passwordHash: { bsonType: 'string' },
      name: { bsonType: 'string' },
      kind: { enum: ['admin', 'partner'] },
      status: { enum: ['active', 'disabled'] },
      roleIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
      totpEnabled: { bsonType: 'bool' },
      failedLogins: { bsonType: ['int', 'long', 'double'] },
      lockedUntil: { bsonType: 'date' },
    },
  },
  roles: {
    bsonType: 'object',
    required: ['key', 'name', 'kind', 'permissions', 'system', 'createdAt', 'updatedAt'],
    properties: {
      key: { bsonType: 'string' },
      name: { bsonType: 'string' },
      kind: { enum: ['admin', 'partner'] },
      permissions: { bsonType: 'array', items: { bsonType: 'string' } },
      system: { bsonType: 'bool' },
    },
  },
  audit_log: {
    bsonType: 'object',
    required: ['action', 'entity', 'createdAt'],
    properties: {
      actorUserId: { bsonType: 'objectId' },
      action: { bsonType: 'string' },
      entity: { bsonType: 'string' },
      createdAt: { bsonType: 'date' },
    },
  },
  password_reset_tokens: {
    bsonType: 'object',
    required: ['userId', 'tokenHash', 'expiresAt', 'createdAt'],
    properties: {
      userId: { bsonType: 'objectId' },
      tokenHash: { bsonType: 'string' },
      expiresAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
    },
  },
  email_outbox: {
    bsonType: 'object',
    required: [
      'to',
      'template',
      'variables',
      'status',
      'attempts',
      'nextAttemptAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      to: { bsonType: 'string' },
      template: { bsonType: 'string' },
      status: { enum: ['pending', 'sending', 'sent', 'failed'] },
      attempts: { bsonType: ['int', 'long', 'double'] },
      nextAttemptAt: { bsonType: 'date' },
    },
  },
};

async function collectionExists(db, name) {
  return db.listCollections({ name }, { nameOnly: true }).hasNext();
}

module.exports = {
  async up(db) {
    for (const name of collections) {
      if (!(await collectionExists(db, name))) await db.createCollection(name);
      await db.command({
        collMod: name,
        validator: { $jsonSchema: validators[name] },
        validationLevel: 'strict',
        validationAction: 'error',
      });
    }

    await db
      .collection('users')
      .createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
    await db.collection('users').createIndex({ kind: 1, status: 1 }, { name: 'users_kind_status' });
    await db
      .collection('roles')
      .createIndex({ key: 1 }, { unique: true, name: 'roles_key_unique' });
    const immutableDb = db.client.db('crm_immutable');
    for (const name of immutableCollections) {
      if (!(await collectionExists(immutableDb, name))) await immutableDb.createCollection(name);
    }
    await immutableDb
      .collection('audit_log')
      .createIndex({ createdAt: -1 }, { name: 'audit_created_desc' });
    await immutableDb
      .collection('audit_log')
      .createIndex({ actorUserId: 1, createdAt: -1 }, { name: 'audit_actor_created_desc' });
    await immutableDb
      .collection('audit_log')
      .createIndex(
        { entity: 1, entityId: 1, createdAt: -1 },
        { name: 'audit_entity_created_desc' },
      );
    await db
      .collection('password_reset_tokens')
      .createIndex({ tokenHash: 1 }, { unique: true, name: 'reset_token_hash_unique' });
    await db
      .collection('password_reset_tokens')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'reset_token_expiry' });
    await db
      .collection('email_outbox')
      .createIndex({ status: 1, nextAttemptAt: 1, createdAt: 1 }, { name: 'outbox_pending' });

    await immutableDb.command({
      collMod: 'audit_log',
      validator: { $jsonSchema: validators.audit_log },
      validationLevel: 'strict',
      validationAction: 'error',
    });
  },

  async down() {
    // Forward-only schema: immutable business/audit collections are never dropped.
  },
};
