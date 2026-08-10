import mongoose, { Schema, type Types } from 'mongoose';

export interface IInvoice {
  invoiceNumber: string;
  orderId?: Types.ObjectId;
  supplierId: Types.ObjectId;
  buyerId?: Types.ObjectId;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issuedAt: Date;
  dueAt?: Date;
  paidAt?: Date;
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
  pdfUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
    },
    issuedAt: { type: Date, default: Date.now },
    dueAt: Date,
    paidAt: Date,
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
      tvaRate: { type: Number, default: 0.19 },
      tvaAmount: Number,
      totalTTC: Number,
      currency: { type: String, default: 'TND' },
    },
    pdfUrl: String,
    notes: String,
  },
  { timestamps: true }
);

InvoiceSchema.index({ supplierId: 1, status: 1 });
InvoiceSchema.index({ buyerId: 1 });
InvoiceSchema.index({ dueAt: 1, status: 1 });

export const Invoice =
  (mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema)) as mongoose.Model<IInvoice>;
