export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Order } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import { updateOrderStatusSchema } from '@agrimed/types';
import { releaseStock } from '@/lib/stock/update-stock';

// PATCH — update order status (supplier only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await requireSupplier();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateOrderStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, note, trackingNumber, carrier } = parsed.data;

    // Supplier isolation: only update own orders
    const order = await Order.findOne({
      _id: params.id,
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle cancellation — release stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();
      try {
        for (const item of order.items) {
          await releaseStock(
            dbSession,
            item.productId.toString(),
            item.variantId.toString(),
            item.qty,
            order._id.toString()
          );
        }
        await dbSession.commitTransaction();
      } catch {
        await dbSession.abortTransaction();
      } finally {
        dbSession.endSession();
      }
    }

    // Update order status
    order.status = status;
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: new mongoose.Types.ObjectId(session.userId),
      note,
    });

    if (trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
    }
    if (carrier) {
      order.shipping.carrier = carrier;
    }
    if (status === 'SHIPPED') {
      order.shipping.shippedAt = new Date();
    }

    await order.save();

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
