module.exports = {
  async up(db) {
    await db.createCollection('system_metadata');
    await db.collection('system_metadata').insertOne({
      _id: 'schema-version',
      version: 1,
      createdAt: new Date(),
    });
  },

  async down(db) {
    await db.collection('system_metadata').deleteOne({ _id: 'schema-version' });
    await db.collection('system_metadata').drop();
  },
};
