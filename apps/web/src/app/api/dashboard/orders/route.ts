export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Order } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import { updateOrderStatusSchema } from '@agrimed/types';

// GET — supplier's orders
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const status = searchParams.get('status');

    // Supplier isolation
    const query: Record<string, unknown> = {
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
    };

    if (status) query.status = status;
    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const orders = await Order.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? items[items.length - 1]?._id?.toString() : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Supplier orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
