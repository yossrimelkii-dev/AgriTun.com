export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Promotion } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import { serializeKeyValueLines } from '@/lib/key-value-lines';

// PATCH — update promotion
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await requireSupplier();
    const body = await req.json();

    const promotion = await Promotion.findOne({
      _id: params.id,
      supplierId: session.supplierId,
    });

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion introuvable' }, { status: 404 });
    }

    const allowed = ['title', 'description', 'composition', 'dosage', 'discountType', 'discountValue', 'scope', 'startDate', 'endDate', 'isActive'] as const;
    const update: Record<string, any> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'title') {
          update.title = String(body.title).trim().slice(0, 200);
        } else if (key === 'description') {
          update.description = String(body.description).trim().slice(0, 1000);
        } else if (key === 'composition') {
          const value = serializeKeyValueLines(body.composition);
          if (!value) {
            return NextResponse.json({ error: 'Composition requise' }, { status: 400 });
          }
          update.composition = value.slice(0, 2000);
        } else if (key === 'dosage') {
          const value = serializeKeyValueLines(body.dosage);
          if (!value) {
            return NextResponse.json({ error: 'Dosage requis' }, { status: 400 });
          }
          update.dosage = value.slice(0, 1000);
        } else if (key === 'startDate' || key === 'endDate') {
          const d = new Date(body[key]);
          if (!isNaN(d.getTime())) update[key] = d;
        } else if (key === 'discountType') {
          if (['PERCENT', 'FIXED'].includes(body.discountType)) {
            update.discountType = body.discountType;
          }
        } else if (key === 'discountValue') {
          const v = Number(body.discountValue);
          if (!isNaN(v) && v >= 0) update.discountValue = v;
        } else if (key === 'isActive') {
          update.isActive = Boolean(body.isActive);
        } else if (key === 'scope') {
          if (body.scope?.type && ['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'CATEGORY'].includes(body.scope.type)) {
            update.scope = {
              type: body.scope.type,
              productIds: body.scope.productIds || [],
              categoryIds: body.scope.categoryIds || [],
            };
          }
        }
      }
    }

    const updated = await Promotion.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();

    return NextResponse.json({ promotion: updated });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE — remove promotion
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const result = await Promotion.deleteOne({
      _id: params.id,
      supplierId: session.supplierId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Promotion introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
