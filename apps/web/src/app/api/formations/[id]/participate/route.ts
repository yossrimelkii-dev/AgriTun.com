export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@agrimed/db';
import { Formation, FormationParticipation } from '@agrimed/db/models';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const formation = await Formation.findOne({ _id: params.id, isActive: true }).lean();
    if (!formation) {
      return NextResponse.json({ error: 'Formation introuvable' }, { status: 404 });
    }

    if (!formation.allowParticipation) {
      return NextResponse.json({ error: 'Participation fermée' }, { status: 400 });
    }

    const body = await req.json();
    const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];

    const answersByQuestionId = new Map<string, string>(
      rawAnswers
        .map((item: any) => [String(item?.questionId ?? ''), String(item?.value ?? '').trim()])
        .filter(([questionId]) => Boolean(questionId))
    );

    const normalizedAnswers = formation.participationFormEnabled
      ? formation.participationFormQuestions.map((question) => ({
          questionId: question.id,
          label: question.label,
          value: String(answersByQuestionId.get(question.id) ?? '').trim(),
          required: question.required,
        }))
      : [];

    const missingRequired = normalizedAnswers.find((answer) => answer.required && !answer.value);
    if (missingRequired) {
      return NextResponse.json(
        { error: `La question "${missingRequired.label}" est obligatoire` },
        { status: 400 }
      );
    }

    try {
      await FormationParticipation.create({
        formationId: formation._id,
        userId: new mongoose.Types.ObjectId(session.userId),
        answers: normalizedAnswers.map(({ required, ...answer }) => answer),
        status: 'PENDING',
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return NextResponse.json({ error: 'Vous participez déjà à cette formation' }, { status: 409 });
      }
      throw error;
    }

    await Formation.updateOne({ _id: formation._id }, { $inc: { 'stats.participants': 1 } });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Formation participation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
