export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Product, StockMovement } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';

// GET — recent stock movements for supplier
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const movements = await StockMovement.find({ supplierId: session.supplierId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productId', 'name slug')
      .lean();

    return NextResponse.json({ movements });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — adjust stock for a specific variant
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();
    const body = await req.json();

    const { productId, variantId, qty, movementType, reason } = body;

    if (!productId || !variantId || qty === undefined || !movementType) {
      return NextResponse.json({ error: 'Champs requis: productId, variantId, qty, movementType' }, { status: 400 });
    }

    const validTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGE', 'RETURN'];
    if (!validTypes.includes(movementType)) {
      return NextResponse.json({ error: 'Type de mouvement invalide' }, { status: 400 });
    }

    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum === 0) {
      return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });
    }

    const product = await Product.findOne({
      _id: productId,
      supplierId: session.supplierId,
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const variant = product.variants.find(
      (v: any) => v._id.toString() === variantId
    );
    if (!variant) {
      return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 });
    }

    const previousQty = variant.stockQty;
    let delta = qtyNum;
    if (['STOCK_OUT', 'DAMAGE'].includes(movementType)) {
      delta = -Math.abs(qtyNum);
    } else if (['STOCK_IN', 'RETURN'].includes(movementType)) {
      delta = Math.abs(qtyNum);
    }
    // ADJUSTMENT: qty can be positive or negative as-is

    const newQty = Math.max(0, previousQty + delta);

    // Atomically update the variant stock
    await Product.updateOne(
      { _id: productId, 'variants._id': new mongoose.Types.ObjectId(variantId) },
      { $set: { 'variants.$.stockQty': newQty } }
    );

    // Record the movement
    const movement = await StockMovement.create({
      supplierId: session.supplierId,
      productId,
      variantId,
      variantName: variant.name,
      movementType,
      qty: Math.abs(qtyNum),
      previousQty,
      newQty,
      reason: reason?.trim().slice(0, 500) || undefined,
      performedBy: session.userId,
    });

    return NextResponse.json({ movement, previousQty, newQty });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
