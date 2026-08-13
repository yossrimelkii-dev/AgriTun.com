export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Quote } from '@agrimed/db/models';
import { getSession, requireAuth } from '@/lib/auth/session';

const ALLOWED_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;
type QuoteStatus = typeof ALLOWED_STATUSES[number];

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}
function toStr(v: unknown, max = 500): string {
  if (v == null) return '';
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}
function normalizeInfo(input: any) {
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
    .map((raw: any) => {
      const description = toStr(raw?.description, 500);
      const qty = Math.max(0, toNumber(raw?.qty ?? raw?.quantity));
      const unitPrice = Math.max(0, toNumber(raw?.unitPrice));
      return { description, qty, unitPrice, subtotal: Math.round(qty * unitPrice * 100) / 100 };
    })
    .filter((i) => i.description && i.qty > 0);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await getSession();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }
    const quote = await Quote.findById(params.id).lean();
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    if (session) {
      const isSupplier =
        session.role === 'SUPPLIER' ||
        session.role === 'SUPPLIER_PRIME' ||
        session.role === 'SUPER_SUPPLIER';
      if (isSupplier && quote.supplierId?.toString() !== session.supplierId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.role === 'BUYER' && quote.buyerId?.toString() !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error('Quote fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await requireAuth();
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }
    const quote = await Quote.findById(params.id);
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    const isAdmin = session.role === 'ADMIN';
    const isSupplier =
      session.role === 'SUPPLIER' ||
      session.role === 'SUPPLIER_PRIME' ||
      session.role === 'SUPER_SUPPLIER';
    if (!isAdmin && !isSupplier) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isSupplier && quote.supplierId?.toString() !== session.supplierId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (quote.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'This quote has been converted to an invoice and can no longer be edited' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase() as QuoteStatus;
      if (!ALLOWED_STATUSES.includes(s)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = s;
    }

    if (body.buyerInfo !== undefined) {
      updates.buyerInfo = normalizeInfo(body.buyerInfo);
      if (!updates.buyerInfo.name) {
        return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 });
      }
    }
    if (body.supplierInfo !== undefined) {
      updates.supplierInfo = normalizeInfo(body.supplierInfo);
    }
    if (body.notes !== undefined) {
      updates.notes = toStr(body.notes, 2000);
    }
    if (body.validUntil !== undefined) {
      const d = new Date(body.validUntil);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid validUntil' }, { status: 400 });
      }
      updates.validUntil = d;
    }

    // Line items — only editable while DRAFT (accounting integrity).
    if (body.lineItems !== undefined) {
      if (quote.status !== 'DRAFT') {
        return NextResponse.json(
          { error: 'Line items can only be modified while the quote is DRAFT' },
          { status: 400 }
        );
      }
      const lineItems = normalizeLineItems(body.lineItems);
      if (lineItems.length === 0) {
        return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
      }
      updates.lineItems = lineItems;
      const tvaRatePercent =
        body.tvaRate !== undefined ? toNumber(body.tvaRate, quote.totals?.tvaRate ?? 19) : (quote.totals?.tvaRate ?? 19);
      const currency = toStr(body.currency, 8) || quote.totals?.currency || 'TND';
      const subtotalHT = Math.round(lineItems.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
      const clampedRate = Math.max(0, Math.min(100, tvaRatePercent));
      const tvaAmount = Math.round(subtotalHT * (clampedRate / 100) * 100) / 100;
      const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
      updates.totals = { subtotalHT, tvaRate: clampedRate, tvaAmount, totalTTC, currency };
    } else if (body.tvaRate !== undefined && quote.status === 'DRAFT') {
      const rate = Math.max(0, Math.min(100, toNumber(body.tvaRate, quote.totals?.tvaRate ?? 19)));
      const subtotalHT = quote.totals?.subtotalHT ?? 0;
      const tvaAmount = Math.round(subtotalHT * (rate / 100) * 100) / 100;
      const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
      updates.totals = {
        subtotalHT,
        tvaRate: rate,
        tvaAmount,
        totalTTC,
        currency: quote.totals?.currency || 'TND',
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updated = await Quote.findByIdAndUpdate(quote._id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    return NextResponse.json({ quote: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Quote update error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
