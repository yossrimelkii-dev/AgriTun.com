export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { HeroPromotionRequest } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';
import { serializeKeyValueLines } from '@/lib/key-value-lines';

export async function GET() {
  try {
    await connectDB();
    const session = await requireSupplier();

    const requests = await HeroPromotionRequest.find({ supplierId: session.supplierId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireSupplier();
    const body = await req.json();

    const title = String(body?.title ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const imageUrl = String(body?.imageUrl ?? '').trim();
    const linkUrl = String(body?.linkUrl ?? '').trim();
    const ctaLabel = String(body?.ctaLabel ?? 'Voir plus').trim();
    const kind = body?.kind === 'EVENT' ? 'EVENT' : 'PRODUCT';
    const composition = serializeKeyValueLines(body?.composition);
    const dosage = serializeKeyValueLines(body?.dosage);
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;

    if (!title || !linkUrl) {
      return NextResponse.json({ error: 'Titre et lien sont requis' }, { status: 400 });
    }

    if (kind === 'PRODUCT' && (!composition || !dosage)) {
      return NextResponse.json({ error: 'Composition et dosage sont requis pour une promotion produit' }, { status: 400 });
    }

    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }

    const requestDoc = await HeroPromotionRequest.create({
      supplierId: session.supplierId,
      title: title.slice(0, 220),
      description: description ? description.slice(0, 2000) : undefined,
      imageUrl: imageUrl ? imageUrl.slice(0, 3000) : undefined,
      linkUrl: linkUrl.slice(0, 3000),
      ctaLabel: ctaLabel ? ctaLabel.slice(0, 120) : 'Voir plus',
      kind,
      composition: composition.slice(0, 2000),
      dosage: dosage.slice(0, 1000),
      startDate,
      endDate,
      status: 'PENDING',
    });

    return NextResponse.json({ request: requestDoc }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
