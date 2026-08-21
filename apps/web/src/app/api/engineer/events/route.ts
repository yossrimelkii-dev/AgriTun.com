export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Event, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

function sanitizeQuestionType(type: string) {
  return ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'].includes(type) ? type : 'TEXT';
}

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN');

    const events = await Event.find({ supplierId: session.userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ events });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN');
    const body = await req.json();

    const title = String(body?.title ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const imageUrl = String(body?.imageUrl ?? '').trim();
    const organizerInput = String(body?.organizer ?? '').trim();
    const allowParticipation = Boolean(body?.allowParticipation ?? true);
    const participationFormEnabled = Boolean(body?.participationFormEnabled ?? false);

    const eventDate = new Date(body?.eventDate);
    if (!title || isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: 'Titre et date sont requis' }, { status: 400 });
    }

    const specialist = await User.findById(session.userId).select('profile.firstName profile.lastName').lean();
    const organizer = organizerInput || [specialist?.profile?.firstName, specialist?.profile?.lastName].filter(Boolean).join(' ') || 'Specialist';

    const rawQuestions = Array.isArray(body?.participationFormQuestions) ? body.participationFormQuestions : [];
    const questions = rawQuestions
      .map((q: any, i: number) => {
        const label = String(q?.label ?? '').trim();
        if (!label) return null;
        const options = Array.isArray(q?.options)
          ? q.options.map((opt: unknown) => String(opt ?? '').trim()).filter(Boolean)
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

    const event = await Event.create({
      supplierId: session.userId,
      title: title.slice(0, 200),
      description: description ? description.slice(0, 3000) : undefined,
      imageUrl: imageUrl || undefined,
      eventDate,
      organizer: organizer.slice(0, 200),
      allowParticipation,
      participationFormEnabled,
      participationFormQuestions: participationFormEnabled ? questions : [],
      isActive: true,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (e.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
