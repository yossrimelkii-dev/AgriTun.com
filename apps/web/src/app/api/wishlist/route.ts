import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Wishlist, Product } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/wishlist — list user's wishlist with populated products
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();
    const items = await Wishlist.find({ userId: session.userId })
      .sort({ addedAt: -1 })
      .lean();

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name slug images variants sector category')
      .lean();

    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
    const wishlist = items
      .map((item: any) => ({
        ...item,
        product: productMap.get(item.productId.toString()) || null,
      }))
      .filter((item: any) => item.product);

    return NextResponse.json({ wishlist });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/wishlist — add product to wishlist
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 });
    }

    await connectDB();

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    // Upsert to avoid duplicates
    await Wishlist.findOneAndUpdate(
      { userId: session.userId, productId },
      { userId: session.userId, productId, addedAt: new Date() },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/wishlist — remove product from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 });
    }

    await connectDB();
    await Wishlist.deleteOne({ userId: session.userId, productId });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
