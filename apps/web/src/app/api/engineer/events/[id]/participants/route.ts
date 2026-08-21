export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN');

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const event = await Event.findOne({ _id: params.id, supplierId: session.userId })
      .select('_id title')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    const participations = await EventParticipation.find({ eventId: event._id })
      .sort({ createdAt: -1 })
      .lean();

    const userIds = participations.map((p) => p.userId).filter(Boolean);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('_id role email profile.firstName profile.lastName')
          .lean()
      : [];

    const usersById = new Map(users.map((u) => [String(u._id), u]));

    const participants = participations.map((participation) => {
      const user = usersById.get(String(participation.userId));
      const fullName = [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ').trim();

      return {
        _id: String(participation._id),
        userId: String(participation.userId),
        name: fullName || user?.email || 'Participant',
        email: user?.email || '',
        role: user?.role || 'BUYER',
        answers: participation.answers || [],
        createdAt: participation.createdAt,
      };
    });

    return NextResponse.json({ event, participants });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
