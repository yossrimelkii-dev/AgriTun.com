import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Review, Order, Product, Supplier } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';
import { createReviewSchema } from '@agrimed/types';

export const dynamic = 'force-dynamic';

// GET /api/reviews?productId=xxx — get reviews for a product
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const supplierId = searchParams.get('supplierId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!productId && !supplierId) {
      return NextResponse.json({ error: 'productId ou supplierId requis' }, { status: 400 });
    }

    await connectDB();

    const filter: any = { isVisible: true };
    if (productId) filter.productId = productId;
    if (supplierId) filter.supplierId = supplierId;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('buyerId', 'firstName lastName')
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Compute average
    const avgResult = await Review.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const average = avgResult[0]?.avg || 0;
    const ratingCount = avgResult[0]?.count || 0;

    return NextResponse.json({
      reviews,
      total,
      average: parseFloat(average.toFixed(1)),
      ratingCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/reviews — create a review (buyer only, must have purchased)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (session.role !== 'BUYER') {
      return NextResponse.json({ error: 'Seuls les acheteurs peuvent laisser un avis' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { productId, orderId, rating, comment } = parsed.data;
    await connectDB();

    // Verify the order belongs to this buyer and is delivered
    const order = await Order.findOne({
      _id: orderId,
      buyerId: session.userId,
      status: 'DELIVERED',
    });
    if (!order) {
      return NextResponse.json(
        { error: 'Commande introuvable ou non livrée' },
        { status: 400 }
      );
    }

    // Check product was in this order
    const hasProduct = order.items.some(
      (item: any) => item.productId.toString() === productId
    );
    if (!hasProduct) {
      return NextResponse.json(
        { error: 'Ce produit ne fait pas partie de cette commande' },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const existing = await Review.findOne({
      buyerId: session.userId,
      productId,
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Vous avez déjà donné un avis pour ce produit' },
        { status: 409 }
      );
    }

    // Get supplier ID from order
    const review = await Review.create({
      buyerId: session.userId,
      supplierId: order.supplierId,
      productId,
      orderId,
      rating,
      comment,
      isVerifiedPurchase: true,
      isVisible: true,
    });

    // Update product and supplier stats
    const productReviews = await Review.aggregate([
      { $match: { productId: review.productId, isVisible: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (productReviews[0]) {
      await Product.findByIdAndUpdate(productId, {
        'stats.averageRating': parseFloat(productReviews[0].avg.toFixed(1)),
        'stats.totalReviews': productReviews[0].count,
      });
    }

    const supplierReviews = await Review.aggregate([
      { $match: { supplierId: order.supplierId, isVisible: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (supplierReviews[0]) {
      await Supplier.findByIdAndUpdate(order.supplierId, {
        'stats.averageRating': parseFloat(supplierReviews[0].avg.toFixed(1)),
        'stats.totalReviews': supplierReviews[0].count,
      });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
