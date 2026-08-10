export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Product } from '@agrimed/db/models';

const PRODUCT_SEARCH_FIELDS = 'name slug sector tags categoryPath supplierSnapshot';

function toText(...parts: Array<unknown>) {
  return parts
    .flatMap((part) => {
      if (typeof part === 'string') return [part];
      if (typeof part === 'number') return [String(part)];
      return [];
    })
    .join(' ')
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const sector = searchParams.get('sector') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const sort = searchParams.get('sort') || undefined;

  try {
    await connectDB();

    const query: Record<string, unknown> = { status: 'ACTIVE' };
    if (sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      query.sector = sector;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const items = await Product.find(query)
      .sort(sort ? { [sort]: 1 } : { _id: -1 })
      .limit(Math.min(limit + offset, 300))
      .select(PRODUCT_SEARCH_FIELDS)
      .lean();

    const normalizedQuery = q.trim().toLowerCase();
    const filtered = normalizedQuery
      ? items.filter((item: any) =>
          toText(
            item.name,
            item.slug,
            item.sector,
            item.tags,
            item.categoryPath,
            item.supplierSnapshot?.companyName,
            item.supplierSnapshot?.name
          ).includes(normalizedQuery)
        )
      : items;

    const hits = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      hits,
      query: q,
      totalHits: filtered.length,
      limit,
      offset,
      processingTimeMs: 0,
    });
  } catch (error) {
    console.error('Search fallback error:', error);
    return NextResponse.json({ hits: [], query: q, totalHits: 0, limit, offset, processingTimeMs: 0 });
  }
}
