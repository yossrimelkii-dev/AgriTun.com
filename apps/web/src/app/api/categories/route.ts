import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Category } from '@agrimed/db/models';

// Cache the list for 5 min; categories are semi-static.
export const revalidate = 300;

const LIST_PROJECTION = '_id name slug icon image sector sortOrder parentId depth';
const HARD_LIMIT = 500;
// Cap URL/emoji lengths. Real Cloudinary URLs fit under 512; anything longer
// is almost certainly a base64 data URI and we drop it to keep the payload small.
const MAX_ICON_LEN = 1024;
const MAX_IMAGE_LEN = 2048;

// Build a small, bounded response object. Any `icon`/`image` that looks like a
// data-URI (or is suspiciously long) is dropped — the client falls back to
// defaults instead of shipping multi-MB base64.
function toClientCategory(doc: any) {
  const iconOk =
    typeof doc.icon === 'string' &&
    doc.icon.length > 0 &&
    doc.icon.length <= MAX_ICON_LEN &&
    !doc.icon.startsWith('data:');
  const imageOk =
    typeof doc.image === 'string' &&
    doc.image.length > 0 &&
    doc.image.length <= MAX_IMAGE_LEN &&
    !doc.image.startsWith('data:');

  return {
    _id: doc._id,
    name: doc.name,
    slug: doc.slug,
    parentId: doc.parentId ?? null,
    sector: doc.sector,
    sortOrder: doc.sortOrder ?? 0,
    depth: doc.depth ?? 0,
    ...(iconOk ? { icon: doc.icon } : {}),
    ...(imageOk ? { image: doc.image } : {}),
  };
}

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');
    const parentId = searchParams.get('parentId');
    const all = searchParams.get('all');

    const query: Record<string, unknown> = { isActive: true };

    if (sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      query.$or = [{ sector }, { sector: 'BOTH' }];
    }

    if (all === 'true') {
      const raw = await Category.find(query)
        .select(LIST_PROJECTION)
        .sort({ depth: 1, sortOrder: 1, name: 1 })
        .limit(HARD_LIMIT)
        .lean();
      return NextResponse.json(
        { categories: raw.map(toClientCategory) },
        { headers: CACHE_HEADERS }
      );
    }

    if (parentId === 'root' || !parentId) {
      query.parentId = null;
    } else {
      query.parentId = parentId;
    }

    const raw = await Category.find(query)
      .select(LIST_PROJECTION)
      .sort({ sortOrder: 1, name: 1 })
      .limit(HARD_LIMIT)
      .lean();

    return NextResponse.json(
      { categories: raw.map(toClientCategory) },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
