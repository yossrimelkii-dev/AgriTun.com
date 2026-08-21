export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

const ALLOWED_ROLES = ['AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN'] as const;

function sanitizeQuestionType(type: string) {
  return ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'].includes(type) ? type : 'TEXT';
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole(...ALLOWED_ROLES);

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const filter: Record<string, unknown> = { _id: params.id };
    // Event.supplierId is reused as the owner ObjectId (see /api/engineer/events POST).
    if (session.role !== 'ADMIN') filter.supplierId = session.userId;

    const event = await Event.findOne(filter).lean();
    if (!event) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole(...ALLOWED_ROLES);

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const filter: Record<string, unknown> = { _id: params.id };
    if (session.role !== 'ADMIN') filter.supplierId = session.userId;

    const existing = await Event.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body?.title === 'string') {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
      updates.title = title.slice(0, 200);
    }
    if (typeof body?.description === 'string') {
      updates.description = body.description.trim().slice(0, 3000);
    }
    if (typeof body?.imageUrl === 'string') {
      updates.imageUrl = body.imageUrl.trim().slice(0, 3000);
    }
    if (typeof body?.organizer === 'string' && body.organizer.trim()) {
      updates.organizer = body.organizer.trim().slice(0, 200);
    }
    if (body?.eventDate) {
      const d = new Date(body.eventDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
      updates.eventDate = d;
    }
    if (typeof body?.allowParticipation === 'boolean') {
      updates.allowParticipation = body.allowParticipation;
    }
    if (typeof body?.participationFormEnabled === 'boolean') {
      updates.participationFormEnabled = body.participationFormEnabled;
    }
    if (typeof body?.isActive === 'boolean') {
      updates.isActive = body.isActive;
    }
    if (Array.isArray(body?.participationFormQuestions)) {
      updates.participationFormQuestions = body.participationFormQuestions
        .map((q: any, i: number) => {
          const label = String(q?.label ?? '').trim();
          if (!label) return null;
          const options = Array.isArray(q?.options)
            ? q.options.map((o: unknown) => String(o ?? '').trim()).filter(Boolean)
            : [];
          return {
            id: String(q?.id ?? `q_${Date.now()}_${i}`),
            label,
            type: sanitizeQuestionType(String(q?.type ?? 'TEXT')),
            required: Boolean(q?.required ?? false),
            options,
          };
        })
        .filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 });
    }

    const event = await Event.findByIdAndUpdate(existing._id, { $set: updates }, { new: true }).lean();
    return NextResponse.json({ event });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireRole(...ALLOWED_ROLES);

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const filter: Record<string, unknown> = { _id: params.id };
    if (session.role !== 'ADMIN') filter.supplierId = session.userId;

    const existing = await Event.findOne(filter).select('_id');
    if (!existing) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    await EventParticipation.deleteMany({ eventId: existing._id });
    await Event.deleteOne({ _id: existing._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    console.error('Event delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
