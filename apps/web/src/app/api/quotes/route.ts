export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Quote, Order, Supplier, User } from '@agrimed/db/models';
import { requireAuth } from '@/lib/auth/session';
import mongoose from 'mongoose';

const ALLOWED_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;
type QuoteStatus = typeof ALLOWED_STATUSES[number];

type IncomingLineItem = {
  description?: unknown;
  qty?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};
type IncomingInfo = {
  name?: unknown;
  address?: unknown;
  city?: unknown;
  taxId?: unknown;
  phone?: unknown;
  email?: unknown;
  logo?: unknown;
  website?: unknown;
};

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}
function toStr(v: unknown, max = 500): string {
  if (v == null) return '';
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}
function normalizeInfo(input: IncomingInfo | undefined | null) {
  const src = input ?? {};
  return {
    name: toStr(src.name, 200),
    address: toStr(src.address, 500),
    city: toStr(src.city, 200),
    taxId: toStr(src.taxId, 60),
    phone: toStr(src.phone, 60),
    email: toStr(src.email, 200),
    logo: toStr(src.logo, 2000),
    website: toStr(src.website, 500),
  };
}
function normalizeLineItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw): { description: string; qty: number; unitPrice: number; subtotal: number } => {
      const r = (raw ?? {}) as IncomingLineItem;
      const description = toStr(r.description, 500);
      const qty = Math.max(0, toNumber(r.qty ?? r.quantity));
      const unitPrice = Math.max(0, toNumber(r.unitPrice));
      return { description, qty, unitPrice, subtotal: Math.round(qty * unitPrice * 100) / 100 };
    })
    .filter((i) => i.description && i.qty > 0);
}
function computeTotals(items: Array<{ subtotal: number }>, tvaRatePercent: number, currency: string) {
  const subtotalHT = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const tvaRate = Math.max(0, Math.min(100, tvaRatePercent));
  const tvaAmount = Math.round(subtotalHT * (tvaRate / 100) * 100) / 100;
  const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
  return { subtotalHT, tvaRate, tvaAmount, totalTTC, currency };
}
function roleToTier(role: string | undefined): 'FREE' | 'PRIME' | 'SUPER' | undefined {
  if (role === 'SUPER_SUPPLIER') return 'SUPER';
  if (role === 'SUPPLIER_PRIME') return 'PRIME';
  if (role === 'SUPPLIER') return 'FREE';
  return undefined;
}
function composeAddress(supplier: any | null) {
  const primary = supplier?.addresses?.[0];
  if (!primary) return { address: '', city: '' };
  return {
    address: String(primary.addressLine || '').trim(),
    city: [primary.city, primary.wilaya, primary.postalCode].filter(Boolean).join(', ').trim(),
  };
}

async function nextQuoteNumberForYear(year: number): Promise<string> {
  const prefix = `DEV-${year}-`;
  const latest = await Quote.findOne({ quoteNumber: { $regex: `^${prefix}` } })
    .sort({ quoteNumber: -1 })
    .select('quoteNumber')
    .lean();
  let next = 1;
  if (latest?.quoteNumber) {
    const parsed = parseInt(latest.quoteNumber.slice(prefix.length), 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

async function createQuoteWithUniqueNumber(base: Record<string, unknown>, year: number, maxAttempts = 5) {
  let attempt = 0;
  let increment = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const nextNumber = await nextQuoteNumberForYear(year);
    const finalNumber = increment
      ? (() => {
          const prefix = `DEV-${year}-`;
          const parsed = parseInt(nextNumber.slice(prefix.length), 10);
          return `${prefix}${String(parsed + increment).padStart(5, '0')}`;
        })()
      : nextNumber;
    try {
      return await Quote.create({ ...base, quoteNumber: finalNumber });
    } catch (err: any) {
      if (err?.code === 11000 && err?.keyPattern?.quoteNumber) {
        increment += 1;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to allocate a unique quote number');
}

// POST — create quote (from-order or from-scratch)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    const isAdmin = session.role === 'ADMIN';
    const isSupplier =
      session.role === 'SUPPLIER' ||
      session.role === 'SUPPLIER_PRIME' ||
      session.role === 'SUPER_SUPPLIER';
    if (!isAdmin && !isSupplier) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId : null;

    // ── From an existing order ─────────────────────────────────
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
      }
      const order = await Order.findById(orderId).lean();
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      if (!isAdmin && order.supplierId?.toString() !== session.supplierId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Duplicate protection: one draft quote per order at a time
      const existing = await Quote.findOne({ orderId: order._id, status: { $ne: 'CONVERTED' } }).lean();
      if (existing) {
        return NextResponse.json(
          { error: 'A quote already exists for this order', quote: existing },
          { status: 409 }
        );
      }

      const supplier = await Supplier.findById(order.supplierId).lean();
      const supplierUser = supplier?.userId
        ? await User.findById(supplier.userId).select('email role').lean()
        : null;
      const buyer = await User.findById(order.buyerId).lean();
      const supplierAddr = composeAddress(supplier);

      const lineItems = (order.items || []).map((item: any) => {
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);
        return {
          description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`,
          qty,
          unitPrice,
          subtotal: Math.round(qty * unitPrice * 100) / 100,
        };
      });
      const totals = computeTotals(lineItems, 19, 'TND');

      const quote = await createQuoteWithUniqueNumber(
        {
          orderId: order._id,
          supplierId: order.supplierId,
          buyerId: order.buyerId,
          status: 'DRAFT',
          issuedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          supplierInfo: {
            name: supplier?.companyName || '',
            address: supplierAddr.address,
            city: supplierAddr.city,
            logo: supplier?.logo || '',
            phone: supplier?.socialLinks?.phone || '',
            email: supplierUser?.email || '',
            website: supplier?.socialLinks?.website || '',
            tier: roleToTier(supplierUser?.role) || 'FREE',
            isVerified: !!supplier?.isVerified,
          },
          buyerInfo: {
            name:
              `${buyer?.profile?.firstName || ''} ${buyer?.profile?.lastName || ''}`.trim() ||
              'Unknown',
            city: buyer?.profile?.city || '',
            email: buyer?.email || '',
          },
          lineItems,
          totals,
        },
        new Date().getFullYear()
      );

      return NextResponse.json({ quote }, { status: 201 });
    }

    // ── From scratch ───────────────────────────────────────────
    let supplierId: string | undefined;
    if (isSupplier) {
      if (!session.supplierId) {
        return NextResponse.json({ error: 'Supplier profile required' }, { status: 403 });
      }
      supplierId = session.supplierId;
    } else if (isAdmin) {
      const bodySupplier = typeof body?.supplierId === 'string' ? body.supplierId : null;
      if (!bodySupplier || !mongoose.isValidObjectId(bodySupplier)) {
        return NextResponse.json({ error: 'supplierId is required for admin-created quotes' }, { status: 400 });
      }
      supplierId = bodySupplier;
    }

    const lineItems = normalizeLineItems(body?.lineItems);
    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }
    const buyerInfo = normalizeInfo(body?.buyerInfo);
    if (!buyerInfo.name) {
      return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 });
    }

    const supplier = await Supplier.findById(supplierId).lean();
    const supplierUser = supplier?.userId
      ? await User.findById(supplier.userId).select('email role').lean()
      : null;
    const supplierAddr = composeAddress(supplier);
    const supplierInfoInput = normalizeInfo(body?.supplierInfo);
    const supplierInfo = {
      name: supplierInfoInput.name || supplier?.companyName || '',
      address: supplierInfoInput.address || supplierAddr.address,
      city: supplierInfoInput.city || supplierAddr.city,
      taxId: supplierInfoInput.taxId,
      phone: supplierInfoInput.phone || supplier?.socialLinks?.phone || '',
      email: supplierInfoInput.email || supplierUser?.email || '',
      logo: supplierInfoInput.logo || supplier?.logo || '',
      website: supplierInfoInput.website || supplier?.socialLinks?.website || '',
      tier: roleToTier(supplierUser?.role) || 'FREE',
      isVerified: !!supplier?.isVerified,
    };

    const tvaRatePercent = toNumber(body?.tvaRate, 19);
    const currency = toStr(body?.currency, 8) || 'TND';
    const totals = computeTotals(lineItems, tvaRatePercent, currency);

    const requestedStatus = toStr(body?.status, 20).toUpperCase() as QuoteStatus;
    const status: QuoteStatus = ALLOWED_STATUSES.includes(requestedStatus) ? requestedStatus : 'DRAFT';

    const issuedAt = body?.issuedAt ? new Date(body.issuedAt) : new Date();
    const validUntil = body?.validUntil
      ? new Date(body.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }

    let buyerId: mongoose.Types.ObjectId | undefined;
    if (buyerInfo.email) {
      const linked = await User.findOne({ email: buyerInfo.email.toLowerCase() }).select('_id').lean();
      if (linked?._id) buyerId = linked._id;
    }

    const quote = await createQuoteWithUniqueNumber(
      {
        supplierId,
        buyerId,
        status,
        issuedAt,
        validUntil,
        supplierInfo,
        buyerInfo,
        lineItems,
        totals,
        notes: toStr(body?.notes, 2000),
      },
      issuedAt.getFullYear()
    );

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Quote creation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — list quotes for the authenticated user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const parsedLimit = parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;

    const query: Record<string, unknown> = {};
    if (
      session.role === 'SUPPLIER' ||
      session.role === 'SUPPLIER_PRIME' ||
      session.role === 'SUPER_SUPPLIER'
    ) {
      if (!session.supplierId) return NextResponse.json({ quotes: [], hasMore: false });
      query.supplierId = new mongoose.Types.ObjectId(session.supplierId);
    } else if (session.role === 'BUYER') {
      query.buyerId = new mongoose.Types.ObjectId(session.userId);
    }

    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const quotes = await Quote.find(query).sort({ _id: -1 }).limit(limit + 1).lean();
    const hasMore = quotes.length > limit;
    const data = hasMore ? quotes.slice(0, limit) : quotes;
    const nextCursor = hasMore ? data[data.length - 1]?._id?.toString() : undefined;

    return NextResponse.json({ quotes: data, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Quote list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
