import mongoose, { Schema, type Types } from 'mongoose';

export interface IOrderItem {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  productName: string;
  variantName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface IOrder {
  orderNumber: string;
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  orderType: 'DETAIL' | 'BULK';
  items: IOrderItem[];
  status: OrderStatus;
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy?: Types.ObjectId;
    note?: string;
  }>;
  shipping: {
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: Date;
    estimatedDelivery?: Date;
    address: {
      fullName?: string;
      phone?: string;
      addressLine?: string;
      city?: string;
      wilaya?: string;
      country?: string;
      postalCode?: string;
    };
  };
  pricing: {
    subtotalHT: number;
    tvaRate: number;
    tvaAmount: number;
    totalTTC: number;
    currency: string;
    discountAmount: number;
  };
  buyerSnapshot: {
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
  };
  notes?: string;
  invoiceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    variantId: Schema.Types.ObjectId,
    productName: String,
    variantName: String,
    sku: String,
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    image: String,
  },
  { _id: true }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    orderType: {
      type: String,
      enum: ['DETAIL', 'BULK'],
      required: true,
    },
    items: [OrderItemSchema],
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ],
      default: 'PENDING',
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: Schema.Types.ObjectId,
        note: String,
      },
    ],
    shipping: {
      trackingNumber: String,
      carrier: String,
      shippedAt: Date,
      estimatedDelivery: Date,
      address: {
        fullName: String,
        phone: String,
        addressLine: String,
        city: String,
        wilaya: String,
        country: String,
        postalCode: String,
      },
    },
    pricing: {
      subtotalHT: Number,
      tvaRate: { type: Number, default: 0.19 },
      tvaAmount: Number,
      totalTTC: Number,
      currency: { type: String, default: 'TND' },
      discountAmount: { type: Number, default: 0 },
    },
    buyerSnapshot: {
      name: String,
      email: String,
      company: String,
      phone: String,
    },
    notes: String,
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

OrderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ supplierId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order =
  (mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)) as mongoose.Model<IOrder>;
