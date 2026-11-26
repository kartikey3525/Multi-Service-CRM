const money = { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 };
const basisPoints = { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 };

const definitions = {
  plans: {
    required: [
      'key',
      'name',
      'tier',
      'priceMinPaise',
      'priceMaxPaise',
      'gstRateBp',
      'features',
      'active',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      key: { bsonType: 'string' },
      name: { bsonType: 'string' },
      tier: { enum: ['master_distributor', 'distributor', 'retailer'] },
      priceMinPaise: money,
      priceMaxPaise: money,
      idQuota: { bsonType: ['int', 'long', 'double', 'null'], minimum: 0, multipleOf: 1 },
      gstRateBp: basisPoints,
      features: { bsonType: 'object' },
      active: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  invoices: {
    required: [
      'number',
      'financialYear',
      'kind',
      'partnerId',
      'lines',
      'subtotalPaise',
      'taxPaise',
      'totalPaise',
      'status',
      'issuedAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      number: { bsonType: 'string' },
      financialYear: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}$' },
      kind: { enum: ['plan', 'order', 'credit_note'] },
      partnerId: { bsonType: 'objectId' },
      orderId: { bsonType: 'objectId' },
      planId: { bsonType: 'objectId' },
      lines: {
        bsonType: 'array',
        minItems: 1,
        items: {
          bsonType: 'object',
          required: ['description', 'quantity', 'unitPaise', 'gstRateBp'],
          properties: {
            description: { bsonType: 'string' },
            quantity: { bsonType: ['int', 'long', 'double'], minimum: 1, multipleOf: 1 },
            unitPaise: money,
            gstRateBp: basisPoints,
          },
        },
      },
      subtotalPaise: money,
      taxPaise: money,
      totalPaise: money,
      status: { enum: ['draft', 'issued', 'paid', 'void'] },
      pdfKey: { bsonType: 'string' },
      issuedAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  payments: {
    required: [
      'invoiceId',
      'partnerId',
      'amountPaise',
      'method',
      'reference',
      'recordedBy',
      'paidAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      invoiceId: { bsonType: 'objectId' },
      partnerId: { bsonType: 'objectId' },
      amountPaise: { ...money, minimum: 1 },
      method: { bsonType: 'string' },
      reference: { bsonType: 'string' },
      proofFileKey: { bsonType: 'string' },
      recordedBy: { bsonType: 'objectId' },
      paidAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  number_sequences: {
    required: ['key', 'financialYear', 'nextValue', 'createdAt', 'updatedAt'],
    properties: {
      key: { bsonType: 'string' },
      financialYear: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}$' },
      nextValue: { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const indexes = {
  plans: [
    [{ key: 1 }, { unique: true, name: 'plans_key_unique' }],
    [{ tier: 1, active: 1 }, { name: 'plans_tier_active' }],
  ],
  invoices: [
    [
      { financialYear: 1, number: 1 },
      { unique: true, name: 'invoices_fy_number_unique' },
    ],
    [{ partnerId: 1, issuedAt: -1 }, { name: 'invoices_partner_issued' }],
    [{ partnerId: 1, status: 1, issuedAt: -1 }, { name: 'invoices_partner_status' }],
  ],
  payments: [
    [
      { method: 1, reference: 1 },
      { unique: true, name: 'payments_method_reference_unique' },
    ],
    [{ partnerId: 1, paidAt: -1 }, { name: 'payments_partner_paid' }],
    [{ invoiceId: 1, paidAt: -1 }, { name: 'payments_invoice_paid' }],
  ],
  number_sequences: [
    [
      { key: 1, financialYear: 1 },
      { unique: true, name: 'number_sequences_key_fy_unique' },
    ],
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
  },
  // Forward-only migration: retain billing records and validators on rollback.
  async down() {},
};
