export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Category } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

// PATCH /api/admin/categories/[id] — update category fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      update.name = body.name.trim();
    }

    if (typeof body.slug === 'string' && body.slug.trim()) {
      update.slug = body.slug.trim();
    }

    if (typeof body.icon === 'string') {
      update.icon = body.icon.trim();
    }

    if (typeof body.image === 'string') {
      update.image = body.image.trim();
    }

    if (typeof body.sector === 'string' && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(body.sector)) {
      update.sector = body.sector;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const category = await Category.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    ).lean();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    console.error('Admin category update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
