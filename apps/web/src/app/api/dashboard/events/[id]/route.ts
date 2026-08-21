export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Event, EventParticipation } from '@agrimed/db/models';
import { requireSupplier } from '@/lib/auth/session';

function sanitizeQuestionType(type: string) {
  return ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'].includes(type) ? type : 'TEXT';
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireSupplier();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const event = await Event.findOne({ _id: params.id, supplierId: session.supplierId }).lean();
    if (!event) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireSupplier();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await Event.findOne({ _id: params.id, supplierId: session.supplierId });
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
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    console.error('Supplier event update error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    const session = await requireSupplier();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await Event.findOne({ _id: params.id, supplierId: session.supplierId }).select('_id');
    if (!existing) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    await EventParticipation.deleteMany({ eventId: existing._id });
    await Event.deleteOne({ _id: existing._id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (e.message === 'SUPPLIER_PROFILE_REQUIRED') return NextResponse.json({ error: 'Profil fournisseur requis' }, { status: 403 });
    console.error('Supplier event delete error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
