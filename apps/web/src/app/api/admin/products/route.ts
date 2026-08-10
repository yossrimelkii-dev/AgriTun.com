export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Product } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const status = searchParams.get('status');
    const sector = searchParams.get('sector');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (sector) query.sector = sector;
    if (search) query.name = { $regex: search, $options: 'i' };

    const products = await Product.find(query)
      .select('name slug sector status supplierSnapshot variants images isFeatured createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
