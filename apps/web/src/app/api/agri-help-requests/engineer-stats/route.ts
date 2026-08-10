export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { AgriHelpRequest } from '@agrimed/db';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await requireAuth();
    if ((session.role as string) !== 'AGRI_ENGINEER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const engineerId = new mongoose.Types.ObjectId(session.userId);

    const feedbackRows = await AgriHelpRequest.find({
      engineerId,
      status: 'RESOLVED',
      'feedback.stars': { $exists: true },
    })
      .select('feedback.stars')
      .lean();

    const ratings = feedbackRows
      .map((r: any) => Number(r?.feedback?.stars))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);

    const totalFeedbacks = ratings.length;
    const avgRating = totalFeedbacks > 0 ? ratings.reduce((a, b) => a + b, 0) / totalFeedbacks : 0;

    const totalHandled = await AgriHelpRequest.countDocuments({ engineerId });
    const resolvedCount = await AgriHelpRequest.countDocuments({ engineerId, status: 'RESOLVED' });

    return NextResponse.json({
      stats: {
        totalHandled,
        resolvedCount,
        totalFeedbacks,
        averageRating: Number(avgRating.toFixed(2)),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
