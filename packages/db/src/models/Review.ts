import mongoose, { Schema, type Types } from 'mongoose';

export interface IReview {
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  comment?: string;
  isVerifiedPurchase: boolean;
  supplierReply?: {
    content: string;
    repliedAt: Date;
  };
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    isVerifiedPurchase: { type: Boolean, default: false },
    supplierReply: {
      content: String,
      repliedAt: Date,
    },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, isVisible: 1, createdAt: -1 });
ReviewSchema.index({ supplierId: 1, createdAt: -1 });
ReviewSchema.index({ buyerId: 1, productId: 1 }, { unique: true });

export const Review =
  (mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)) as mongoose.Model<IReview>;
