import mongoose, { Schema, Types } from 'mongoose';

export type BillingTier = 'master_distributor' | 'distributor' | 'retailer';
export type InvoiceKind = 'plan' | 'order' | 'credit_note';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface PlanRecord {
  key: string;
  name: string;
  tier: BillingTier;
  priceMinPaise: number;
  priceMaxPaise: number;
  idQuota: number | null;
  gstRateBp: number;
  features: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineRecord {
  description: string;
  quantity: number;
  unitPaise: number;
  gstRateBp: number;
}

export interface InvoiceRecord {
  number: string;
  financialYear: string;
  kind: InvoiceKind;
  partnerId: Types.ObjectId;
  orderId?: Types.ObjectId;
  planId?: Types.ObjectId;
  lines: InvoiceLineRecord[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  status: InvoiceStatus;
  pdfKey?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  invoiceId: Types.ObjectId;
  /** Denormalized from the invoice so every payment read can use scopeToActor. */
  partnerId: Types.ObjectId;
  amountPaise: number;
  method: string;
  reference: string;
  proofFileKey?: string;
  recordedBy: Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NumberSequenceRecord {
  key: string;
  financialYear: string;
  nextValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const integerPaise = {
  validator: (value: number) => Number.isSafeInteger(value) && value >= 0,
  message: 'Money must be a non-negative safe integer number of paise.',
};
const basisPoints = {
  validator: (value: number) => Number.isSafeInteger(value) && value >= 0,
  message: 'Rate must be a non-negative integer number of basis points.',
};

const planSchema = new Schema<PlanRecord>(
  {
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tier: { type: String, enum: ['master_distributor', 'distributor', 'retailer'], required: true },
    priceMinPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    priceMaxPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    idQuota: { type: Number, default: null, min: 0, validate: integerPaise },
    gstRateBp: { type: Number, required: true, min: 0, validate: basisPoints },
    features: { type: Schema.Types.Mixed, required: true, default: {} },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: 'plans' },
);
planSchema.index({ key: 1 }, { unique: true, name: 'plans_key_unique' });
planSchema.index({ tier: 1, active: 1 }, { name: 'plans_tier_active' });
planSchema.pre('validate', function validatePriceBand() {
  if (this.priceMaxPaise < this.priceMinPaise)
    this.invalidate('priceMaxPaise', 'Maximum plan price must not be below minimum price.');
});

const invoiceLineSchema = new Schema<InvoiceLineRecord>(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'Quantity must be an integer.' },
    },
    unitPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    gstRateBp: { type: Number, required: true, min: 0, validate: basisPoints },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceRecord>(
  {
    number: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    kind: { type: String, enum: ['plan', 'order', 'credit_note'], required: true },
    partnerId: { type: Schema.Types.ObjectId, required: true },
    orderId: Schema.Types.ObjectId,
    planId: Schema.Types.ObjectId,
    lines: {
      type: [invoiceLineSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length > 0 },
    },
    subtotalPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    taxPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    totalPaise: { type: Number, required: true, min: 0, validate: integerPaise },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'void'], required: true },
    pdfKey: String,
    issuedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'invoices' },
);
invoiceSchema.index(
  { financialYear: 1, number: 1 },
  { unique: true, name: 'invoices_fy_number_unique' },
);
invoiceSchema.index({ partnerId: 1, issuedAt: -1 }, { name: 'invoices_partner_issued' });
invoiceSchema.index({ partnerId: 1, status: 1, issuedAt: -1 }, { name: 'invoices_partner_status' });
invoiceSchema.pre('validate', function validateTotals() {
  const subtotal = this.lines.reduce((sum, line) => sum + line.quantity * line.unitPaise, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal !== this.subtotalPaise)
    this.invalidate('subtotalPaise', 'Invoice subtotal must equal its embedded lines.');
  if (this.totalPaise !== this.subtotalPaise + this.taxPaise)
    this.invalidate('totalPaise', 'Invoice total must equal subtotal plus tax.');
});

const paymentSchema = new Schema<PaymentRecord>(
  {
    invoiceId: { type: Schema.Types.ObjectId, required: true },
    partnerId: { type: Schema.Types.ObjectId, required: true },
    amountPaise: { type: Number, required: true, min: 1, validate: integerPaise },
    method: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
    proofFileKey: String,
    recordedBy: { type: Schema.Types.ObjectId, required: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'payments' },
);
paymentSchema.index(
  { method: 1, reference: 1 },
  { unique: true, name: 'payments_method_reference_unique' },
);
paymentSchema.index({ partnerId: 1, paidAt: -1 }, { name: 'payments_partner_paid' });
paymentSchema.index({ invoiceId: 1, paidAt: -1 }, { name: 'payments_invoice_paid' });

const sequenceSchema = new Schema<NumberSequenceRecord>(
  {
    key: { type: String, required: true },
    financialYear: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    nextValue: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { timestamps: true, collection: 'number_sequences' },
);
sequenceSchema.index(
  { key: 1, financialYear: 1 },
  { unique: true, name: 'number_sequences_key_fy_unique' },
);

function model<T>(name: string, schema: Schema<T>, collection: string) {
  return (
    (mongoose.models[name] as mongoose.Model<T> | undefined) ??
    mongoose.model<T>(name, schema, collection)
  );
}

export const PlanModel = model<PlanRecord>('BillingPlan', planSchema, 'plans');
export const InvoiceModel = model<InvoiceRecord>('BillingInvoice', invoiceSchema, 'invoices');
export const PaymentModel = model<PaymentRecord>('BillingPayment', paymentSchema, 'payments');
export const NumberSequenceModel = model<NumberSequenceRecord>(
  'NumberSequence',
  sequenceSchema,
  'number_sequences',
);
