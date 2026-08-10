export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Formation, FormationParticipation, User } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const formation = await Formation.findOne({ _id: params.id, isActive: true }).lean();
    if (!formation) {
      return NextResponse.json({ error: 'Formation not found' }, { status: 404 });
    }

    const specialist = await User.findById(formation.specialistId)
      .select('profile.firstName profile.lastName profile.speciality profile.avatarUrl email')
      .lean();

    const session = await getSession();
    let alreadyJoined = false;
    let participationStatus: string | null = null;

    if (session?.userId) {
      const participation = await FormationParticipation.findOne({
        formationId: formation._id,
        userId: session.userId,
      })
        .select('_id status')
        .lean();
      alreadyJoined = Boolean(participation);
      participationStatus = participation?.status || null;
    }

    return NextResponse.json({
      formation,
      specialist: specialist
        ? {
            id: String(specialist._id),
            firstName: specialist.profile?.firstName || '',
            lastName: specialist.profile?.lastName || '',
            speciality: specialist.profile?.speciality || '',
            avatarUrl: specialist.profile?.avatarUrl || '',
            email: specialist.email,
          }
        : null,
      alreadyJoined,
      participationStatus,
    });
  } catch (error) {
    console.error('Formation detail fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
