import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { StockAlert, Product } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/stock-alerts — list stock alerts for supplier
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPPLIER' || !session.supplierId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();
    const alerts = await StockAlert.find({ supplierId: session.supplierId })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with product names
    const productIds = [...new Set(alerts.map((a) => a.productId.toString()))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name variants')
      .lean();
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    const enriched = alerts.map((alert: any) => {
      const product = productMap.get(alert.productId.toString());
      const variant = product?.variants?.find(
        (v: any) => v._id.toString() === alert.variantId.toString()
      );
      return {
        ...alert,
        productName: product?.name || 'Produit inconnu',
        variantName: variant?.name || 'Variante inconnue',
        currentStock: variant?.stock ?? null,
      };
    });

    return NextResponse.json({ alerts: enriched });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/stock-alerts — create a stock alert
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPPLIER' || !session.supplierId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { productId, variantId, threshold, notifyEmail } = await req.json();
    if (!productId || !variantId || threshold == null || !notifyEmail) {
      return NextResponse.json(
        { error: 'productId, variantId, threshold et notifyEmail requis' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify product belongs to supplier
    const product = await Product.findOne({
      _id: productId,
      supplierId: session.supplierId,
    });
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const alert = await StockAlert.findOneAndUpdate(
      { supplierId: session.supplierId, productId, variantId },
      {
        supplierId: session.supplierId,
        productId,
        variantId,
        threshold: Math.max(0, parseInt(threshold)),
        notifyEmail,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ alert }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/stock-alerts?id=xxx — delete a stock alert
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPPLIER' || !session.supplierId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 });
    }

    await connectDB();
    await StockAlert.deleteOne({ _id: id, supplierId: session.supplierId });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
