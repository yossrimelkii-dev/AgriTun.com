export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { HeroPromotionRequest, HeroSlide } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole('ADMIN');

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const action = String(body?.action ?? '').trim().toLowerCase();
    const adminNote = String(body?.adminNote ?? '').trim();

    const requestDoc = await HeroPromotionRequest.findById(params.id);
    if (!requestDoc) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (requestDoc.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cette demande est déjà traitée' }, { status: 409 });
    }

    if (action === 'approve') {
      const activeCount = await HeroSlide.countDocuments({ isActive: true });
      if (activeCount >= 10) {
        return NextResponse.json({ error: 'Maximum 10 slides actives autorisées' }, { status: 400 });
      }

      const slide = await HeroSlide.create({
        title: requestDoc.title,
        description: requestDoc.description,
        kind: requestDoc.kind || 'PRODUCT',
        imageUrl: requestDoc.imageUrl,
        ctaLabel: requestDoc.ctaLabel || 'Voir plus',
        linkUrl: requestDoc.linkUrl,
        composition: requestDoc.composition,
        dosage: requestDoc.dosage,
        isActive: true,
        sortOrder: 0,
        startDate: requestDoc.startDate,
        endDate: requestDoc.endDate,
      });

      requestDoc.status = 'APPROVED';
      requestDoc.adminNote = adminNote || undefined;
      requestDoc.processedAt = new Date();
      requestDoc.processedBy = new mongoose.Types.ObjectId(session.userId);
      requestDoc.heroSlideId = slide._id;
      await requestDoc.save();

      return NextResponse.json({ request: requestDoc, slide });
    }

    if (action === 'reject') {
      requestDoc.status = 'REJECTED';
      requestDoc.adminNote = adminNote || undefined;
      requestDoc.processedAt = new Date();
      requestDoc.processedBy = new mongoose.Types.ObjectId(session.userId);
      await requestDoc.save();

      return NextResponse.json({ request: requestDoc });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
