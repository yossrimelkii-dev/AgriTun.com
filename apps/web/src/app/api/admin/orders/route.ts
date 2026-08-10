export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Order, Supplier } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .select('orderNumber buyerId supplierId status pricing buyerSnapshot items shipping createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Resolve supplier names
    const supplierIds = [...new Set(orders.map((o: any) => o.supplierId?.toString()).filter(Boolean))];
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } })
      .select('companyName')
      .lean();
    const supplierMap = new Map(suppliers.map((s: any) => [s._id.toString(), s.companyName]));

    const enriched = orders.map((o: any) => ({
      ...o,
      supplierName: supplierMap.get(o.supplierId?.toString()) || '—',
    }));

    return NextResponse.json({ orders: enriched });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
