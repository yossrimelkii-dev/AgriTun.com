export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Order, Product, Supplier, User, StockMovement } from '@agrimed/db/models';
import { placeOrderSchema } from '@agrimed/types';
import { requireAuth } from '@/lib/auth/session';

// Atomic order number generator using a counter collection
async function generateOrderNumber(): Promise<string> {
  try {
    const counter = mongoose.connection.collection('counters');
    const result = await counter.findOneAndUpdate(
      { _id: 'orderNumber' as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const seq = String(result?.seq ?? 1).padStart(6, '0');
    const year = new Date().getFullYear();
    return `ORD-${year}-${seq}`;
  } catch {
    // Fallback: use timestamp-based order number
    const ts = Date.now().toString(36).toUpperCase();
    return `ORD-${new Date().getFullYear()}-${ts}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session_auth = await requireAuth();

    const body = await req.json();
    const parsed = placeOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items, shippingAddress, notes } = parsed.data;

    // Validate all products exist and belong to same supplier
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await Product.find({
      _id: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: 'ACTIVE',
    }).lean();

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    // All items must belong to one supplier
    const supplierIds = [...new Set(products.map((p) => p.supplierId.toString()))];
    if (supplierIds.length !== 1) {
      return NextResponse.json(
        { error: 'All items must be from the same supplier' },
        { status: 400 }
      );
    }

    const supplierId = supplierIds[0]!;
    const isPrime = session_auth.badgeType === 'PRIME' && session_auth.badgeActive;

    // Build line items
    const lineItems = items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId)!;
      const variant = product.variants.find((v: { _id: mongoose.Types.ObjectId }) => v._id.toString() === item.variantId);

      if (!variant) throw new Error(`Variant ${item.variantId} not found`);

      const unitPrice = isPrime && variant.pricing.bulkPrice
        ? variant.pricing.bulkPrice
        : variant.pricing.retailPrice;

      return {
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        qty: item.qty,
        unitPrice,
        subtotal: unitPrice * item.qty,
        image: product.images?.[0]?.url,
      };
    });

    const subtotalHT = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
    const tvaRate = 0.19;
    const tvaAmount = Math.round(subtotalHT * tvaRate);
    const totalTTC = subtotalHT + tvaAmount;

    // Get buyer snapshot
    const buyer = await User.findById(session_auth.userId).lean();
    const buyerSnapshot = {
      name: `${buyer?.profile?.firstName ?? ''} ${buyer?.profile?.lastName ?? ''}`.trim(),
      email: buyer?.email,
      phone: buyer?.profile?.phone,
    };

    // ─── Create Order (without transaction for Atlas M0 compatibility) ───
    try {
      const orderNumber = await generateOrderNumber();

      // 1. Decrement stock for each item (atomic per-variant updates)
      for (const item of items) {
        const stockResult = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants._id': item.variantId,
            'variants.stockQty': { $gte: item.qty },
          },
          {
            $inc: {
              'variants.$.stockQty': -item.qty,
              'variants.$.reservedQty': item.qty,
            },
          },
          { new: true }
        );

        if (!stockResult) {
          return NextResponse.json({ error: 'Stock insuffisant pour un ou plusieurs articles' }, { status: 409 });
        }
      }

      // 2. Create order document
      const order = await Order.create({
        orderNumber,
        buyerId: new mongoose.Types.ObjectId(session_auth.userId),
        supplierId: new mongoose.Types.ObjectId(supplierId),
        orderType: isPrime ? 'BULK' : 'DETAIL',
        items: lineItems,
        status: 'PENDING',
        statusHistory: [{ status: 'PENDING', changedAt: new Date(), changedBy: new mongoose.Types.ObjectId(session_auth.userId) }],
        shipping: { address: shippingAddress },
        pricing: { subtotalHT, tvaRate, tvaAmount, totalTTC, currency: 'TND', discountAmount: 0 },
        buyerSnapshot,
        notes,
      });

      // 3. Update supplier stats
      await Supplier.findByIdAndUpdate(
        supplierId,
        { $inc: { 'stats.totalOrders': 1 } }
      );

      // 4. Log stock movements
      for (const item of items) {
        const product = products.find((p) => p._id.toString() === item.productId);
        await StockMovement.create({
          supplierId,
          productId: item.productId,
          variantId: item.variantId,
          movementType: 'RESERVATION',
          qty: -item.qty,
          referenceId: order._id,
          reason: `Order ${orderNumber}`,
        });
      }

      return NextResponse.json({ order }, { status: 201 });
    } catch (txError) {
      console.error('Order creation error:', txError);
      return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {
      buyerId: new mongoose.Types.ObjectId(session.userId),
    };

    if (status) query.status = status;
    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const orders = await Order.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;

    const supplierIds = [
      ...new Set(
        items
          .map((order: any) => order?.supplierId?.toString?.())
          .filter(Boolean)
      ),
    ];

    const suppliers = supplierIds.length
      ? await Supplier.find({
          _id: { $in: supplierIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select('_id slug companyName')
          .lean()
      : [];

    const suppliersById = new Map(
      suppliers.map((supplier: any) => [
        supplier._id.toString(),
        {
          id: supplier._id.toString(),
          slug: supplier.slug,
          name: supplier.companyName,
        },
      ])
    );

    const enrichedItems = items.map((order: any) => {
      const supplierKey = order?.supplierId?.toString?.();
      const supplier = supplierKey ? suppliersById.get(supplierKey) ?? null : null;
      return {
        ...order,
        supplier,
      };
    });

    const nextCursor = hasMore ? items[items.length - 1]?._id?.toString() : null;

    return NextResponse.json({ orders: enrichedItems, items: enrichedItems, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.error('Orders list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
