export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Product, Supplier } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';
import { stripBulkPricing } from '@/lib/middleware/price-visibility';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    const session = await getSession();

    const product = await Product.findOne({
      slug: params.slug,
      status: 'ACTIVE',
    }).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Increment views (non-blocking)
    Product.findByIdAndUpdate(product._id, { $inc: { 'stats.views': 1 } }).catch(() => {});

    // Fetch supplier settings to determine superGross visibility
    const supplier = product.supplierId ? await Supplier.findById(product.supplierId).select('settings.superGrossViewList').lean() : null;
    const authorizedForSuperGross = ((supplier as any)?.settings?.superGrossViewList || []).map((id: any) => String(id));

    // CRITICAL: Strip bulk pricing for non-PRIME users
    const safeProduct = stripBulkPricing(product as Record<string, unknown>, session, authorizedForSuperGross);

    return NextResponse.json({ product: safeProduct });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
