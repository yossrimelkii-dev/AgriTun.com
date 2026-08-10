export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Invoice } from '@agrimed/db/models';
import { getSession, requireAuth } from '@/lib/auth/session';

const ALLOWED_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const;
type InvoiceStatus = typeof ALLOWED_STATUSES[number];

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
    taxId: toStr(src.taxId, 60),
    phone: toStr(src.phone, 60),
    email: toStr(src.email, 200),
    logo: toStr(src.logo, 2000),
  };
}

function normalizeLineItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw: any) => {
      const description = toStr(raw?.description, 500);
      const qty = Math.max(0, toNumber(raw?.qty ?? raw?.quantity));
      const unitPrice = Math.max(0, toNumber(raw?.unitPrice));
      const subtotal = Math.round(qty * unitPrice * 100) / 100;
      return { description, qty, unitPrice, subtotal };
    })
    .filter((i) => i.description && i.qty > 0);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await getSession();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoice = await Invoice.findById(params.id).lean();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (session) {
      const isSupplier =
        session.role === 'SUPPLIER' ||
        session.role === 'SUPPLIER_PRIME' ||
        session.role === 'SUPER_SUPPLIER';

      if (isSupplier && invoice.supplierId?.toString() !== session.supplierId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.role === 'BUYER' && invoice.buyerId?.toString() !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await requireAuth();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isAdmin = session.role === 'ADMIN';
    const isSupplier =
      session.role === 'SUPPLIER' ||
      session.role === 'SUPPLIER_PRIME' ||
      session.role === 'SUPER_SUPPLIER';

    if (!isAdmin && !isSupplier) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isSupplier && invoice.supplierId?.toString() !== session.supplierId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    // Status
    if (body.status !== undefined) {
      const s = String(body.status).toUpperCase() as InvoiceStatus;
      if (!ALLOWED_STATUSES.includes(s)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = s;
      if (s === 'PAID' && !invoice.paidAt) updates.paidAt = new Date();
    }

    // Buyer info
    if (body.buyerInfo !== undefined) {
      updates.buyerInfo = normalizeInfo(body.buyerInfo);
      if (!updates.buyerInfo.name) {
        return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 });
      }
    }

    // Supplier info (incl. logo)
    if (body.supplierInfo !== undefined) {
      updates.supplierInfo = normalizeInfo(body.supplierInfo);
    }

    // Notes
    if (body.notes !== undefined) {
      updates.notes = toStr(body.notes, 2000);
    }

    // Due date
    if (body.dueAt !== undefined) {
      const d = new Date(body.dueAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid dueAt' }, { status: 400 });
      }
      updates.dueAt = d;
    }

    // Line items — only allowed while the invoice is currently DRAFT (to preserve
    // accounting integrity). Compare against the DB state, not the incoming status,
    // so DRAFT → SENT transitions in the same request are still allowed to save
    // the current line items alongside the status change.
    if (body.lineItems !== undefined) {
      if (invoice.status !== 'DRAFT') {
        return NextResponse.json(
          { error: 'Line items can only be modified while the invoice is DRAFT' },
          { status: 400 }
        );
      }
      const lineItems = normalizeLineItems(body.lineItems);
      if (lineItems.length === 0) {
        return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
      }
      updates.lineItems = lineItems;

      const tvaRatePercent =
        body.tvaRate !== undefined ? toNumber(body.tvaRate, invoice.totals?.tvaRate ?? 19) : (invoice.totals?.tvaRate ?? 19);
      const currency = toStr(body.currency, 8) || invoice.totals?.currency || 'TND';
      const subtotalHT = Math.round(lineItems.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
      const clampedRate = Math.max(0, Math.min(100, tvaRatePercent));
      const tvaAmount = Math.round(subtotalHT * (clampedRate / 100) * 100) / 100;
      const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
      updates.totals = { subtotalHT, tvaRate: clampedRate, tvaAmount, totalTTC, currency };
    } else if (body.tvaRate !== undefined && invoice.status === 'DRAFT') {
      // Recompute totals if tvaRate changes without full line-items update
      const rate = Math.max(0, Math.min(100, toNumber(body.tvaRate, invoice.totals?.tvaRate ?? 19)));
      const subtotalHT = invoice.totals?.subtotalHT ?? 0;
      const tvaAmount = Math.round(subtotalHT * (rate / 100) * 100) / 100;
      const totalTTC = Math.round((subtotalHT + tvaAmount) * 100) / 100;
      updates.totals = {
        subtotalHT,
        tvaRate: rate,
        tvaAmount,
        totalTTC,
        currency: invoice.totals?.currency || 'TND',
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updated = await Invoice.findByIdAndUpdate(invoice._id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Invoice update error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message, name: (error as any)?.name },
      { status: 500 }
    );
  }
}
