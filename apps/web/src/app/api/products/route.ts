export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Product, Supplier } from '@agrimed/db/models';
import { paginationSchema } from '@agrimed/types';
import { getSession } from '@/lib/auth/session';
import { stripBulkPricing } from '@/lib/middleware/price-visibility';

const PRODUCT_LIST_FIELDS =
  'name slug images status sector isFeatured stats supplierId supplierSnapshot promotion priceVisibility variants categoryPath tags';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    let session = null;
    try {
      session = await getSession();
    } catch (sessionError) {
      console.warn('Products route session lookup failed, continuing as anonymous:', sessionError);
      session = null;
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const categoryId = searchParams.get('categoryId');
    const sector = searchParams.get('sector');
    const featured = searchParams.get('featured');
    const supplierId = searchParams.get('supplierId');

    // Build query
    const query: Record<string, unknown> = { status: 'ACTIVE' };

    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      query.sector = sector;
    }
    if (featured === 'true') {
      query.isFeatured = true;
    }
    if (supplierId && mongoose.isValidObjectId(supplierId)) {
      query.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    // Cursor-based pagination
    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const products = await Product.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select(PRODUCT_LIST_FIELDS)
      .lean();

    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore ? items[items.length - 1]?._id?.toString() : null;

    // Fetch supplier settings for visible 'superGross' lists
    const supplierIds = Array.from(
      new Set(
        items
          .map((it) => (it as any).supplierId)
          .filter((id): id is string => Boolean(id) && mongoose.isValidObjectId(id))
          .map((id) => String(id))
      )
    );
    const suppliers = supplierIds.length
      ? await Supplier.find({ _id: { $in: supplierIds } }).select('settings.superGrossViewList').lean()
      : [];
    const suppliersById = new Map(suppliers.map((s) => [String((s as any)._id), s]));

    // CRITICAL: Strip bulk pricing for non-PRIME users, and pass authorized superGross lists per supplier
    const safeItems = items.map((it) => {
      const supplier = suppliersById.get(String((it as any).supplierId));
      const authorizedForSuperGross = ((supplier as any)?.settings?.superGrossViewList || []).map((id: any) => String(id));
      return stripBulkPricing(it as Record<string, unknown>, session, authorizedForSuperGross);
    });

    return NextResponse.json({
      items: safeItems,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
