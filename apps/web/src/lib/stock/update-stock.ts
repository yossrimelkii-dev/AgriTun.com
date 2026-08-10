import mongoose from 'mongoose';
import { Product } from '@agrimed/db/models';
import { StockMovement } from '@agrimed/db/models';

/**
 * Atomic stock decrement with race condition prevention.
 * Uses findOneAndUpdate with a guard on stockQty >= qty.
 */
export async function decrementStock(
  session: mongoose.ClientSession,
  productId: string,
  variantId: string,
  qty: number,
  referenceLabel?: string
): Promise<void> {
  const result = await Product.findOneAndUpdate(
    {
      _id: productId,
      'variants._id': variantId,
      'variants.stockQty': { $gte: qty },
    },
    {
      $inc: {
        'variants.$.stockQty': -qty,
        'variants.$.reservedQty': qty,
      },
    },
    { session, new: true }
  );

  if (!result) {
    throw new Error('INSUFFICIENT_STOCK');
  }

  // Log the stock movement within the transaction
  await StockMovement.create(
    [
      {
        supplierId: result.supplierId,
        productId,
        variantId,
        movementType: 'RESERVATION',
        qty: -qty,
        reason: referenceLabel || 'Order stock reservation',
      },
    ],
    { session }
  );
}

/**
 * Release reserved stock (e.g., on order cancellation).
 */
export async function releaseStock(
  session: mongoose.ClientSession,
  productId: string,
  variantId: string,
  qty: number,
  orderId?: string
): Promise<void> {
  await Product.findOneAndUpdate(
    {
      _id: productId,
      'variants._id': variantId,
    },
    {
      $inc: {
        'variants.$.stockQty': qty,
        'variants.$.reservedQty': -qty,
      },
    },
    { session }
  );

  const product = await Product.findById(productId).select('supplierId').lean();

  await StockMovement.create(
    [
      {
        supplierId: product?.supplierId,
        productId,
        variantId,
        movementType: 'RESERVATION_RELEASE',
        qty,
        referenceId: orderId && mongoose.isValidObjectId(orderId) ? new mongoose.Types.ObjectId(orderId) : undefined,
      },
    ],
    { session }
  );
}
