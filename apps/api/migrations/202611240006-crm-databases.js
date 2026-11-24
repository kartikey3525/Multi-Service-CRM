const movable = ['users', 'roles', 'password_reset_tokens', 'email_outbox'];

async function copyCollection(source, target) {
  const batch = [];
  for await (const document of source.find({})) {
    batch.push({
      replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true },
    });
    if (batch.length === 500) {
      await target.bulkWrite(batch, { ordered: false });
      batch.length = 0;
    }
  }
  if (batch.length) await target.bulkWrite(batch, { ordered: false });
}

module.exports = {
  async up(db) {
    const immutable = db.client.db('crm_immutable');
    const legacyName = process.env.MONGODB_LEGACY_DATABASE;
    if (legacyName && legacyName !== db.databaseName && legacyName !== 'crm_immutable') {
      const legacy = db.client.db(legacyName);
      for (const name of movable) {
        if (await legacy.listCollections({ name }, { nameOnly: true }).hasNext()) {
          await copyCollection(legacy.collection(name), db.collection(name));
        }
      }
      if (await legacy.listCollections({ name: 'audit_log' }, { nameOnly: true }).hasNext()) {
        await copyCollection(legacy.collection('audit_log'), immutable.collection('audit_log'));
      }
    }
    for (const name of ['ledger_entries', 'order_events']) {
      if (!(await immutable.listCollections({ name }, { nameOnly: true }).hasNext())) {
        await immutable.createCollection(name);
      }
    }
  },
  async down() {},
};
