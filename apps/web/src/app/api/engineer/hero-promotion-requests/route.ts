export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { HeroPromotionRequest, Event, Formation } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

const ALLOWED_ROLES = ['AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN'] as const;

// GET — list hero promotion requests submitted by the current specialist/center.
export async function GET(): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole(...ALLOWED_ROLES);

    const requests = await HeroPromotionRequest.find({ requesterUserId: session.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — submit a hero-promotion request for a formation or event the user owns.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole(...ALLOWED_ROLES);

    const body = await req.json();
    const kind = body?.kind === 'EVENT' ? 'EVENT' : body?.kind === 'FORMATION' ? 'FORMATION' : null;
    if (!kind) {
      return NextResponse.json({ error: 'Type invalide (attendu EVENT ou FORMATION)' }, { status: 400 });
    }

    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId.trim() : '';
    if (!subjectId || !mongoose.isValidObjectId(subjectId)) {
      return NextResponse.json({ error: 'subjectId requis' }, { status: 400 });
    }

    // Ownership check: the requested subject must belong to the requester.
    if (kind === 'FORMATION') {
      const owned = await Formation.findOne({ _id: subjectId, specialistId: session.userId }).select('_id title imageUrl').lean();
      if (!owned && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Formation introuvable ou non autorisée' }, { status: 404 });
      }
    } else {
      // Event owner is stored on supplierId — reused as the owner userId for engineer/training center.
      const owned = await Event.findOne({ _id: subjectId, supplierId: session.userId }).select('_id title imageUrl').lean();
      if (!owned && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Événement introuvable ou non autorisé' }, { status: 404 });
      }
    }

    const title = String(body?.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const linkUrl = String(body?.linkUrl ?? '').trim() ||
      (kind === 'FORMATION' ? `/formations` : `/events/${subjectId}`);

    const description = String(body?.description ?? '').trim();
    const imageUrl = String(body?.imageUrl ?? '').trim();
    const ctaLabel = String(body?.ctaLabel ?? 'Voir plus').trim() || 'Voir plus';
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Date de fin invalide' }, { status: 400 });
    }
    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'La date de fin doit être postérieure au début' }, { status: 400 });
    }

    const requestDoc = await HeroPromotionRequest.create({
      requesterUserId: session.userId,
      requesterRole: session.role,
      subjectRef: new mongoose.Types.ObjectId(subjectId),
      title: title.slice(0, 220),
      description: description ? description.slice(0, 2000) : undefined,
      imageUrl: imageUrl ? imageUrl.slice(0, 3000) : undefined,
      linkUrl: linkUrl.slice(0, 3000),
      ctaLabel: ctaLabel.slice(0, 120),
      kind,
      composition: '',
      dosage: '',
      startDate,
      endDate,
      status: 'PENDING',
    });

    return NextResponse.json({ request: requestDoc }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Hero promotion request (engineer) error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
