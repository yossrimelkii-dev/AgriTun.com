export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB, User } from '@agrimed/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const center = await User.findOne({ _id: params.id, role: 'TRAINING_CENTER' })
      .select('profile email role badge createdAt')
      .lean();

    if (!center) {
      return NextResponse.json({ error: 'Training center not found' }, { status: 404 });
    }

    return NextResponse.json({
      trainingCenter: {
        id: String(center._id),
        email: center.email,
        badge: center.badge,
        profile: center.profile ?? {},
      },
    });
  } catch (error) {
    console.error('Training center detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}