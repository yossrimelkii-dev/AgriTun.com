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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const specialist = (await User.findOne({ _id: params.id, role: 'AGRI_ENGINEER' })
      .select('profile email role badge createdAt')
      .lean()) as unknown as SpecialistRecord | null;

    if (!specialist) {
      return NextResponse.json({ error: 'Specialist not found' }, { status: 404 });
    }

    const engineerId = new mongoose.Types.ObjectId(String(specialist._id));

    const [statsRow] = await AgriHelpRequest.aggregate([
      {
        $match: { engineerId },
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

    const recentWorks = await AgriHelpRequest.find({
      engineerId,
      status: { $in: ['RESOLVED', 'CLOSED'] },
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('title speciality engineerRecommendation feedback status updatedAt createdAt')
      .lean();

    const profile = (specialist.profile ?? {}) as SpecialistProfileFields;

    return NextResponse.json({
      specialist: {
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
        profile,
        badge: specialist.badge,
        stats: {
          totalHandled: statsRow?.totalHandled ?? 0,
          resolvedCount: statsRow?.resolvedCount ?? 0,
          totalFeedbacks: statsRow?.totalFeedbacks ?? 0,
          averageRating: Number(((statsRow?.averageRating ?? 0) as number).toFixed(2)),
        },
      },
      recentWorks: recentWorks.map((work) => ({
        id: String(work._id),
        title: work.title,
        speciality: work.speciality,
        engineerRecommendation: work.engineerRecommendation ?? '',
        status: work.status,
        rating: work.feedback?.stars ?? null,
        updatedAt: work.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Specialist detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
