import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Product, Supplier, Category } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/products/[id] — get single product for editing
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSupplier();
    await connectDB();

    const product = await Product.findOne({
      _id: params.id,
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
    }).lean();

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    // Ensure dosage is always present (optional field)
    (product as any).dosage = (product as any).dosage || [];

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/dashboard/products/[id] — update product
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSupplier();
    await connectDB();

    // Verify ownership
    const existing = await Product.findOne({
      _id: params.id,
      supplierId: new mongoose.Types.ObjectId(session.supplierId),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Status change
    if (body.status && ['DRAFT', 'ACTIVE', 'PAUSED'].includes(body.status)) {
      updates.status = body.status;
    }

    // Basic fields
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (body.sector && ['MEDICAL', 'AGRICULTURAL', 'BOTH'].includes(body.sector)) updates.sector = body.sector;
    if (body.priceVisibility && ['PUBLIC', 'PRIME_ONLY', 'HIDDEN'].includes(body.priceVisibility)) {
      updates.priceVisibility = body.priceVisibility;
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags.filter((t: any) => typeof t === 'string').map((t: string) => t.trim());
    }
    if (typeof body.isFeatured === 'boolean') updates.isFeatured = body.isFeatured;

    // Product images update
    if (Array.isArray(body.images)) {
      updates.images = body.images
        .filter((img: any) => img && typeof img.url === 'string' && img.url.trim())
        .map((img: any, index: number) => ({
          url: img.url.trim(),
          alt: typeof img.alt === 'string' ? img.alt.trim() : undefined,
          order: Number.isFinite(Number(img.order)) ? Number(img.order) : index,
        }));
    }

    // Category change
    if (typeof body.categoryId === 'string' && body.categoryId.trim()) {
      const category = await Category.findById(body.categoryId).lean();
      if (category) {
        updates.categoryId = (category as any)._id;
        updates.categoryPath = [
          ...((category as any).ancestors || []),
          { _id: (category as any)._id, name: (category as any).name, slug: (category as any).slug },
        ];
      }
    }

    // Variants update
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      updates.variants = body.variants.map((v: any) => ({
        _id: v._id || new mongoose.Types.ObjectId(),
        name: v.name?.trim() || '',
        sku: v.sku?.trim() || '',
        stockQty: parseInt(v.stockQty) || 0,
        reservedQty: v.reservedQty || 0,
        unit: v.unit || 'UNIT',
        pricing: {
          retailPrice: parseFloat(v.pricing?.retailPrice) || 0,
          bulkPrice: v.pricing?.bulkPrice ? parseFloat(v.pricing.bulkPrice) : undefined,
          superGrossPrice: v.pricing?.superGrossPrice ? parseFloat(v.pricing.superGrossPrice) : undefined,
          minBulkQty: parseInt(v.pricing?.minBulkQty) || 1,
          currency: 'TND',
        },
        weight: v.weight ? parseFloat(v.weight) : undefined,
        barcode: v.barcode?.trim() || undefined,
        images: v.images || [],
      }));
    }

    // Attributes update
    if (Array.isArray(body.attributes)) {
      updates.attributes = body.attributes
        .filter((a: any) => a?.key?.trim() && a?.value?.trim())
        .map((a: any) => ({
          key: a.key.trim(),
          value: a.value.trim(),
          unit: a.unit?.trim() || undefined,
        }));
    }

    // Dosage update (optional)
    if (Array.isArray(body.dosage)) {
      console.debug('PATCH product - incoming dosage count:', body.dosage.length);
      updates.dosage = body.dosage
        .filter((d: any) => d?.key != null && d?.value != null && String(d.key).trim() && String(d.value).trim())
        .map((d: any) => ({
          key: String(d.key).trim(),
          value: String(d.value).trim(),
          unit: typeof d.unit === 'string' && d.unit.trim() ? d.unit.trim() : undefined,
        }));
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(params.id, { $set: updates }, { new: true }).lean();

    // Ensure dosage present on returned doc
    if (product) (product as any).dosage = (product as any).dosage || [];

    return NextResponse.json({ product });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/dashboard/products/[id] — soft-delete product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSupplier();
    await connectDB();

    const product = await Product.findOneAndUpdate(
      {
        _id: params.id,
        supplierId: new mongoose.Types.ObjectId(session.supplierId),
      },
      { status: 'DELETED' },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    // Decrement supplier product count
    await Supplier.findByIdAndUpdate(session.supplierId, {
      $inc: { 'stats.totalProducts': -1 },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
