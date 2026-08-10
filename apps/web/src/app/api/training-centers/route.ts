export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB, User, Formation } from '@agrimed/db';

type CenterProfileFields = {
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

type CenterRecord = {
  _id: mongoose.Types.ObjectId | string;
  email: string;
  badge: unknown;
  profile?: CenterProfileFields;
};

export async function GET() {
  try {
    await connectDB();

    const centers = (await User.find({ role: 'TRAINING_CENTER' })
      .select('profile email role badge createdAt')
      .sort({ createdAt: -1 })
      .lean()) as unknown as CenterRecord[];

    if (centers.length === 0) {
      return NextResponse.json({ trainingCenters: [] });
    }

    const centerIds = centers.map((center) => new mongoose.Types.ObjectId(center._id));

    const formationStats = await Formation.aggregate([
      {
        $match: {
          specialistId: { $in: centerIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$specialistId',
          totalFormations: { $sum: 1 },
          totalParticipants: { $sum: '$stats.participants' },
          upcomingFormations: {
            $sum: {
              $cond: [{ $gte: ['$formationDate', new Date()] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = new Map(formationStats.map((row) => [String(row._id), row]));

    const payload = centers
      .map((center) => {
        const stats = statsMap.get(String(center._id));
        const profile = (center.profile ?? {}) as CenterProfileFields;

        return {
          id: String(center._id),
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: center.email,
          speciality: profile.speciality ?? 'Centre de formation',
          avatarUrl: profile.avatarUrl ?? '',
          bio: profile.bio ?? '',
          workSummary: profile.workSummary ?? '',
          cvUrl: profile.cvUrl ?? '',
          location: profile.location ?? null,
          badge: center.badge,
          stats: {
            totalFormations: stats?.totalFormations ?? 0,
            totalParticipants: stats?.totalParticipants ?? 0,
            upcomingFormations: stats?.upcomingFormations ?? 0,
          },
        };
      })
      .sort((a, b) => {
        if (b.stats.totalFormations !== a.stats.totalFormations) return b.stats.totalFormations - a.stats.totalFormations;
        if (b.stats.totalParticipants !== a.stats.totalParticipants) return b.stats.totalParticipants - a.stats.totalParticipants;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

    return NextResponse.json({ trainingCenters: payload });
  } catch (error) {
    console.error('Training centers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}