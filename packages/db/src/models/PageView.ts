import mongoose, { Schema, type Types } from 'mongoose';

export interface IPageView {
  productId?: Types.ObjectId;
  supplierId?: Types.ObjectId;
  visitorId?: string;
  referrer?: string;
  country?: string;
  device?: string;
  timestamp: Date;
}

const PageViewSchema = new Schema<IPageView>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  visitorId: String,
  referrer: String,
  country: String,
  device: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 7776000 }, // 90 days TTL
  },
});

PageViewSchema.index({ productId: 1, timestamp: -1 });
PageViewSchema.index({ supplierId: 1, timestamp: -1 });

export const PageView =
  (mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema)) as mongoose.Model<IPageView>;
