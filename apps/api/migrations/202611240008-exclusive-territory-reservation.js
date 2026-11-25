module.exports = {
  async up(db) {
    await db.command({
      collMod: 'territories',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'key',
            'name',
            'state',
            'pinPrefixes',
            'exclusive',
            'active',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            key: { bsonType: 'string' },
            name: { bsonType: 'string' },
            state: { bsonType: 'string' },
            pinPrefixes: { bsonType: 'array', items: { bsonType: 'string' } },
            exclusive: { bsonType: 'bool' },
            active: { bsonType: 'bool' },
            currentPartnerId: { bsonType: 'objectId' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
      validationLevel: 'strict',
      validationAction: 'error',
    });
    await db
      .collection('territories')
      .createIndex({ currentPartnerId: 1 }, { sparse: true, name: 'territories_reserved_partner' });
  },
  async down() {},
};
