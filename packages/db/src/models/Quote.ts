import mongoose, { Schema, type Types } from 'mongoose';

export interface IQuote {
  quoteNumber: string;
  orderId?: Types.ObjectId;
  supplierId: Types.ObjectId;
  buyerId?: Types.ObjectId;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  issuedAt: Date;
  validUntil?: Date;
  convertedInvoiceId?: Types.ObjectId;
  supplierInfo: {
    name?: string;
    address?: string;
    city?: string;
    taxId?: string;
    logo?: string;
    phone?: string;
    email?: string;
    website?: string;
    tier?: 'FREE' | 'PRIME' | 'SUPER';
    isVerified?: boolean;
  };
  buyerInfo: {
    name?: string;
    address?: string;
    city?: string;
    taxId?: string;
    phone?: string;
    email?: string;
  };
  lineItems: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totals: {
    subtotalHT: number;
    tvaRate: number;
    tvaAmount: number;
    totalTTC: number;
    currency: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    quoteNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'],
      default: 'DRAFT',
    },
    issuedAt: { type: Date, default: Date.now },
    validUntil: Date,
    convertedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    supplierInfo: {
      name: String,
      address: String,
      city: String,
      taxId: String,
      logo: String,
      phone: String,
      email: String,
      website: String,
      tier: { type: String, enum: ['FREE', 'PRIME', 'SUPER'] },
      isVerified: Boolean,
    },
    buyerInfo: {
      name: String,
      address: String,
      city: String,
      taxId: String,
      phone: String,
      email: String,
    },
    lineItems: [
      {
        description: String,
        qty: Number,
        unitPrice: Number,
        subtotal: Number,
      },
    ],
    totals: {
      subtotalHT: Number,
      tvaRate: { type: Number, default: 19 },
      tvaAmount: Number,
      totalTTC: Number,
      currency: { type: String, default: 'TND' },
    },
    notes: String,
  },
  { timestamps: true }
);

QuoteSchema.index({ supplierId: 1, status: 1 });
QuoteSchema.index({ buyerId: 1 });
QuoteSchema.index({ orderId: 1 });

export const Quote =
  (mongoose.models.Quote || mongoose.model<IQuote>('Quote', QuoteSchema)) as mongoose.Model<IQuote>;
