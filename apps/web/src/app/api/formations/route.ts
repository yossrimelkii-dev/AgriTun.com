export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Formation, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

function sanitizeQuestionType(type: string) {
  return ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'].includes(type) ? type : 'TEXT';
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const limitParam = Number(req.nextUrl.searchParams.get('limit') || 24);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 24, 1), 60);

    const formations = await Formation.find({ isActive: true })
      .sort({ formationDate: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    if (formations.length === 0) {
      return NextResponse.json({ formations: [] });
    }

    const specialistIds = Array.from(new Set(formations.map((formation) => String(formation.specialistId)).filter(Boolean)));
    const specialists = await User.find({ _id: { $in: specialistIds }, role: { $in: ['AGRI_ENGINEER', 'TRAINING_CENTER'] } })
      .select('profile email role badge')
      .lean();

    const specialistsById = new Map(specialists.map((specialist) => [String(specialist._id), specialist]));

    const payload = formations.map((formation) => {
      const specialist = specialistsById.get(String(formation.specialistId));

      return {
        _id: String(formation._id),
        title: formation.title,
        description: formation.description,
        imageUrl: formation.imageUrl,
        formationDate: formation.formationDate,
        location: formation.location,
        organizer: formation.organizer,
        allowParticipation: formation.allowParticipation,
        participationFormEnabled: formation.participationFormEnabled,
        stats: formation.stats || { participants: 0 },
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
      };
    });

    return NextResponse.json({ formations: payload });
  } catch (error) {
    console.error('Formations list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'ADMIN');

    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const imageUrl = String(body?.imageUrl ?? '').trim();
    const organizerInput = String(body?.organizer ?? '').trim();
    const location = String(body?.location ?? '').trim();
    const allowParticipation = Boolean(body?.allowParticipation ?? true);
    const participationFormEnabled = Boolean(body?.participationFormEnabled ?? false);

    const formationDate = new Date(body?.formationDate);
    if (!title || isNaN(formationDate.getTime())) {
      return NextResponse.json({ error: 'Titre et date sont requis' }, { status: 400 });
    }

    const specialist = await User.findById(session.userId).select('profile.firstName profile.lastName profile.speciality').lean();
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

    const formation = await Formation.create({
      specialistId: session.userId,
      title: title.slice(0, 200),
      description: description ? description.slice(0, 3000) : undefined,
      imageUrl: imageUrl || undefined,
      formationDate,
      location: location ? location.slice(0, 200) : undefined,
      organizer: organizer.slice(0, 200),
      allowParticipation,
      participationFormEnabled,
      participationFormQuestions: participationFormEnabled ? questions : [],
      isActive: true,
    });

    return NextResponse.json({ formation }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
