import mongoose, { Schema, type Types } from 'mongoose';

export interface IPromotion {
  supplierId: Types.ObjectId;
  title: string;
  description?: string;
  composition: string;
  dosage: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  scope: {
    type: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'CATEGORY';
    productIds: Types.ObjectId[];
    categoryIds: Types.ObjectId[];
  };
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  stats: {
    views: number;
    ordersGenerated: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    title: { type: String, required: true },
    description: String,
    composition: { type: String, required: true, trim: true, maxlength: 2000 },
    dosage: { type: String, required: true, trim: true, maxlength: 1000 },
    discountType: {
      type: String,
      enum: ['PERCENT', 'FIXED'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    scope: {
      type: {
        type: String,
        enum: ['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'CATEGORY'],
        required: true,
      },
      productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    stats: {
      views: { type: Number, default: 0 },
      ordersGenerated: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

PromotionSchema.index({ supplierId: 1, isActive: 1 });
PromotionSchema.index({ endDate: 1, isActive: 1 });

export const Promotion =
  (mongoose.models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema)) as mongoose.Model<IPromotion>;
