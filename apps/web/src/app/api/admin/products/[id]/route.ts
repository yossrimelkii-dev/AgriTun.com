export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Product } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

// PATCH /api/admin/products/[id] — update product status, featured flag
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.status && ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED'].includes(body.status)) {
      update.status = body.status;
    }

    if (body.isFeatured !== undefined) {
      update.isFeatured = !!body.isFeatured;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(params.id, { $set: update }, { new: true })
      .select('name slug status isFeatured sector')
      .lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin product update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
