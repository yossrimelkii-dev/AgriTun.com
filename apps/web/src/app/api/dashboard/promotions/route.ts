export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Promotion } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import { serializeKeyValueLines } from '@/lib/key-value-lines';

// GET — list supplier's promotions
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();

    const promotions = await Promotion.find({ supplierId: session.supplierId })
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const active = promotions.filter((p) => p.isActive && p.startDate <= now && p.endDate >= now);
    const upcoming = promotions.filter((p) => p.isActive && p.startDate > now);
    const expired = promotions.filter((p) => !p.isActive || p.endDate < now);

    return NextResponse.json({
      promotions,
      counts: { active: active.length, upcoming: upcoming.length, expired: expired.length },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — create a new promotion
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();
    const body = await req.json();

    const { title, description, composition, dosage, discountType, discountValue, scope, startDate, endDate } = body;
    const normalizedComposition = serializeKeyValueLines(composition);
    const normalizedDosage = serializeKeyValueLines(dosage);

    if (!title || !normalizedComposition || !normalizedDosage || !discountType || !discountValue || !scope?.type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    if (!['PERCENT', 'FIXED'].includes(discountType)) {
      return NextResponse.json({ error: 'Type de réduction invalide' }, { status: 400 });
    }

    if (discountType === 'PERCENT' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json({ error: 'Pourcentage entre 0 et 100' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }

    const promotion = await Promotion.create({
      supplierId: session.supplierId,
      title: title.trim().slice(0, 200),
      description: description?.trim().slice(0, 1000) || undefined,
      composition: normalizedComposition.slice(0, 2000),
      dosage: normalizedDosage.slice(0, 1000),
      discountType,
      discountValue,
      scope: {
        type: scope.type,
        productIds: scope.productIds || [],
        categoryIds: scope.categoryIds || [],
      },
      startDate: start,
      endDate: end,
      isActive: true,
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
