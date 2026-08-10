export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Formation, FormationParticipation, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole('BUYER');

    const participations = await FormationParticipation.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();

    if (participations.length === 0) {
      return NextResponse.json({ formations: [] });
    }

    const formationIds = Array.from(
      new Set(participations.map((participation) => String(participation.formationId)).filter(Boolean))
    );

    const formations = await Formation.find({
      _id: { $in: formationIds },
      isActive: true,
    })
      .select('title description imageUrl formationDate organizer allowParticipation isActive location')
      .lean();

    const formationsById = new Map(formations.map((formation) => [String(formation._id), formation]));

    const payload = participations
      .map((participation) => {
        const formation = formationsById.get(String(participation.formationId));
        if (!formation) return null;

        return {
          participationId: String(participation._id),
          participatedAt: participation.createdAt,
          status: participation.status,
          formation: {
            id: String(formation._id),
            title: formation.title,
            description: formation.description,
            imageUrl: formation.imageUrl,
            formationDate: formation.formationDate,
            organizer: formation.organizer,
            location: formation.location,
            allowParticipation: formation.allowParticipation,
            isActive: formation.isActive,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ formations: payload });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
