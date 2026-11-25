const definitions = {
  territories: {
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
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  applications: {
    required: [
      'applicantName',
      'email',
      'mobile',
      'businessName',
      'legalType',
      'city',
      'state',
      'pin',
      'requestedTier',
      'emailVerificationTokenHash',
      'emailVerificationExpiresAt',
      'status',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      applicantName: { bsonType: 'string' },
      email: { bsonType: 'string' },
      mobile: { bsonType: 'string' },
      businessName: { bsonType: 'string' },
      legalType: { bsonType: 'string' },
      city: { bsonType: 'string' },
      state: { bsonType: 'string' },
      pin: { bsonType: 'string' },
      requestedTier: { enum: ['master_distributor', 'distributor', 'retailer'] },
      territoryId: { bsonType: 'objectId' },
      emailVerificationTokenHash: { bsonType: 'string' },
      emailVerificationExpiresAt: { bsonType: 'date' },
      emailVerifiedAt: { bsonType: 'date' },
      status: {
        enum: ['pending_email_verification', 'submitted', 'needs_info', 'approved', 'rejected'],
      },
      reviewerId: { bsonType: 'objectId' },
      decisionReason: { bsonType: 'string' },
      partnerId: { bsonType: 'objectId' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  partners: {
    required: [
      'code',
      'path',
      'tier',
      'status',
      'applicationId',
      'ownerUserId',
      'businessName',
      'legalType',
      'mobile',
      'email',
      'city',
      'state',
      'pin',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      code: { bsonType: 'string' },
      parentId: { bsonType: 'objectId' },
      path: { bsonType: 'array', items: { bsonType: 'objectId' } },
      tier: { enum: ['master_distributor', 'distributor', 'retailer'] },
      status: { enum: ['pending_payment', 'active', 'suspended', 'closed'] },
      applicationId: { bsonType: 'objectId' },
      ownerUserId: { bsonType: 'objectId' },
      businessName: { bsonType: 'string' },
      legalType: { bsonType: 'string' },
      mobile: { bsonType: 'string' },
      email: { bsonType: 'string' },
      city: { bsonType: 'string' },
      state: { bsonType: 'string' },
      pin: { bsonType: 'string' },
      territoryId: { bsonType: 'objectId' },
      panEnc: { bsonType: 'string' },
      gstin: { bsonType: 'string' },
      address: { bsonType: 'string' },
      bankAccountEnc: { bsonType: 'string' },
      bankIfsc: { bsonType: 'string' },
      activatedAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  partner_users: {
    required: [
      'partnerId',
      'userId',
      'role',
      'staffPermissions',
      'status',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      partnerId: { bsonType: 'objectId' },
      userId: { bsonType: 'objectId' },
      role: { enum: ['owner', 'staff'] },
      staffPermissions: { bsonType: 'array', items: { bsonType: 'string' } },
      status: { enum: ['active', 'disabled'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  kyc_documents: {
    required: [
      'ownerType',
      'ownerId',
      'docType',
      'fileKey',
      'contentType',
      'sizeBytes',
      'status',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      ownerType: { enum: ['application', 'partner'] },
      ownerId: { bsonType: 'objectId' },
      docType: { bsonType: 'string' },
      fileKey: { bsonType: 'string' },
      contentType: { bsonType: 'string' },
      sizeBytes: { bsonType: ['int', 'long', 'double'] },
      status: { enum: ['pending', 'verified', 'rejected'] },
      verifiedBy: { bsonType: 'objectId' },
      verifiedAt: { bsonType: 'date' },
      rejectionReason: { bsonType: 'string' },
      expiresAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const indexes = {
  territories: [
    [{ key: 1 }, { unique: true, name: 'territories_key_unique' }],
    [{ state: 1, active: 1 }, { name: 'territories_state_active' }],
  ],
  applications: [
    [{ status: 1, createdAt: -1 }, { name: 'applications_status_created' }],
    [{ email: 1, createdAt: -1 }, { name: 'applications_email_created' }],
    [
      { emailVerificationTokenHash: 1 },
      { unique: true, sparse: true, name: 'applications_verify_hash_unique' },
    ],
  ],
  partners: [
    [{ code: 1 }, { unique: true, name: 'partners_code_unique' }],
    [{ applicationId: 1 }, { unique: true, name: 'partners_application_unique' }],
    [{ path: 1 }, { name: 'partners_path' }],
    [{ parentId: 1, tier: 1, status: 1 }, { name: 'partners_parent_tier_status' }],
  ],
  partner_users: [
    [
      { partnerId: 1, userId: 1 },
      { unique: true, name: 'partner_users_unique' },
    ],
    [{ userId: 1 }, { unique: true, name: 'partner_users_user_unique' }],
  ],
  kyc_documents: [
    [{ ownerType: 1, ownerId: 1, docType: 1 }, { name: 'kyc_owner_type' }],
    [{ status: 1, expiresAt: 1 }, { name: 'kyc_status_expiry' }],
  ],
};

module.exports = {
  async up(db) {
    for (const [name, definition] of Object.entries(definitions)) {
      if (!(await db.listCollections({ name }, { nameOnly: true }).hasNext()))
        await db.createCollection(name);
      await db.command({
        collMod: name,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: definition.required,
            properties: definition.properties,
          },
        },
        validationLevel: 'strict',
        validationAction: 'error',
      });
      for (const [keys, options] of indexes[name])
        await db.collection(name).createIndex(keys, options);
    }

    const now = new Date();
    for (const territory of [
      {
        key: 'demo-delhi',
        name: 'Demo Delhi',
        state: 'Delhi',
        pinPrefixes: ['11'],
        exclusive: false,
      },
      {
        key: 'demo-mumbai',
        name: 'Demo Mumbai',
        state: 'Maharashtra',
        pinPrefixes: ['400'],
        exclusive: false,
      },
    ]) {
      await db
        .collection('territories')
        .updateOne(
          { key: territory.key },
          { $setOnInsert: { ...territory, active: true, createdAt: now, updatedAt: now } },
          { upsert: true },
        );
    }
  },
  async down() {},
};
