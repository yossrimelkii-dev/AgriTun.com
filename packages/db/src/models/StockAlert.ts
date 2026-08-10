import mongoose, { Schema, type Types } from 'mongoose';

export interface IStockAlert {
  supplierId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  threshold: number;
  notifyEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockAlertSchema = new Schema<IStockAlert>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    threshold: { type: Number, required: true, min: 0 },
    notifyEmail: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StockAlertSchema.index({ supplierId: 1, isActive: 1 });
StockAlertSchema.index({ productId: 1, variantId: 1 });

export const StockAlert =
  (mongoose.models.StockAlert || mongoose.model<IStockAlert>('StockAlert', StockAlertSchema)) as mongoose.Model<IStockAlert>;
