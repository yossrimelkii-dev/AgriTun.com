export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB, User, AgriHelpRequest } from '@agrimed/db';

type SpecialistProfileFields = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  avatarUrl?: string;
  bio?: string;
  speciality?: string;
  workSummary?: string;
  cvUrl?: string;
  location?: {
    lat?: number;
    lng?: number;
    label?: string;
  };
};

type SpecialistRecord = {
  _id: mongoose.Types.ObjectId | string;
  email: string;
  badge: unknown;
  profile?: SpecialistProfileFields;
};

export async function GET() {
  try {
    await connectDB();

    const specialists = (await User.find({ role: 'AGRI_ENGINEER' })
      .select('profile email role badge createdAt')
      .sort({ createdAt: -1 })
      .lean()) as unknown as SpecialistRecord[];

    if (specialists.length === 0) {
      return NextResponse.json({ specialists: [] });
    }

    const specialistIds = specialists.map((specialist) => new mongoose.Types.ObjectId(specialist._id));

    const statsRows = await AgriHelpRequest.aggregate([
      {
        $match: {
          engineerId: { $in: specialistIds },
        },
      },
      {
        $addFields: {
          ratingValue: {
            $cond: [
              {
                $and: [
                  { $gte: ['$feedback.stars', 1] },
                  { $lte: ['$feedback.stars', 5] },
                ],
              },
              '$feedback.stars',
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$engineerId',
          totalHandled: { $sum: 1 },
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0],
            },
          },
          totalFeedbacks: {
            $sum: {
              $cond: [{ $ne: ['$ratingValue', null] }, 1, 0],
            },
          },
          averageRating: { $avg: '$ratingValue' },
        },
      },
    ]);

    const statsMap = new Map(
      statsRows.map((row) => [String(row._id), row])
    );

    const payload = specialists.map((specialist) => {
      const stats = statsMap.get(String(specialist._id));
      const profile = (specialist.profile ?? {}) as SpecialistProfileFields;
      return {
        id: String(specialist._id),
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: specialist.email,
        speciality: profile.speciality ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        bio: profile.bio ?? '',
        workSummary: profile.workSummary ?? '',
        cvUrl: profile.cvUrl ?? '',
        location: profile.location ?? null,
        badge: specialist.badge,
        stats: {
          totalHandled: stats?.totalHandled ?? 0,
          resolvedCount: stats?.resolvedCount ?? 0,
          totalFeedbacks: stats?.totalFeedbacks ?? 0,
          averageRating: Number(((stats?.averageRating ?? 0) as number).toFixed(2)),
        },
      };
    }).sort((a, b) => {
      if (b.stats.averageRating !== a.stats.averageRating) return b.stats.averageRating - a.stats.averageRating;
      if (b.stats.totalFeedbacks !== a.stats.totalFeedbacks) return b.stats.totalFeedbacks - a.stats.totalFeedbacks;
      if (b.stats.totalHandled !== a.stats.totalHandled) return b.stats.totalHandled - a.stats.totalHandled;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    return NextResponse.json({ specialists: payload });
  } catch (error) {
    console.error('Specialists list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
