import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Product } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';
import { syncAllProducts } from '@/lib/search/meilisearch';

export const dynamic = 'force-dynamic';

// POST /api/admin/sync-search — bulk sync all products to Meilisearch
export async function POST() {
  try {
    await requireRole('ADMIN');
    await connectDB();

    const products = await Product.find({ status: 'ACTIVE' }).lean();
    await syncAllProducts(products as any);

    return NextResponse.json({
      success: true,
      message: `${products.length} produits synchronisés avec Meilisearch`,
      count: products.length,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Erreur de synchronisation' }, { status: 500 });
  }
}
