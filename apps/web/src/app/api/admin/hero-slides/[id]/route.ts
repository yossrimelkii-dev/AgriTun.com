export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { HeroSlide } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';
import { serializeKeyValueLines } from '@/lib/key-value-lines';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim();
    if (typeof body.description === 'string') update.description = body.description.trim();
    if (typeof body.kind === 'string' && ['PRODUCT', 'EVENT'].includes(body.kind)) update.kind = body.kind;
    if (typeof body.imageUrl === 'string') update.imageUrl = body.imageUrl.trim();
    if (typeof body.ctaLabel === 'string' && body.ctaLabel.trim()) update.ctaLabel = body.ctaLabel.trim();
    if (typeof body.linkUrl === 'string' && body.linkUrl.trim()) update.linkUrl = body.linkUrl.trim();
    if (typeof body.composition !== 'undefined') update.composition = serializeKeyValueLines(body.composition).trim();
    if (typeof body.dosage !== 'undefined') update.dosage = serializeKeyValueLines(body.dosage).trim();
    if (typeof body.sortOrder !== 'undefined') update.sortOrder = Number(body.sortOrder) || 0;
    if (typeof body.isActive !== 'undefined') update.isActive = Boolean(body.isActive);
    if (typeof body.startDate === 'string') update.startDate = body.startDate ? new Date(body.startDate) : null;
    if (typeof body.endDate === 'string') update.endDate = body.endDate ? new Date(body.endDate) : null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (update.isActive === true) {
      const activeCount = await HeroSlide.countDocuments({ isActive: true, _id: { $ne: params.id } });
      if (activeCount >= 10) {
        return NextResponse.json({ error: 'Maximum 10 slides actives autorisées' }, { status: 400 });
      }
    }

    const currentSlide = await HeroSlide.findById(params.id).lean();
    if (!currentSlide) {
      return NextResponse.json({ error: 'Slide introuvable' }, { status: 404 });
    }

    const finalKind = (update.kind as string | undefined) ?? currentSlide.kind;
    const finalComposition =
      typeof update.composition === 'string' ? update.composition : (currentSlide as any).composition;
    const finalDosage =
      typeof update.dosage === 'string' ? update.dosage : (currentSlide as any).dosage;

    if (finalKind === 'PRODUCT' && (!String(finalComposition || '').trim() || !String(finalDosage || '').trim())) {
      return NextResponse.json({ error: 'Composition et dosage sont requis pour une promotion produit' }, { status: 400 });
    }

    const slide = await HeroSlide.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();

    if (!slide) {
      return NextResponse.json({ error: 'Slide introuvable' }, { status: 404 });
    }

    return NextResponse.json({ slide });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin hero slide update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const result = await HeroSlide.deleteOne({ _id: params.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Slide introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin hero slide delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}