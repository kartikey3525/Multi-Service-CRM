module.exports = {
  async up(db) {
    const adminDb = db.client.db('admin');
    const roleResults = {};
    for (const role of ['crmApplication', 'crmMigrator']) {
      const result = await adminDb.command({
        rolesInfo: { role, db: 'admin' },
        showPrivileges: true,
      });
      if (!result.roles?.[0]) throw new Error(`Required MongoDB role ${role}@admin is missing.`);
      roleResults[role] = result.roles[0];
    }
    const appRole = roleResults.crmApplication;
    const immutablePrivileges = appRole.privileges.filter(
      (privilege) => privilege.resource?.db === 'crm_immutable',
    );
    const immutableActions = new Set(
      immutablePrivileges.flatMap((privilege) => privilege.actions ?? []),
    );
    if (
      !immutableActions.has('find') ||
      !immutableActions.has('insert') ||
      immutablePrivileges.some(
        (privilege) =>
          privilege.actions?.some((action) => !['find', 'insert'].includes(action)) ||
          !privilege.actions?.length,
      )
    ) {
      throw new Error('crmApplication must have only find and insert on crm_immutable.');
    }

    const collections = await db.listCollections({ name: 'applications' }).toArray();
    const previousValidator = collections[0]?.options?.validator;
    const additions = {
      $jsonSchema: {
        bsonType: 'object',
        properties: {
          uploadTokenHash: { bsonType: 'string' },
          uploadTokenExpiresAt: { bsonType: 'date' },
        },
      },
    };
    await db.command({
      collMod: 'applications',
      validator: previousValidator ? { $and: [previousValidator, additions] } : additions,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    await db
      .collection('applications')
      .createIndex(
        { uploadTokenHash: 1 },
        { unique: true, sparse: true, name: 'applications_upload_token_unique' },
      );

    const partnerCollections = await db.listCollections({ name: 'partners' }).toArray();
    const previousPartnerValidator = partnerCollections[0]?.options?.validator;
    const encryptedFields = {
      $jsonSchema: {
        bsonType: 'object',
        properties: {
          panEnc: { bsonType: 'string' },
          gstinEnc: { bsonType: 'string' },
          addressEnc: { bsonType: 'string' },
          bankAccountEnc: { bsonType: 'string' },
          bankIfscEnc: { bsonType: 'string' },
        },
      },
    };
    await db.command({
      collMod: 'partners',
      validator: previousPartnerValidator
        ? { $and: [previousPartnerValidator, encryptedFields] }
        : encryptedFields,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  },

  async down() {
    // Encrypted partner fields and capability hashes are retained on rollback.
  },
};
