import mongoose, { Schema, type Types } from 'mongoose';

// ─── Product Variant (embedded) ────────────────────────────────
export interface IProductVariant {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  stockQty: number;
  reservedQty: number;
  unit: 'KG' | 'G' | 'L' | 'ML' | 'UNIT' | 'BOX' | 'PALLET';
  pricing: {
    retailPrice: number;
    bulkPrice?: number;
    minBulkQty: number;
    currency: string;
    // optional super gross price visible to authorized PRIME suppliers when published
    superGrossPrice?: number;
  };
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  barcode?: string;
  images: string[];
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    stockQty: { type: Number, default: 0, min: 0 },
    reservedQty: { type: Number, default: 0 },
    unit: {
      type: String,
      enum: ['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'PALLET'],
      default: 'UNIT',
    },
    pricing: {
      retailPrice: { type: Number, required: true, min: 0 },
      bulkPrice: { type: Number, min: 0 },
      superGrossPrice: { type: Number, min: 0 },
      minBulkQty: { type: Number, default: 1 },
      currency: { type: String, default: 'TND' },
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    barcode: String,
    images: [String],
  },
  { _id: true }
);

// ─── Product ───────────────────────────────────────────────────
export interface IProduct {
  supplierId: Types.ObjectId;
  categoryId: Types.ObjectId;
  categoryPath: Array<{ _id: Types.ObjectId; name: string; slug: string }>;
  name: string;
  slug: string;
  description?: string;
  images: Array<{ url: string; alt?: string; order: number }>;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DELETED';
  variants: IProductVariant[];
  attributes: Array<{ key: string; value: string; unit?: string }>;
  dosage?: Array<{ key: string; value: string; unit?: string }>;
  tags: string[];
  sector: 'MEDICAL' | 'AGRICULTURAL' | 'BOTH';
  isFeatured: boolean;
  promotion: {
    isActive: boolean;
    promotionId?: Types.ObjectId;
    discountType?: 'PERCENT' | 'FIXED';
    discountValue?: number;
    endsAt?: Date;
  };
  priceVisibility: 'PUBLIC' | 'PRIME_ONLY' | 'HIDDEN';
  stats: {
    views: number;
    addToCart: number;
    totalOrders: number;
    rating: number;
    reviewCount: number;
  };
  supplierSnapshot: {
    name?: string;
    slug?: string;
    logo?: string;
    isVerified?: boolean;
    rating?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryPath: [
      {
        _id: Schema.Types.ObjectId,
        name: String,
        slug: String,
      },
    ],
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    images: [
      {
        url: String,
        alt: String,
        order: Number,
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED'],
      default: 'DRAFT',
    },
    variants: [ProductVariantSchema],
    attributes: [
      {
        key: String,
        value: String,
        unit: String,
      },
    ],
    dosage: [
      {
        key: String,
        value: String,
        unit: String,
      },
    ],
    tags: [String],
    sector: {
      type: String,
      enum: ['MEDICAL', 'AGRICULTURAL', 'BOTH'],
    },
    isFeatured: { type: Boolean, default: false },
    promotion: {
      isActive: { type: Boolean, default: false },
      promotionId: Schema.Types.ObjectId,
      discountType: { type: String, enum: ['PERCENT', 'FIXED'] },
      discountValue: Number,
      endsAt: Date,
    },
    priceVisibility: {
      type: String,
      enum: ['PUBLIC', 'PRIME_ONLY', 'HIDDEN'],
      default: 'PRIME_ONLY',
    },
    stats: {
      views: { type: Number, default: 0 },
      addToCart: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
    },
    supplierSnapshot: {
      name: String,
      slug: String,
      logo: String,
      isVerified: Boolean,
      rating: Number,
    },
  },
  { timestamps: true }
);

ProductSchema.index({ supplierId: 1, status: 1 });
ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ status: 1, isFeatured: -1, 'stats.totalOrders': -1 });
ProductSchema.index({ 'promotion.isActive': 1, 'promotion.endsAt': 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product =
  (mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)) as mongoose.Model<IProduct>;
