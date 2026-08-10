export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { EventParticipation } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; participationId: string } }) {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'ADMIN');

    if (!mongoose.isValidObjectId(params.id) || !mongoose.isValidObjectId(params.participationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const status = String(body?.status ?? '').toUpperCase();
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const participation = await EventParticipation.findOne({
      _id: params.participationId,
      eventId: params.id,
    });

    if (!participation) {
      return NextResponse.json({ error: 'Participation introuvable' }, { status: 404 });
    }

    participation.status = status as any;
    participation.reviewedAt = new Date();
    participation.reviewedBy = new mongoose.Types.ObjectId(session.userId);
    await participation.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
