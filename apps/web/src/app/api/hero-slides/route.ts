export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { HeroSlide } from '@agrimed/db/models';

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const slides = await HeroSlide.find({
      isActive: true,
      $or: [
        { kind: 'EVENT' },
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } },
      ],
      $and: [{ $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('Hero slides fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}