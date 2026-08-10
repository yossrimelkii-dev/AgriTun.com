export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole('BUYER');

    const participations = await EventParticipation.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();

    if (participations.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const eventIds = Array.from(
      new Set(participations.map((participation) => String(participation.eventId)).filter(Boolean))
    );

    const events = await Event.find({
      _id: { $in: eventIds },
      isActive: true,
    })
      .select('title description imageUrl eventDate organizer allowParticipation isActive')
      .lean();

    const eventsById = new Map(events.map((event) => [String(event._id), event]));

    const payload = participations
      .map((participation) => {
        const event = eventsById.get(String(participation.eventId));
        if (!event) return null;

        return {
          participationId: String(participation._id),
          participatedAt: participation.createdAt,
          event: {
            id: String(event._id),
            title: event.title,
            description: event.description,
            imageUrl: event.imageUrl,
            eventDate: event.eventDate,
            organizer: event.organizer,
            allowParticipation: event.allowParticipation,
            isActive: event.isActive,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ events: payload });
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
