export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { HeroSlide } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';
import { serializeKeyValueLines } from '@/lib/key-value-lines';

export async function GET() {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const slides = await HeroSlide.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    const activeCount = slides.filter((slide) => slide.isActive).length;

    return NextResponse.json({ slides, counts: { active: activeCount, total: slides.length } });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin hero slides error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await requireRole('ADMIN');

    const body = await req.json();
    const title = String(body.title || '').trim();
    const linkUrl = String(body.linkUrl || '').trim();
    const ctaLabel = String(body.ctaLabel || 'Voir plus').trim();
    const kind = body.kind === 'EVENT' ? 'EVENT' : 'PRODUCT';
    const imageUrl = String(body.imageUrl || '').trim();
    const description = String(body.description || '').trim();
    const composition = serializeKeyValueLines(body.composition);
    const dosage = serializeKeyValueLines(body.dosage);
    const sortOrder = Number(body.sortOrder ?? 0);
    const isActive = Boolean(body.isActive);

    if (!title || !linkUrl) {
      return NextResponse.json({ error: 'title and linkUrl are required' }, { status: 400 });
    }

    if (kind === 'PRODUCT' && (!composition || !dosage)) {
      return NextResponse.json({ error: 'Composition et dosage sont requis pour une promotion produit' }, { status: 400 });
    }

    if (isActive) {
      const activeCount = await HeroSlide.countDocuments({ isActive: true });
      if (activeCount >= 10) {
        return NextResponse.json({ error: 'Maximum 10 slides actives autorisées' }, { status: 400 });
      }
    }

    const slide = await HeroSlide.create({
      title,
      description: description || undefined,
      kind,
      imageUrl: imageUrl || undefined,
      ctaLabel: ctaLabel || 'Voir plus',
      linkUrl,
      composition: composition || undefined,
      dosage: dosage || undefined,
      isActive,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    return NextResponse.json({ slide }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin hero slide create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}