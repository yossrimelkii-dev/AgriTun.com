export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Order } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';

/**
 * Supplier Dashboard Analytics — MongoDB Aggregation Pipelines
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const { searchParams } = new URL(req.url);
    const metric = searchParams.get('metric') ?? searchParams.get('type');
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);

    const supplierId = new mongoose.Types.ObjectId(session.supplierId);

    switch (metric) {
      case 'revenue': {
        // Revenue by month for the given year
        const result = await Order.aggregate([
          {
            $match: {
              supplierId,
              status: 'DELIVERED',
              createdAt: {
                $gte: new Date(`${year}-01-01`),
                $lt: new Date(`${year + 1}-01-01`),
              },
            },
          },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              revenue: { $sum: '$pricing.totalTTC' },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        return NextResponse.json({
          data: result.map((item) => ({
            ...item,
            total: item.revenue,
          })),
        });
      }

      case 'top-products': {
        // Top 10 products by revenue
        const result = await Order.aggregate([
          {
            $match: {
              supplierId,
              status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              productName: { $first: '$items.productName' },
              totalRevenue: { $sum: '$items.subtotal' },
              totalUnits: { $sum: '$items.qty' },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
        ]);

        return NextResponse.json({
          data: result.map((item) => ({
            ...item,
            totalQty: item.totalUnits,
          })),
        });
      }

      case 'orders-by-status': {
        // Orders count and total grouped by status
        const result = await Order.aggregate([
          { $match: { supplierId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total: { $sum: '$pricing.totalTTC' },
            },
          },
          { $sort: { count: -1 } },
        ]);

        return NextResponse.json({ data: result });
      }

      case 'overview': {
        // KPI overview: total revenue, orders, pending orders
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [revenueResult, ordersThisMonth, pendingOrders] = await Promise.all([
          Order.aggregate([
            { $match: { supplierId, status: 'DELIVERED' } },
            { $group: { _id: null, total: { $sum: '$pricing.totalTTC' }, count: { $sum: 1 } } },
          ]),
          Order.countDocuments({ supplierId, createdAt: { $gte: thirtyDaysAgo } }),
          Order.countDocuments({ supplierId, status: 'PENDING' }),
        ]);

        return NextResponse.json({
          data: {
            totalRevenue: revenueResult[0]?.total ?? 0,
            totalOrders: revenueResult[0]?.count ?? 0,
            ordersThisMonth,
            pendingOrders,
            revenue30d: revenueResult[0]?.total ?? 0,
            orders30d: ordersThisMonth,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
