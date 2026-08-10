export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User, Supplier, Product, Order } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const [users, suppliers, products, orders, pendingOrders, unverifiedSuppliers, primeUsers, revenueResult] =
      await Promise.all([
        User.countDocuments(),
        Supplier.countDocuments(),
        Product.countDocuments({ status: 'ACTIVE' }),
        Order.countDocuments(),
        Order.countDocuments({ status: 'PENDING' }),
        Supplier.countDocuments({ isVerified: false }),
        User.countDocuments({ 'badge.type': 'PRIME', 'badge.isActive': true }),
        Order.aggregate([
          { $match: { status: { $nin: ['CANCELLED'] } } },
          { $group: { _id: null, total: { $sum: '$pricing.totalTTC' } } },
        ]),
      ]);

    return NextResponse.json({
      users,
      suppliers,
      products,
      orders,
      pendingOrders,
      unverifiedSuppliers,
      primeUsers,
      revenue: revenueResult[0]?.total || 0,
    });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
