export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Product, Supplier, Category } from '@agrimed/db/models';
import { createProductSchema } from '@agrimed/types';
import { requireSupplier } from '@/lib/auth/session';

// Simple server-side HTML sanitizer — strips script tags and event handlers
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET — list supplier's own products
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const status = searchParams.get('status');

    // Supplier isolation: only own products
    const query: Record<string, unknown> = {
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
    };

    if (status && ['DRAFT', 'ACTIVE', 'PAUSED', 'DELETED'].includes(status)) {
      query.status = status;
    }
    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const products = await Product.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore ? items[items.length - 1]?._id?.toString() : null;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Supplier products list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create a new product
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Sanitize rich text description
    const sanitizedDescription = data.description
      ? sanitizeHtml(data.description)
      : undefined;

    // Fetch category for path
    const category = await Category.findById(data.categoryId).lean();
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    // Fetch supplier for snapshot
    const supplier = await Supplier.findById(session.supplierId).lean();
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 400 });
    }

    const categoryPath = [
      ...(category.ancestors || []),
      { _id: category._id, name: category.name, slug: category.slug },
    ];

    const baseSlug = slugify(data.name);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    // Normalize and coerce dosage items to strings to avoid accidental stripping
    const safeDosage = Array.isArray((body as any).dosage)
      ? (body as any).dosage
          .filter((d: any) => d?.key != null && d?.value != null)
          .map((d: any) => ({
            key: String(d.key).trim(),
            value: String(d.value).trim(),
            unit: typeof d.unit === 'string' && d.unit.trim() ? d.unit.trim() : undefined,
          }))
      : Array.isArray((data as any).dosage)
      ? (data as any).dosage
          .filter((d: any) => d?.key != null && d?.value != null)
          .map((d: any) => ({
            key: String(d.key).trim(),
            value: String(d.value).trim(),
            unit: typeof d.unit === 'string' && d.unit.trim() ? d.unit.trim() : undefined,
          }))
      : [];

    console.debug('Creating product - incoming dosage count:', Array.isArray((body as any).dosage) ? (body as any).dosage.length : (Array.isArray((data as any).dosage) ? (data as any).dosage.length : 0));

    const product = await Product.create({
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
      categoryId: category._id,
      categoryPath,
      name: data.name,
      slug: uniqueSlug,
      description: sanitizedDescription,
      images: Array.isArray((data as any).images)
        ? (data as any).images
            .filter((img: any) => img && typeof img.url === 'string' && img.url.trim())
            .map((img: any, index: number) => ({
              url: img.url.trim(),
              alt: typeof img.alt === 'string' ? img.alt.trim() : undefined,
              order: Number.isFinite(Number(img.order)) ? Number(img.order) : index,
            }))
        : [],
      status: 'DRAFT',
      sector: data.sector,
      tags: data.tags || [],
      priceVisibility: data.priceVisibility,
      variants: data.variants,
      attributes: data.attributes || [],
      // Zod schema in the compiled types package may not yet include `dosage` until rebuilt.
      // Prefer the raw request body first so submitted dosage is not stripped by Zod.
      dosage: safeDosage,
      supplierSnapshot: {
        name: supplier.companyName,
        slug: supplier.slug,
        logo: supplier.logo,
        isVerified: supplier.isVerified,
        rating: supplier.stats?.averageRating,
      },
    });

    // Increment supplier product count
    await Supplier.findByIdAndUpdate(session.supplierId, {
      $inc: { 'stats.totalProducts': 1 },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
