export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { HeroSlide } from '@agrimed/db/models';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const now = new Date();
    const slide = await HeroSlide.findOne({
      _id: params.id,
      isActive: true,
      $or: [
        { kind: 'EVENT' },
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } },
      ],
      $and: [{ $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }],
    }).lean();

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json({ slide });
  } catch (error) {
    console.error('Hero slide fetch by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}