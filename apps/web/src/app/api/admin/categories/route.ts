export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Category } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

// GET — all categories (including inactive) for admin
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');

    const query: Record<string, unknown> = {};
    if (sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(sector)) {
      query.sector = sector;
    }

    const categories = await Category.find(query)
      .sort({ depth: 1, sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create new category
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const { name, slug, parentId, sector, icon, image, sortOrder } = body;

    if (!name || !slug || !sector) {
      return NextResponse.json({ error: 'name, slug, and sector are required' }, { status: 400 });
    }

    let depth = 0;
    let ancestors: Array<{ _id: string; name: string; slug: string }> = [];

    if (parentId) {
      const parent = await Category.findById(parentId).lean();
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      }
      depth = (parent.depth || 0) + 1;
      ancestors = [
        ...((parent as any).ancestors || []),
        { _id: parent._id.toString(), name: parent.name, slug: parent.slug },
      ];
    }

    const category = await Category.create({
      name,
      slug,
      parentId: parentId || null,
      sector,
      icon: icon || '',
      image: typeof image === 'string' ? image.trim() : '',
      sortOrder: sortOrder ?? 0,
      isActive: true,
      depth,
      ancestors,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin category create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
