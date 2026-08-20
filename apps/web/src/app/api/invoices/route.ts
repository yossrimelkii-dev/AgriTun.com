export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Invoice, Order, Quote, Supplier, User } from '@agrimed/db/models';
import { requireAuth } from '@/lib/auth/session';
import mongoose from 'mongoose';

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

function roleToTier(role: string | undefined): 'FREE' | 'PRIME' | 'SUPER' | undefined {
  if (role === 'SUPER_SUPPLIER') return 'SUPER';
  if (role === 'SUPPLIER_PRIME') return 'PRIME';
  if (role === 'SUPPLIER') return 'FREE';
  return undefined;
}

function composeAddress(supplier: any | null): { address: string; city: string } {
  const primary = supplier?.addresses?.[0];
  if (!primary) return { address: '', city: '' };
  const address = String(primary.addressLine || '').trim();
  const city = [primary.city, primary.wilaya, primary.postalCode]
    .filter(Boolean)
    .join(', ')
    .trim();
  return { address, city };
}

const ALLOWED_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
type InvoiceStatus = typeof ALLOWED_STATUSES[number];

const ALLOWED_PAYMENT_METHODS = ['CASH', 'CHECK', 'TRANSFER'] as const;
type PaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

function normalizePaymentMethod(v: unknown): PaymentMethod | undefined {
  if (typeof v !== 'string') return undefined;
  const up = v.trim().toUpperCase() as PaymentMethod;
  return ALLOWED_PAYMENT_METHODS.includes(up) ? up : undefined;
}

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
      const subtotal = Math.round(qty * unitPrice * 100) / 100;
      return { description, qty, unitPrice, subtotal };
    })
    .filter((i) => i.description && i.qty > 0);
}

function computeTotals(
  items: Array<{ subtotal: number }>,
  tvaRatePercent: number,
  currency: string
) {
  const subtotalHT = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const tvaRate = Math.max(0, Math.min(100, tvaRatePercent));
  const tvaAmount = Math.round(subtotalHT * (tvaRate / 100) * 100) / 100;
  const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
  return { subtotalHT, tvaRate, tvaAmount, totalTTC, currency };
}

async function nextInvoiceNumberForYear(year: number): Promise<string> {
  // invoiceNumber is globally unique — derive next from the max existing for the year.
  const prefix = `FAC-${year}-`;
  const latest = await Invoice.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean();

  let next = 1;
  if (latest?.invoiceNumber) {
    const tail = latest.invoiceNumber.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

// Create an invoice with retry on invoiceNumber duplicate-key collisions
// (guards against concurrent creation races).
async function createInvoiceWithUniqueNumber(
  base: Record<string, unknown>,
  year: number,
  maxAttempts = 5
) {
  let attempt = 0;
  let increment = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const nextNumber = await nextInvoiceNumberForYear(year);
    // If we've retried, bump by our local increment to escape the losing race.
    const finalNumber = increment
      ? (() => {
          const prefix = `FAC-${year}-`;
          const parsed = parseInt(nextNumber.slice(prefix.length), 10);
          return `${prefix}${String(parsed + increment).padStart(5, '0')}`;
        })()
      : nextNumber;

    try {
      return await Invoice.create({ ...base, invoiceNumber: finalNumber });
    } catch (err: any) {
      if (err?.code === 11000 && err?.keyPattern?.invoiceNumber) {
        increment += 1;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to allocate a unique invoice number');
}

// POST — generate invoice from an order OR create one from scratch
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireAuth();

    // Only suppliers (any tier) or admins can create invoices
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
    const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : null;

    // ── Path C: generate from an existing quote (devis) ────────
    if (quoteId) {
      if (!mongoose.isValidObjectId(quoteId)) {
        return NextResponse.json({ error: 'Invalid quoteId' }, { status: 400 });
      }
      const quote = await Quote.findById(quoteId).lean();
      if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      if (!isAdmin && quote.supplierId?.toString() !== session.supplierId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (quote.convertedInvoiceId) {
        const existing = await Invoice.findById(quote.convertedInvoiceId).lean();
        return NextResponse.json(
          { error: 'Invoice already exists for this quote', invoice: existing },
          { status: 409 }
        );
      }

      const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
      const requestedStatus = toStr(body?.status, 20).toUpperCase() as InvoiceStatus;
      const status: InvoiceStatus = ALLOWED_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : 'SENT';

      const now = new Date();
      const invoice = await createInvoiceWithUniqueNumber(
        {
          quoteId: quote._id,
          orderId: quote.orderId,
          supplierId: quote.supplierId,
          buyerId: quote.buyerId,
          status,
          paymentMethod,
          issuedAt: now,
          dueAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          supplierInfo: quote.supplierInfo,
          buyerInfo: quote.buyerInfo,
          lineItems: quote.lineItems,
          totals: quote.totals,
          notes: quote.notes,
        },
        now.getFullYear()
      );

      // Link the quote → invoice and mark it converted.
      await Quote.findByIdAndUpdate(quote._id, {
        convertedInvoiceId: invoice._id,
        status: 'CONVERTED',
      });

      return NextResponse.json({ invoice }, { status: 201 });
    }

    // ── Path A: generate from an existing order ────────────────
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
      }

      const order = await Order.findById(orderId).lean();
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (!isAdmin && order.supplierId?.toString() !== session.supplierId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const existing = await Invoice.findOne({ orderId: order._id }).lean();
      if (existing) {
        return NextResponse.json(
          { error: 'Invoice already exists for this order', invoice: existing },
          { status: 409 }
        );
      }

      const supplier = await Supplier.findById(order.supplierId).lean();
      const supplierUser = supplier?.userId
        ? await User.findById(supplier.userId).select('email role').lean()
        : null;
      const buyer = await User.findById(order.buyerId).lean();

      const lineItems = (order.items || []).map((item: any) => {
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);
        const subtotal = Number(item.subtotal ?? qty * unitPrice);
        return {
          description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`,
          qty,
          unitPrice,
          subtotal,
        };
      });

      const totals = computeTotals(lineItems, 19, 'TND');
      const supplierAddr = composeAddress(supplier);

      const invoice = await createInvoiceWithUniqueNumber(
        {
          orderId: order._id,
          supplierId: order.supplierId,
          buyerId: order.buyerId,
          status: 'SENT',
          issuedAt: new Date(),
          dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          supplierInfo: {
            name: supplier?.companyName || 'Unknown',
            address: supplierAddr.address,
            city: supplierAddr.city,
            taxId: supplier?.taxId || '',
            logo: supplier?.logo || '',
            phone: supplier?.socialLinks?.phone || '',
            email: supplierUser?.email || '',
            website: supplier?.socialLinks?.website || '',
            tier: roleToTier(supplierUser?.role) || 'FREE',
            isVerified: !!supplier?.isVerified,
          },
          buyerInfo: {
            name: `${buyer?.profile?.firstName || ''} ${buyer?.profile?.lastName || ''}`.trim() || 'Unknown',
            city: buyer?.profile?.city || '',
            email: buyer?.email || '',
          },
          lineItems,
          totals,
        },
        new Date().getFullYear()
      );

      await Order.findByIdAndUpdate(order._id, { invoiceId: invoice._id });

      return NextResponse.json({ invoice }, { status: 201 });
    }

    // ── Path B: create manually (no order) ─────────────────────
    // Resolve target supplierId
    let supplierId: string | undefined;
    if (isSupplier) {
      if (!session.supplierId) {
        return NextResponse.json({ error: 'Supplier profile required' }, { status: 403 });
      }
      supplierId = session.supplierId;
    } else if (isAdmin) {
      const bodySupplier = typeof body?.supplierId === 'string' ? body.supplierId : null;
      if (!bodySupplier || !mongoose.isValidObjectId(bodySupplier)) {
        return NextResponse.json(
          { error: 'supplierId is required for admin-created invoices' },
          { status: 400 }
        );
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
      taxId: supplierInfoInput.taxId || supplier?.taxId || '',
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

    const requestedStatus = toStr(body?.status, 20).toUpperCase() as InvoiceStatus;
    const status: InvoiceStatus =
      ALLOWED_STATUSES.includes(requestedStatus) ? requestedStatus : 'DRAFT';

    const issuedAt = body?.issuedAt ? new Date(body.issuedAt) : new Date();
    const dueAt = body?.dueAt
      ? new Date(body.dueAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }

    // Optional buyer link by email (best-effort — no error if not found)
    let buyerId: mongoose.Types.ObjectId | undefined;
    if (buyerInfo.email) {
      const linked = await User.findOne({ email: buyerInfo.email.toLowerCase() })
        .select('_id')
        .lean();
      if (linked?._id) buyerId = linked._id;
    }

    const invoice = await createInvoiceWithUniqueNumber(
      {
        supplierId,
        buyerId,
        status,
        paymentMethod: normalizePaymentMethod(body?.paymentMethod),
        issuedAt,
        dueAt,
        supplierInfo,
        buyerInfo,
        lineItems,
        totals,
        notes: toStr(body?.notes, 2000),
      },
      issuedAt.getFullYear()
    );

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Invoice creation error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message, name: (error as any)?.name },
      { status: 500 }
    );
  }
}

// GET — list invoices for the authenticated user
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
      if (!session.supplierId) return NextResponse.json({ invoices: [], hasMore: false });
      query.supplierId = new mongoose.Types.ObjectId(session.supplierId);
    } else if (session.role === 'BUYER') {
      query.buyerId = new mongoose.Types.ObjectId(session.userId);
    }
    // ADMIN sees all

    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const invoices = await Invoice.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = invoices.length > limit;
    const data = hasMore ? invoices.slice(0, limit) : invoices;
    const nextCursor = hasMore ? data[data.length - 1]?._id?.toString() : undefined;

    return NextResponse.json({ invoices: data, nextCursor, hasMore });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Invoice list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
