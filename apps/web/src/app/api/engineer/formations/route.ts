export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { Formation, FormationParticipation, User } from '@agrimed/db/models';
import { requireRole } from '@/lib/auth/session';

export async function GET() {
  try {
    await connectDB();
    const session = await requireRole('AGRI_ENGINEER', 'TRAINING_CENTER', 'ADMIN');

    const formations = await Formation.find({ specialistId: session.userId })
      .sort({ createdAt: -1 })
      .lean();

    const formationIds = formations.map((formation) => formation._id);
    const participations = formationIds.length
      ? await FormationParticipation.find({ formationId: { $in: formationIds } })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const userIds = Array.from(new Set(participations.map((p) => String(p.userId)).filter(Boolean)));
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('email profile.firstName profile.lastName').lean()
      : [];
    const usersById = new Map(users.map((user) => [String(user._id), user]));

    return NextResponse.json({
      formations: formations.map((formation) => ({
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
        createdAt: formation.createdAt,
      })),
      participations: participations.map((participation) => {
        const user = usersById.get(String(participation.userId));
        return {
          id: String(participation._id),
          formationId: String(participation.formationId),
          userId: String(participation.userId),
          status: participation.status,
          answers: participation.answers,
          createdAt: participation.createdAt,
          user: user
            ? {
                email: user.email,
                firstName: user.profile?.firstName || '',
                lastName: user.profile?.lastName || '',
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
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
    const location = String(body?.location ?? '').trim();
    const allowParticipation = Boolean(body?.allowParticipation ?? true);
    const participationFormEnabled = Boolean(body?.participationFormEnabled ?? false);

    const formationDate = new Date(body?.formationDate);
    if (!title || isNaN(formationDate.getTime())) {
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
          type: ['TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX'].includes(String(q?.type ?? 'TEXT')) ? String(q?.type ?? 'TEXT') : 'TEXT',
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
    console.error('Formation creation error:', error);
    const errorMsg = error?.message || 'Erreur serveur';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
