import mongoose, { Schema, type Types } from 'mongoose';

export type MovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'RETURN';

export interface IStockMovement {
  supplierId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  variantName?: string;
  movementType: MovementType;
  qty: number;
  previousQty?: number;
  newQty?: number;
  reason?: string;
  referenceId?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    variantName: String,
    movementType: {
      type: String,
      enum: [
        'STOCK_IN',
        'STOCK_OUT',
        'RESERVATION',
        'RESERVATION_RELEASE',
        'ADJUSTMENT',
        'DAMAGE',
        'RETURN',
      ],
      required: true,
    },
    qty: { type: Number, required: true },
    previousQty: Number,
    newQty: Number,
    reason: String,
    referenceId: Schema.Types.ObjectId,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StockMovementSchema.index({ supplierId: 1, createdAt: -1 });
StockMovementSchema.index({ productId: 1, variantId: 1, createdAt: -1 });

export const StockMovement =
  (mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema)) as mongoose.Model<IStockMovement>;
