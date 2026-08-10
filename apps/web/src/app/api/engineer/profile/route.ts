export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, AgriHelpRequest } from '@agrimed/db';
import { requireAuth } from '@/lib/auth/session';

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

type EngineerRecord = {
  _id: mongoose.Types.ObjectId | string;
  email: string;
  role: string;
  badge?: unknown;
  profile?: SpecialistProfileFields;
};

function isEngineerRole(role: unknown) {
  return role === 'AGRI_ENGINEER' || role === 'ADMIN';
}

async function buildProfilePayload(userId: string) {
  const engineerId = new mongoose.Types.ObjectId(userId);

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

  return {
    stats: {
      totalHandled: statsRow?.totalHandled ?? 0,
      resolvedCount: statsRow?.resolvedCount ?? 0,
      totalFeedbacks: statsRow?.totalFeedbacks ?? 0,
      averageRating: Number(((statsRow?.averageRating ?? 0) as number).toFixed(2)),
    },
    recentWorks: recentWorks.map((work) => ({
      id: String(work._id),
      title: work.title,
      speciality: work.speciality,
      engineerRecommendation: work.engineerRecommendation ?? '',
      status: work.status,
      rating: work.feedback?.stars ?? null,
      updatedAt: work.updatedAt,
      createdAt: work.createdAt,
    })),
  };
}

export async function GET() {
  try {
    const session = await requireAuth();

    if (!isEngineerRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const user = (await User.findById(session.userId).select('profile email role badge').lean()) as unknown as EngineerRecord | null;

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const profileData = await buildProfilePayload(session.userId);
    const profile = (user.profile ?? {}) as SpecialistProfileFields;

    return NextResponse.json({
      profile: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        badge: user.badge,
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        bio: profile.bio ?? '',
        speciality: profile.speciality ?? '',
        workSummary: profile.workSummary ?? '',
        cvUrl: profile.cvUrl ?? '',
        location: profile.location ?? null,
        ...profileData,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!isEngineerRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields = ['firstName', 'lastName', 'phone', 'city', 'country', 'avatarUrl', 'bio', 'speciality', 'workSummary', 'cvUrl'];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (typeof body[key] === 'string') {
        updates[`profile.${key}`] = body[key].trim();
      }
    }

    const locationLat = body?.locationLat;
    const locationLng = body?.locationLng;
    const locationLabel = typeof body?.locationLabel === 'string' ? body.locationLabel.trim() : '';
    if (locationLat !== undefined && locationLng !== undefined) {
      const lat = Number(locationLat);
      const lng = Number(locationLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        updates['profile.location.lat'] = lat;
        updates['profile.location.lng'] = lng;
        if (locationLabel) {
          updates['profile.location.label'] = locationLabel;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 });
    }

    await connectDB();
    const updated = (await User.findByIdAndUpdate(session.userId, { $set: updates }, {
      new: true,
      runValidators: true,
    })
      .select('profile email role badge')
      .lean()) as unknown as EngineerRecord | null;

    if (!updated) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const profileData = await buildProfilePayload(session.userId);
    const profile = (updated.profile ?? {}) as SpecialistProfileFields;

    return NextResponse.json({
      profile: {
        id: String(updated._id),
        email: updated.email,
        role: updated.role,
        badge: updated.badge,
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        bio: profile.bio ?? '',
        speciality: profile.speciality ?? '',
        workSummary: profile.workSummary ?? '',
        cvUrl: profile.cvUrl ?? '',
        location: profile.location ?? null,
        ...profileData,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
